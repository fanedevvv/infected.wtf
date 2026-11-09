import type { Settings } from '@shared/common/types.ts';
import { Core } from '@shared/client/core.ts';
import { onResourceStop } from '@shared/client/events.ts';
import { notify } from '@shared/client/game.ts';
import { onNui, sendNui, setNuiFocus } from '@shared/client/nui.ts';
import { callServer } from '@shared/client/rpc.ts';
import type { SettingsNuiMessage, UpdateResponse } from '../common/nui.ts';

let open = false;

RegisterCommand(
    'settings',
    () => {
        const account = Core.getAccount();
        if (!account) return notify('SYSTEM', 'Sign in to change your settings.');
        open = true;
        setNuiFocus(true);
        sendNui<SettingsNuiMessage>({ type: 'open', settings: account.settings });
    },
    false,
);

/** Saves a partial settings change. ket_core validates it and broadcasts the new account. */
onNui<{ patch?: Partial<Settings> }, UpdateResponse>('update', async ({ patch }) => {
    try {
        const result = await callServer('ket_core:updateSettings', [patch ?? {}]);
        return result.ok ? { ok: true, settings: result.data } : { ok: false, error: result.error };
    } catch {
        return { ok: false, error: 'Could not save your setting. Please try again.' };
    }
});

onNui('close', () => {
    open = false;
    setNuiFocus(false);
});

onResourceStop(() => open && setNuiFocus(false));
