import { StateKey } from '@shared/common/constants.ts';
import { renderTemplate } from '@shared/common/format.ts';
import { watchAccount } from '@shared/client/core.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { drawText3d, Tick, vecDistance } from '@shared/client/game.ts';

/** Set with `setr ket_nametag_template "..."` in server.cfg. Placeholders: {{id}} {{name}} {{server}}. */
const TEMPLATE = GetConvar('ket_nametag_template', '[{{id}}] {{name}}');
const DRAW_DISTANCE = 250;
const UPDATE_INTERVAL_MS = 150;
const HEAD_BONE = 31086;
/** Own nametag: text scale, and how far above the head bone it floats (meters, world-up). */
const OWN_TAG_SCALE = 0.35;
const OWN_TAG_HEIGHT = 0.45;

const enum Component {
    Name = 0,
    HealthArmour = 2,
    AudioIcon = 4,
}

interface Tag {
    handle: number;
    ped: number;
    text: string;
}

const tags = new Map<number, Tag>();

function labelFor(player: number): string {
    const serverId = GetPlayerServerId(player);
    const state = Player(serverId).state;
    const name = state[StateKey.username];
    const id = state[StateKey.accountId];
    return renderTemplate(TEMPLATE, {
        name: typeof name === 'string' ? name : 'Guest',
        id: id != null ? String(id) : '?',
        server: String(serverId),
    });
}

function removeTag(player: number): void {
    const tag = tags.get(player);
    if (tag) RemoveMpGamerTag(tag.handle);
    tags.delete(player);
}

/** Creates/refreshes gamer tags for nearby players. Runs a few times per second, not per frame. */
function updateTags(): void {
    const self = PlayerId();
    const selfPed = PlayerPedId();
    const origin = GetEntityCoords(selfPed, false);
    const active = new Set<number>(GetActivePlayers() as number[]);

    for (const player of tags.keys()) if (!active.has(player)) removeTag(player);

    for (const player of active) {
        if (player === self) continue;
        const ped = GetPlayerPed(player);
        const text = labelFor(player);
        let tag = tags.get(player);

        // Model changes recreate the ped, and the game may garbage-collect tags.
        if (!tag || tag.ped !== ped || !IsMpGamerTagActive(tag.handle)) {
            if (tag) RemoveMpGamerTag(tag.handle);
            tag = { handle: CreateMpGamerTag(ped, text, false, false, '', 0), ped, text };
            tags.set(player, tag);
        } else if (tag.text !== text) {
            SetMpGamerTagName(tag.handle, text);
            tag.text = text;
        }

        const visible = vecDistance(origin, GetEntityCoords(ped, false)) < DRAW_DISTANCE && HasEntityClearLosToEntity(selfPed, ped, 17);
        SetMpGamerTagVisibility(tag.handle, Component.Name, visible);
        SetMpGamerTagVisibility(tag.handle, Component.HealthArmour, visible && IsPlayerTargettingEntity(self, ped));
        SetMpGamerTagVisibility(tag.handle, Component.AudioIcon, visible && NetworkIsPlayerTalking(player));
        if (visible) {
            SetMpGamerTagAlpha(tag.handle, Component.AudioIcon, 255);
            SetMpGamerTagAlpha(tag.handle, Component.HealthArmour, 255);
        }
    }
}

setInterval(updateTags, UPDATE_INTERVAL_MS);

// Own nametag: 3D text drawn every frame, but only while the setting is on.
let ownLabel = '';
const ownTag = new Tick(() => {
    const [x = 0, y = 0, z = 0] = GetPedBoneCoords(PlayerPedId(), HEAD_BONE, 0, 0, 0);
    drawText3d(x, y, z + OWN_TAG_HEIGHT, ownLabel, OWN_TAG_SCALE, 235);
});

watchAccount(({ id, username, settings }) => {
    ownLabel = renderTemplate(TEMPLATE, { name: username, id, server: String(GetPlayerServerId(PlayerId())) });
    ownTag.toggle(settings.showOwnNameTag);
});

onResourceStop(() => {
    ownTag.stop();
    for (const player of [...tags.keys()]) removeTag(player);
});
