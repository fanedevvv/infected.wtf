import { emitServer, onResourceStop, onServer } from '@shared/client/events.ts';
import { onNui, sendNui, setNuiFocus } from '@shared/client/nui.ts';
import type { AdminNuiMessage, ExecuteRequest } from '../common/nui.ts';
import { Core } from '@shared/client/core.ts';
import { resetActions, runAction } from './actions.ts';
import { buildCatalog } from './catalog.ts';

let menuOpen = false;

function closeMenu(): void {
    if (!menuOpen) return;
    menuOpen = false;
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
