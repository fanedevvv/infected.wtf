import type { AdminAction } from '@shared/common/contracts.ts';
import type { Account, AdminArgument, AdminCommandInfo } from '@shared/common/types.ts';
import { emitClient } from '@shared/server/events.ts';
import type { CommandContext } from './context.ts';

export const MAX_HELPER_LEVEL = 5;

/** `level` for helper-only commands: no admin level grants access (admins are not helpers). */
export const HELPERS_ONLY = 99;

export interface AdminCommand extends AdminCommandInfo {
    /** Minimum admin level. 0 = any signed-in player, HELPERS_ONLY = admins excluded. */
    level: number;
    /** If set, helpers of at least this level may also use the command. */
    helper?: number;
    /** Exact argument count (default: arguments.length). `'min'` allows trailing free text. */
    arity?: 'exact' | 'min';
    run: (context: CommandContext) => void | Promise<void>;
}

/** Helper rank. Admin rank does NOT imply helper rank: the roles are separate. */
export const helperLevel = (account: Pick<Account, 'helper'>): number => account.helper;

export const isStaff = (account: Pick<Account, 'admin' | 'helper'>): boolean => account.admin >= 1 || account.helper >= 1;

export const canUse = (account: Pick<Account, 'admin' | 'helper'>, command: AdminCommand): boolean =>
    account.admin >= command.level || (command.helper !== undefined && helperLevel(account) >= command.helper);

export const action = (target: number, payload: AdminAction) => emitClient('ket_admin:action', target, payload);

export const ID: AdminArgument = { name: 'id', label: 'Database ID' };
export const arg = (name: string, label: string, optional = false): AdminArgument => ({ name, label, ...(optional && { optional }) });

/** The menu/suggestion view of a command (no handler). */
export const describe = ({ name, label, description, level, category, arguments: args }: AdminCommand): AdminCommandInfo => ({
    name,
    label,
    description,
    level,
    category,
    arguments: args,
});

/** "Usage: /ban [Database ID] [Days] [Reason]" */
export const usage = (command: AdminCommand) =>
    `Usage: /${command.name}${command.arguments.map((argument) => ` [${argument.label}${argument.optional ? ' (optional)' : ''}]`).join('')}`;
