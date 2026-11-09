import { emitServer, onResourceStop, onServer } from '@shared/client/events.ts';
import { onNui, sendNui, setNuiFocus } from '@shared/client/nui.ts';
import type { SupportKind } from '@shared/common/types.ts';
import { notify } from '@shared/client/game.ts';
import { callServer } from '@shared/client/rpc.ts';
import type { AdminNuiMessage, ExecuteRequest, SupportRequest, SupportResponse } from '../common/nui.ts';
import { Core } from '@shared/client/core.ts';
import { resetActions, runAction } from './actions.ts';
import { buildCatalog } from './catalog.ts';

let menuOpen = false;
/** Which support menu is open (/questions or /tickets), for live refreshes. */
let supportKind: SupportKind | undefined;

function closeMenu(): void {
    if (!menuOpen) return;
    menuOpen = false;
    supportKind = undefined;
    setNuiFocus(false);
    sendNui<AdminNuiMessage>({ type: 'close' });
}

onServer('ket_admin:open', (commands, level) => {
    menuOpen = true;
    setNuiFocus(true);
    sendNui<AdminNuiMessage>({ type: 'open', commands, level });
});

onServer('ket_admin:carlist', (custom) => {
    menuOpen = true;
    setNuiFocus(true);
    sendNui<AdminNuiMessage>({ type: 'carlist', ...buildCatalog(custom), level: Core.getAccount()?.admin ?? 0 });
});

onServer('ket_admin:action', (action) => void runAction(action));

// ── /questions and /tickets menus ───────────────────────────────────────────
async function openSupport(kind: SupportKind): Promise<void> {
    const result = await callServer('ket_admin:support', [{ op: 'open', kind }]).catch(() => undefined);
    if (!result) return notify('SUPPORT', 'Could not reach the server. Please try again.');
    if (!result.ok) return notify('SUPPORT', result.error);
    menuOpen = true;
    supportKind = kind;
    setNuiFocus(true);
    sendNui<AdminNuiMessage>({ type: 'support', data: result.data });
}

RegisterCommand('questions', () => void openSupport('question'), false);
RegisterCommand('tickets', () => void openSupport('ticket'), false);

/** Menu buttons: the server validates every action and answers with the updated view. */
onNui<SupportRequest, SupportResponse>('support', async (action) => {
    if (!menuOpen) return { ok: false, error: 'The menu is closed.' };
    return callServer('ket_admin:support', [action]);
});

onServer('ket_admin:supportChanged', async (kind) => {
    if (!menuOpen || supportKind !== kind) return;
    const result = await callServer('ket_admin:support', [{ op: 'open', kind }]).catch(() => undefined);
    if (result?.ok && supportKind === kind) sendNui<AdminNuiMessage>({ type: 'support', data: result.data });
});

onNui('close', closeMenu);

onNui<Partial<ExecuteRequest>>('execute', ({ command, args }) => {
    if (!menuOpen || typeof command !== 'string' || !Array.isArray(args)) return { ok: false };
    emitServer('ket_admin:execute', command, args); // re-validated server-side
    return { ok: true };
});

onResourceStop(() => {
    if (menuOpen) setNuiFocus(false);
    resetActions();
});
