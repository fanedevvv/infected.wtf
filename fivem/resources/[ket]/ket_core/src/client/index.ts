import { sleep, waitFor } from '@shared/common/async.ts';
import { SPAWN_POINT, StateKey } from '@shared/common/constants.ts';
import { log } from '@shared/common/log.ts';
import { fadeOut, toVec3 } from '@shared/client/game.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { onNui, sendNui, setNuiFocus } from '@shared/client/nui.ts';
import { callServer } from '@shared/client/rpc.ts';
import type { AuthRequest } from '@shared/common/types.ts';
import type { CoreNuiMessage, SubmitResponse } from '../common/nui.ts';
import { aimCameraAt, dismissLoadingScreens, hideLoginScene, showLoginScene } from './scene.ts';
import { loadSkin, parkPlayer, spawnPlayer } from './spawn.ts';
import { getAccount, markSpawned } from './state.ts';
import { registerExport } from '@shared/common/fx.ts';

let menuOpen = false;
const nui = (message: CoreNuiMessage) => sendNui(message);

async function openLogin(): Promise<void> {
    if (menuOpen) return;
    menuOpen = true;
    await showLoginScene(() => parkPlayer());
    setNuiFocus(true);
    nui({ type: 'open', online: Number(GlobalState[StateKey.online] ?? 0) });
}

function closeLogin(): void {
    menuOpen = false;
    setNuiFocus(false);
    nui({ type: 'close' });
}

async function enterWorld(skin: string): Promise<boolean> {
    const model = await loadSkin(skin);
    if (model === undefined) return false;

    closeLogin();
    aimCameraAt(toVec3(SPAWN_POINT));
    await spawnPlayer(model);
    hideLoginScene();
    dismissLoadingScreens(5_000);
    markSpawned();
    DoScreenFadeIn(2_500);
    return true;
}

onNui<unknown, SubmitResponse>('submit', async (request) => {
    if (!menuOpen) return { ok: false, message: 'The sign-in form is closed.' };

    const result = await callServer('ket_core:auth', [request as AuthRequest], 20_000).catch((error: Error) => {
        log.error('Auth request failed:', error);
        return { ok: false as const, error: 'Could not reach the server. Please try again.' };
    });
    // If the reply was lost (timeout) but the server did sign us in, it has already pushed the account.
    const account = result.ok ? result.data : getAccount();
    if (!account) return { ok: false, message: result.ok ? 'Something went wrong.' : result.error };

    // Respond to the form first; the spawn sequence takes a few seconds.
    setImmediate(async () => {
        if (!(await enterWorld(account.skin))) {
            log.error('No player model could be loaded.');
            nui({ type: 'error', message: 'Could not load a player model. Please contact an administrator.' });
        }
    });
    return { ok: true, message: `Welcome, ${account.username}!` };
});

/** Respawns the signed-in player at the spawn point (used by admin /respawn). */
registerExport('respawn', () => {
    const account = getAccount();
    if (!account) return;
    void (async () => {
        await fadeOut(250);
        await spawnPlayer(undefined);
        DoScreenFadeIn(500);
    })();
});

onResourceStop(() => {
    if (menuOpen) setNuiFocus(false);
    hideLoginScene();
});

void (async () => {
    await waitFor(() => NetworkIsPlayerActive(PlayerId()), 120_000, 100);
    dismissLoadingScreens();
    await sleep(1_000);
    await openLogin();
})();
