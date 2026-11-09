import type { Account } from '@shared/common/types.ts';
import { log } from '@shared/common/log.ts';
import { Core, type OnlineAccount } from '@shared/server/core.ts';
import { emitClient, onPlayerDropped } from '@shared/server/events.ts';
import { arg, helperLevel, isStaff, type AdminCommand } from '../command.ts';
import { rest } from '../context.ts';

type Rgb = [number, number, number];

/** SA-MP style channel colours. */
export const COLORS = {
    admin: [255, 170, 60],
    helper: [120, 220, 140],
    staff: [110, 170, 255],
    ticket: [255, 215, 110],
    report: [255, 120, 110],
} satisfies Record<string, Rgb>;

export function sendColored(target: number, author: string, text: string, color: Rgb): void {
    emitClient('chat:addMessage', target, { args: [author, text], color, multiline: true });
}

/** Sends to every online account matching `filter`. */
export function broadcast(filter: (account: OnlineAccount) => boolean, author: string, text: string, color: Rgb): void {
    for (const account of Core.online()) if (filter(account)) sendColored(account.source, author, text, color);
}

export const isAdminOnline = (account: OnlineAccount) => account.admin >= 1;
export const hasHelper = (minimum: number) => (account: OnlineAccount) => helperLevel(account) >= minimum;

/** "Admin 3" / "Helper 2" */
export const rankOf = (account: Pick<Account, 'admin' | 'helper'>) =>
    account.admin >= 1 ? `Admin ${account.admin}` : account.helper >= 1 ? `Helper ${account.helper}` : 'Player';

/** Staff who muted helper chat with /helperchat. */
const helperChatMuted = new Set<number>();
onPlayerDropped((source) => helperChatMuted.delete(source));

const MESSAGE = arg('message', 'Message');

export const CHAT_COMMANDS: AdminCommand[] = [
    {
        name: 'a', label: 'Admin chat', description: 'Write in the admin chat.', level: 1, category: 'Staff chat',
        arguments: [MESSAGE], arity: 'min',
        run: (ctx) => {
            const text = rest(ctx, 0);
            broadcast(isAdminOnline, `[A] ${ctx.actor.username} (${ctx.actor.admin > 7 ? 'Console' : ctx.actor.admin})`, text, COLORS.admin);
            log.info(`[A] ${ctx.actor.username}: ${text}`);
        },
    },
    {
        name: 'h', label: 'Helper chat', description: 'Write in the helper chat (helpers and admins).', level: 1, helper: 1, category: 'Staff chat',
        arguments: [MESSAGE], arity: 'min',
        run: (ctx) => {
            const text = rest(ctx, 0);
            broadcast((account) => isStaff(account) && !helperChatMuted.has(account.source), `[H] ${rankOf(ctx.actor)} ${ctx.actor.username}`, text, COLORS.helper);
        },
    },
    {
        name: 'hc', label: 'Staff chat', description: 'Write in the staff chat (helpers and admins).', level: 1, helper: 1, category: 'Staff chat',
        arguments: [MESSAGE], arity: 'min',
        run: (ctx) => broadcast(isStaff, `[STAFF] ${rankOf(ctx.actor)} ${ctx.actor.username}`, rest(ctx, 0), COLORS.staff),
    },
    {
        name: 'helperchat', label: 'Toggle helper chat', description: 'Show or hide the helper chat (/h).', level: 1, helper: 1, category: 'Staff chat',
        arguments: [],
        run: ({ source, reply }) => {
            const muted = !helperChatMuted.delete(source);
            if (muted) helperChatMuted.add(source);
            reply(muted ? 'Helper chat hidden. Type /helperchat to show it again.' : 'Helper chat enabled.');
        },
    },
];
