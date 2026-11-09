/** Signed-in players: source ↔ account, mirrored into replicated state bags. */
import { StateKey } from '@shared/common/constants.ts';
import type { Account } from '@shared/common/types.ts';
import type { AccountPatch, OnlineAccount } from '@shared/server/core.ts';
import { emitClient, emitLocal } from '@shared/server/events.ts';

interface Session {
    license: string;
    account: Account;
}

const bySource = new Map<number, Session>();
const byAccountId = new Map<string, number>();

const clone = (account: Account): Account => ({ ...account, settings: { ...account.settings } });

function publish(source: number, account: Account): void {
    emitClient('ket_core:account', source, account);
}

export const sessions = {
    get: (source: number): Account | undefined => bySource.get(source)?.account,
    has: (source: number) => bySource.has(source),
    isAccountOnline: (accountId: string) => byAccountId.has(accountId),

    open(source: number, license: string, account: Account): void {
        bySource.set(source, { license, account });
        byAccountId.set(account.id, source);
        const state = Player(source).state;
        state.set(StateKey.username, account.username, true);
        state.set(StateKey.accountId, account.id, true);
        publish(source, account);
        emitLocal('ket:playerLoaded', source, clone(account));
    },

    close(source: number): void {
        const session = bySource.get(source);
        if (!session) return;
        bySource.delete(source);
        byAccountId.delete(session.account.id);
        emitLocal('ket:playerUnloaded', source, session.account.id);
    },

    /** Applies a change to a live session and pushes the updated account to its owner. */
    update(source: number, change: (account: Account) => void): Account | undefined {
        const session = bySource.get(source);
        if (!session) return undefined;
        change(session.account);
        publish(source, session.account);
        emitLocal('ket:accountChanged', source, clone(session.account));
        return session.account;
    },

    patch(source: number, patch: AccountPatch): boolean {
        return (
            sessions.update(source, (account) => {
                if (patch.cash !== undefined) account.cash = String(patch.cash);
                if (patch.bank !== undefined) account.bank = String(patch.bank);
                if (patch.admin !== undefined) account.admin = patch.admin;
                if (patch.level !== undefined) account.level = patch.level;
            }) !== undefined
        );
    },

    findByAccountId: (accountId: string) => byAccountId.get(accountId),

    findByUsername(username: string): number | undefined {
        const wanted = username.toLowerCase();
        for (const [source, session] of bySource) if (session.account.username.toLowerCase() === wanted) return source;
        return undefined;
    },

    online(): OnlineAccount[] {
        return [...bySource].map(([source, { account }]) => ({ source, id: account.id, username: account.username, admin: account.admin }));
    },

    copy: (source: number) => {
        const account = bySource.get(source)?.account;
        return account && clone(account);
    },
};
