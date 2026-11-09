/** /fish: guide to the zone, cast animation, bite delay, minigame, then let the server decide the catch. */
import { sleep } from '@shared/common/async.ts';
import { notify as chat, pedCoords, vecDistance } from '@shared/client/game.ts';
import { sendNui, setNuiFocus } from '@shared/client/nui.ts';
import { callServer } from '@shared/client/rpc.ts';
import { FISHING } from '../common/config.ts';
import type { JobsNuiMessage } from '../common/nui.ts';

const notify = (message: string) => chat('FISHING', message);
const ZONE = [FISHING.zone.x, FISHING.zone.y, FISHING.zone.z];
const SCENARIO = 'WORLD_HUMAN_STAND_FISHING';

let fishing = false;
let checkpoint: number | undefined;
let guideTimer: ReturnType<typeof setInterval> | undefined;
let resolveMinigame: ((success: boolean) => void) | undefined;

function clearGuide(): void {
    if (checkpoint !== undefined) DeleteCheckpoint(checkpoint);
    if (guideTimer !== undefined) clearInterval(guideTimer);
    checkpoint = undefined;
    guideTimer = undefined;
}

/** Checkpoint + GPS to the fishing zone; removed when the player arrives. */
function guideToZone(): void {
    clearGuide();
    const { x, y, z } = FISHING.zone;
    checkpoint = CreateCheckpoint(45, x, y, z - 1, 0, 0, 0, 6, 47, 134, 255, 140, 0);
    SetCheckpointCylinderHeight(checkpoint, 2, 2, 6);
    SetNewWaypoint(x, y);
    notify('You are not in the fishing zone. Follow the checkpoint on your GPS.');
    guideTimer = setInterval(() => {
        if (vecDistance(pedCoords(), ZONE) > FISHING.zoneRadius - 3) return;
        clearGuide();
        SetWaypointOff();
        notify('You reached the fishing zone. Type /fish to cast.');
        PlaySoundFrontend(-1, 'CHECKPOINT_NORMAL', 'HUD_MINI_GAME_SOUNDSET', true);
    }, 500);
}

/** Called by the NUI when the player presses SPACE (or the time runs out / ESC). */
export function finishMinigame(success: boolean): void {
    resolveMinigame?.(success);
    resolveMinigame = undefined;
}

function playMinigame(zoneWidth: number, speed: number): Promise<boolean> {
    return new Promise((resolve) => {
        resolveMinigame = resolve;
        SetNuiFocus(true, false); // keyboard only: SPACE goes to the minigame, no mouse cursor
        sendNui<JobsNuiMessage>({ type: 'minigame', zoneWidth, speed });
    });
}

export async function fish(): Promise<void> {
    if (fishing) return notify('You are already fishing.');
    const ped = PlayerPedId();
    if (IsPedInAnyVehicle(ped, false)) return notify('Get out of your vehicle to fish.');

    const start = await callServer('ket_jobs:startFishing', []).catch(() => undefined);
    if (!start) return notify('Could not reach the server. Please try again.');
    if (start.status === 'zone') return guideToZone();
    if (start.status === 'error') return notify(start.message);

    fishing = true;
    clearGuide();
    try {
        TaskStartScenarioInPlace(ped, SCENARIO, 0, true);
        notify('You cast your line… wait for a bite.');
        await sleep(2_200 + Math.random() * 3_000);
        PlaySoundFrontend(-1, 'Beep_Red', 'DLC_HEIST_HACKING_SNAKE_SOUNDS', true);
        notify('A fish is biting! Press SPACE when the marker is in the zone.');

        const success = await playMinigame(start.zoneWidth, start.speed);
        setNuiFocus(false);

        const result = await callServer('ket_jobs:finishFishing', [start.session, success]).catch(() => undefined);
        if (!result) notify('Could not reach the server. Please try again.');
        else if (!result.ok) notify(result.error);
        else if (result.data) {
            notify(`You caught a ${result.data.label}! ($${result.data.price}) — sell with /sellfish.`);
            PlaySoundFrontend(-1, 'PICK_UP', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true);
        } else notify('The fish got away. Try again with /fish.');
    } finally {
        ClearPedTasks(PlayerPedId());
        fishing = false;
    }
}

export function stopFishing(): void {
    clearGuide();
    if (resolveMinigame) finishMinigame(false);
    sendNui<JobsNuiMessage>({ type: 'close' });
}
