/** Typed access to ket_core's server exports (accounts & sessions). */
import type { Account } from '../common/types.ts';

export interface OnlineAccount {
    source: number;
    id: string;
    username: string;
    admin: number;
}

export type AccountPatch = Partial<Pick<Account, 'cash' | 'bank' | 'admin' | 'level'>>;

const core = () => exports.ket_core!;

export const Core = {
    getAccount: (source: number): Account | undefined => core().getAccount!(source) ?? undefined,
    getUsername: (source: number): string | undefined => core().getUsername!(source) ?? undefined,
    getAdminLevel: (source: number): number => core().getAdminLevel!(source) ?? 0,
    isAdmin: (source: number, minimum = 1): boolean => core().isAdmin!(source, minimum) === true,
    /** Server id of the player signed in to `accountId`, if online. */
    findByAccountId: (accountId: string | number): number | undefined => core().findByAccountId!(String(accountId)) ?? undefined,
    /** Server id of the signed-in player with this username (case-insensitive), if online. */
    findByUsername: (username: string): number | undefined => core().findByUsername!(username) ?? undefined,
    online: (): OnlineAccount[] => core().online!() ?? [],
    /** Updates the cached session and pushes the change to the owner's client. Does not write the DB. */
    patchAccount: (source: number, patch: AccountPatch): boolean => core().patchAccount!(source, patch) === true,
};
