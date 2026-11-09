import type { Account } from '@shared/common/types.ts';
import { parseIntStrict } from '@shared/common/validate.ts';
import { chatAs } from '@shared/server/chat.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';

export const notify = chatAs('ADMIN');

/** Thrown inside handlers to stop and show `message` to the admin. */
export class CommandError extends Error {}

export function fail(message: string): never {
    throw new CommandError(message);
}

export interface CommandContext {
    source: number;
    actor: Account;
    args: string[];
    reply: (message: string) => void;
}

/** Arguments joined from `from` (0-based), e.g. a free-text reason. */
export const rest = ({ args }: CommandContext, from: number) => args.slice(from).join(' ').trim();

export interface OnlineTarget {
    source: number;
    username: string;
    accountId: string;
}

/** Resolves a signed-in player by database id (digits) or username. */
export function findOnline(argument: string | undefined): OnlineTarget | undefined {
    if (!argument) return undefined;
    const source = /^\d+$/.test(argument) ? Core.findByAccountId(argument) : Core.findByUsername(argument);
    const account = source !== undefined ? Core.getAccount(source) : undefined;
    return source !== undefined && account ? { source, username: account.username, accountId: account.id } : undefined;
}

export const requireOnline = (argument: string | undefined): OnlineTarget =>
    findOnline(argument) ?? fail('Logged-in player with that database ID or username not found.');

export interface StoredAccount {
    id: string;
    username: string;
    admin: number;
}

/** Loads any account (online or not) by database id. */
export async function requireAccount(argument: string | undefined): Promise<StoredAccount> {
    const id = parseIntStrict(argument, 1);
    if (id === undefined) fail('Use a valid database ID.');
    const row = await db.single<{ id: number; username: string; admin: number }>(
        'SELECT id, username, admin FROM users WHERE id = ? LIMIT 1',
        [id],
    );
    if (!row) fail('Account not found.');
    return { id: String(row.id), username: row.username, admin: Number(row.admin) || 0 };
}

/** Messages the account's owner if they are online. Returns their server id. */
export function notifyAccount(accountId: string, message: string): number | undefined {
    const source = Core.findByAccountId(accountId);
    if (source !== undefined) notify(source, message);
    return source;
}
