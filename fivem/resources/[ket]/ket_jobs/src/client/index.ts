import { DEFAULT_ACCENT } from '@shared/common/constants.ts';
import { watchAccount } from '@shared/client/core.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { notify } from '@shared/client/game.ts';
import { onNui, sendNui, setNuiFocus } from '@shared/client/nui.ts';
import { callServer } from '@shared/client/rpc.ts';
import { JOBS } from '../common/config.ts';
import type { JobsNuiMessage, MinigameResult, PinRequest } from '../common/nui.ts';
import { finishMinigame, fish, stopFishing } from './fishing.ts';
import './npc.ts';

let ready = false;
let accent = DEFAULT_ACCENT;
const send = (message: JobsNuiMessage) => sendNui(message);

// Menus follow the player's accent colour from /settings.
watchAccount(({ settings }) => {
    accent = settings.hudColor;
    if (ready) send({ type: 'accent', color: accent });
});

onNui('ready', () => {
    ready = true;
    send({ type: 'accent', color: accent });
});

RegisterCommand(
    'jobs',
    async () => {
        const state = await callServer('ket_jobs:state', []).catch(() => undefined);
        if (!state?.ok) return notify('JOBS', state?.error ?? 'Could not reach the server. Please try again.');
        setNuiFocus(true);
        send({ type: 'menu', currentJob: state.data.job });
    },
    false,
);

RegisterCommand('fish', () => void fish(), false);

onNui<PinRequest>('pin', ({ job }) => {
    const info = JOBS.find((item) => item.id === job && item.available);
    if (!info?.location) return { ok: false };
    SetNewWaypoint(info.location.x, info.location.y);
    PlaySoundFrontend(-1, 'WAYPOINT_SET', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true);
    notify('JOBS', `${info.name}: location pinned on your GPS.`);
    return { ok: true };
});

onNui('quit', () => {
    setNuiFocus(false);
    ExecuteCommand('quitjob');
});

onNui('close', () => setNuiFocus(false));

onNui<MinigameResult>('minigame', ({ success }) => finishMinigame(success === true));

onResourceStop(() => {
    stopFishing();
    setNuiFocus(false);
});
