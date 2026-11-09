/** Typed access to ket_core's client exports, plus a helper to follow the local account. */
import type { Account } from '../common/types.ts';
import { onLocal } from './events.ts';

const core = () => exports.ket_core!;

export const Core = {
    getAccount: (): Account | undefined => core().getAccount!() ?? undefined,
    isSpawned: (): boolean => core().isSpawned!() === true,
};

/**
 * Calls `handler` with the current account now (if signed in) and on every change.
 * Safe to call at any start order: ket_core may not be running yet.
 */
export function watchAccount(handler: (account: Account) => void): void {
    onLocal('ket:account', handler);
    try {
        const account = Core.getAccount();
        if (account) handler(account);
    } catch {
        // ket_core not started yet; the event will deliver the account.
    }
}

/** Calls `handler` once the player has spawned (immediately if already spawned). */
export function whenSpawned(handler: () => void): void {
    onLocal('ket:spawned', handler);
    try {
        if (Core.isSpawned()) handler();
    } catch {
        // ket_core not started yet.
    }
}
