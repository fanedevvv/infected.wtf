import type { Account } from '@shared/common/types.ts';
import { emitLocal, onServer } from '@shared/client/events.ts';
import { registerExport } from '@shared/common/fx.ts';

let account: Account | undefined;
let spawned = false;

export const getAccount = () => account;
export const isSpawned = () => spawned;

export function markSpawned(): void {
    spawned = true;
    emitLocal('ket:spawned');
}

/** The server pushes the full account on sign-in and after every change. */
onServer('ket_core:account', (next) => {
    account = next;
    emitLocal('ket:account', next);
});

registerExport('getAccount', () => account);
registerExport('isSpawned', () => spawned);
