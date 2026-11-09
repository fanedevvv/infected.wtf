/**
 * Overhead nametags. Every tag (other players and your own) is drawn the same way,
 * so all of them have the same size, font and height above the head.
 */
import { StateKey } from '@shared/common/constants.ts';
import { renderTemplate } from '@shared/common/format.ts';
import { watchAccount } from '@shared/client/core.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { drawText3d, Tick, vecDistance } from '@shared/client/game.ts';

/** Set with `setr ket_nametag_template "..."` in server.cfg. Placeholders: {{id}} {{name}} {{server}}. */
const TEMPLATE = GetConvar('ket_nametag_template', '[{{id}}] {{name}}');
/** Tags are shown for players within this distance (meters) and in line of sight. */
const DRAW_DISTANCE = 30;
const UPDATE_INTERVAL_MS = 150;
const HEAD_BONE = 31086;
/** Same for every tag: text scale, and height above the head bone (meters, world-up). */
const TAG_SCALE = 0.35;
const TAG_HEIGHT = 0.45;
/** GTA text colour codes: white normally, blue while talking on voice chat. */
const TALKING_PREFIX = '~b~';

interface VisibleTag {
    ped: number;
    text: string;
}

function labelFor(serverId: number, fallbackName = 'Guest', fallbackId = '?'): string {
    const state = Player(serverId).state;
    const name = state[StateKey.username];
    const id = state[StateKey.accountId];
    return renderTemplate(TEMPLATE, {
        name: typeof name === 'string' ? name : fallbackName,
        id: id != null ? String(id) : fallbackId,
        server: String(serverId),
    });
}

function drawTag(ped: number, text: string): void {
    const [x = 0, y = 0, z = 0] = GetPedBoneCoords(ped, HEAD_BONE, 0, 0, 0);
    drawText3d(x, y, z + TAG_HEIGHT, text, TAG_SCALE, 235);
}

let visible: VisibleTag[] = [];
let ownLabel = '';
let showOwn = false;

/** Per-frame drawing only; the expensive checks happen a few times per second below. */
const draw = new Tick(() => {
    for (const tag of visible) drawTag(tag.ped, tag.text);
    if (showOwn) drawTag(PlayerPedId(), ownLabel);
});

const syncTick = () => draw.toggle(visible.length > 0 || showOwn);

/** Finds nearby players in line of sight. Runs every UPDATE_INTERVAL_MS, not every frame. */
function updateVisible(): void {
    const self = PlayerId();
    const selfPed = PlayerPedId();
    const origin = GetEntityCoords(selfPed, false);
    const next: VisibleTag[] = [];

    for (const player of GetActivePlayers() as number[]) {
        if (player === self) continue;
        const ped = GetPlayerPed(player);
        if (ped === 0 || vecDistance(origin, GetEntityCoords(ped, false)) > DRAW_DISTANCE) continue;
        if (!HasEntityClearLosToEntity(selfPed, ped, 17)) continue;
        const label = labelFor(GetPlayerServerId(player));
        next.push({ ped, text: NetworkIsPlayerTalking(player) ? TALKING_PREFIX + label : label });
    }

    visible = next;
    syncTick();
}

setInterval(updateVisible, UPDATE_INTERVAL_MS);

watchAccount(({ id, username, settings }) => {
    ownLabel = labelFor(GetPlayerServerId(PlayerId()), username, id);
    showOwn = settings.showOwnNameTag;
    syncTick();
});

onResourceStop(() => draw.stop());
