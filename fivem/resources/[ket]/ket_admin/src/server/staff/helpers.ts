import { log } from '@shared/common/log.ts';
import { parseIntStrict } from '@shared/common/validate.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { action, arg, helperLevel, ID, isStaff, MAX_HELPER_LEVEL, type AdminCommand } from '../command.ts';
import { fail, findOnline, notifyAccount, requireAccount, requireOnline, rest } from '../context.ts';
import { takeLastPosition } from '../positions.ts';
import { broadcast, COLORS, isAdminOnline, rankOf } from './chat.ts';
import { staffSchema } from './schema.ts';

const ID_OR_NAME = { name: 'id', label: 'Database ID or username' };
const formatDate = (value: Date | string) => new Date(value).toISOString().slice(0, 16).replace('T', ' ');

export const HELPER_COMMANDS: AdminCommand[] = [
    // ── Moving around ───────────────────────────────────────────────────────
    {
        name: 'spec', label: 'Spectate', description: 'Spectate a player (/specoff to stop).', level: 1, helper: 3, category: 'Player',
        arguments: [ID],
        run: ({ source, args, reply }) => {
            const target = requireOnline(args[0]);
            if (target.source === source) fail('You cannot spectate yourself.');
            action(source, { type: 'spectate', target: target.source });
            reply(`Spectating ${target.username}. Type /specoff to stop.`);
        },
    },
    {
        name: 'specoff', label: 'Stop spectating', description: 'Stop spectating.', level: 1, helper: 3, category: 'Player',
        arguments: [],
        run: ({ source }) => action(source, { type: 'spectateOff' }),
    },
    {
        name: 'return', label: 'Return', description: 'Go back to where you were before /goto.', level: 2, helper: 2, category: 'Teleport',
        arguments: [],
        run: ({ source, reply }) => {
            const position = takeLastPosition(source) ?? fail('No saved location. /return works after /goto.');
            action(source, { type: 'teleport', ...position });
            reply('Returned to your last location.');
        },
    },

    // ── Player info ─────────────────────────────────────────────────────────
    {
        name: 'check', label: 'Check player', description: 'Show a player\'s account information.', level: 1, helper: 2, category: 'Player',
        arguments: [ID_OR_NAME],
        run: async ({ args, reply }) => {
            const target = requireOnline(args[0]);
            const account = Core.getAccount(target.source) ?? fail('Could not load that account.');
            await staffSchema;
            const row = await db.single<{ job: string; job_grade: number; warnings: number; notes: number }>(
                `SELECT u.job, u.job_grade,
                    (SELECT COUNT(*) FROM user_warnings w WHERE w.user_id = u.id) AS warnings,
                    (SELECT COUNT(*) FROM user_notes n WHERE n.user_id = u.id) AS notes
                 FROM users u WHERE u.id = ? LIMIT 1`,
                [account.id],
            );
            reply(`${account.username} (ID ${account.id}) | Level ${account.level} | ${rankOf(account)} | Ping ${GetPlayerPing(String(target.source))} ms`);
            reply(`Cash $${account.cash} | Bank $${account.bank} | Job ${row?.job ?? '?'} (grade ${row?.job_grade ?? 0})`);
            reply(`Warnings: ${Number(row?.warnings ?? 0)} | Notes: ${Number(row?.notes ?? 0)} — /history ${account.id}`);
        },
    },
    {
        name: 'checkid', label: 'Check ID', description: 'Look up a player\'s database ID and name.', level: 1, helper: 1, category: 'Player',
        arguments: [ID_OR_NAME],
        run: async ({ args, reply }) => {
            const online = findOnline(args[0]);
            if (online) return reply(`${online.username} — ID ${online.accountId} (online)`);
            const id = parseIntStrict(args[0], 1);
            const row = id !== undefined
                ? await db.single<{ id: number; username: string }>('SELECT id, username FROM users WHERE id = ? LIMIT 1', [id])
                : await db.single<{ id: number; username: string }>('SELECT id, username FROM users WHERE username = ? LIMIT 1', [args[0]]);
            reply(row ? `${row.username} — ID ${row.id} (offline)` : 'No account found.');
        },
    },
    {
        name: 'history', label: 'Sanction history', description: 'Warnings, bans and notes of an account.', level: 1, helper: 4, category: 'Player',
        arguments: [ID],
        run: async ({ args, reply }) => {
            const account = await requireAccount(args[0]);
            await staffSchema;
            const [warnings, ban, notes] = await Promise.all([
                db.query<{ reason: string; created_at: Date; author: string | null }>(
                    `SELECT w.reason, w.created_at, a.username AS author FROM user_warnings w LEFT JOIN users a ON a.id = w.warned_by
                     WHERE w.user_id = ? ORDER BY w.id DESC LIMIT 10`,
                    [account.id],
                ),
                db.single<{ reason: string; expires_at: Date | null; author: string | null }>(
                    `SELECT b.reason, b.expires_at, a.username AS author FROM user_bans b LEFT JOIN users a ON a.id = b.banned_by
                     WHERE b.user_id = ? AND (b.expires_at IS NULL OR b.expires_at > CURRENT_TIMESTAMP) LIMIT 1`,
                    [account.id],
                ),
                db.query<{ note: string; created_at: Date; author: string | null }>(
                    `SELECT n.note, n.created_at, a.username AS author FROM user_notes n LEFT JOIN users a ON a.id = n.author_id
                     WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 5`,
                    [account.id],
                ),
            ]);
            reply(`History of ${account.username} (ID ${account.id}):`);
            reply(ban ? `BANNED ${ban.expires_at ? `until ${formatDate(ban.expires_at)}` : 'permanently'} by ${ban.author ?? 'Console'}: ${ban.reason}` : 'Not banned.');
            if (warnings.length === 0) reply('No warnings.');
            for (const warning of warnings) reply(`[WARN ${formatDate(warning.created_at)}] by ${warning.author ?? 'Console'}: ${warning.reason}`);
            for (const note of notes) reply(`[NOTE ${formatDate(note.created_at)}] by ${note.author ?? 'Console'}: ${note.note}`);
        },
    },
    {
        name: 'hnote', label: 'Internal note', description: 'Add an internal staff note to an account.', level: 1, helper: 4, category: 'Player',
        arguments: [ID, arg('note', 'Note')], arity: 'min',
        run: async (ctx) => {
            const account = await requireAccount(ctx.args[0]);
            const note = rest(ctx, 1);
            if (note.length < 3 || note.length > 255) fail('The note must be 3–255 characters.');
            await staffSchema;
            await db.insert('INSERT INTO user_notes (user_id, author_id, note) VALUES (?, ?, ?)', [account.id, ctx.actor.id, note]);
            ctx.reply(`Note added to ${account.username} (ID ${account.id}).`);
        },
    },

    // ── Helper team ─────────────────────────────────────────────────────────
    {
        name: 'honline', label: 'Staff online', description: 'List helpers and admins online.', level: 1, helper: 1, category: 'Helpers',
        arguments: [],
        run: ({ reply }) => {
            const staff = Core.online().filter(isStaff).sort((a, b) => b.admin - a.admin || b.helper - a.helper);
            reply(`Staff online (${staff.length}): ${staff.map((member) => `${member.username} [${rankOf(member)}]`).join(', ') || 'none'}`);
        },
    },
    {
        name: 'hlevel', label: 'Helper level', description: 'Show your helper level.', level: 1, helper: 1, category: 'Helpers',
        arguments: [],
        run: ({ actor, reply }) =>
            reply(actor.admin >= 1 ? `You are Admin ${actor.admin} (all helper tools, level ${helperLevel(actor)}).` : `You are Helper ${actor.helper}/${MAX_HELPER_LEVEL}.`),
    },
    {
        name: 'hstats', label: 'Helper stats', description: 'Your tickets and reports handled.', level: 1, helper: 1, category: 'Helpers',
        arguments: [],
        run: async ({ actor, reply }) => {
            await staffSchema;
            const row = await db.single<{ tickets: number; week: number; rejected: number; reports: number }>(
                `SELECT
                    (SELECT COUNT(*) FROM staff_tickets WHERE helper_id = ? AND status IN ('accepted', 'closed')) AS tickets,
                    (SELECT COUNT(*) FROM staff_tickets WHERE helper_id = ? AND status IN ('accepted', 'closed') AND created_at >= NOW() - INTERVAL 7 DAY) AS week,
                    (SELECT COUNT(*) FROM staff_tickets WHERE helper_id = ? AND status = 'rejected') AS rejected,
                    (SELECT COUNT(*) FROM staff_reports WHERE handled_by = ?) AS reports`,
                [actor.id, actor.id, actor.id, actor.id],
            );
            reply(`${actor.username} [${rankOf(actor)}] — tickets: ${Number(row?.tickets ?? 0)} total, ${Number(row?.week ?? 0)} this week, ${Number(row?.rejected ?? 0)} rejected | reports handled: ${Number(row?.reports ?? 0)}`);
        },
    },
    {
        name: 'hactivity', label: 'Helper activity', description: 'Activity of every helper in the last 7 days.', level: 1, category: 'Helpers',
        arguments: [],
        run: async ({ reply }) => {
            await staffSchema;
            const rows = await db.query<{ id: number; username: string; helper: number; tickets: number; reports: number }>(
                `SELECT u.id, u.username, u.helper,
                    (SELECT COUNT(*) FROM staff_tickets t WHERE t.helper_id = u.id AND t.created_at >= NOW() - INTERVAL 7 DAY AND t.status IN ('accepted', 'closed')) AS tickets,
                    (SELECT COUNT(*) FROM staff_reports r WHERE r.handled_by = u.id AND r.closed_at >= NOW() - INTERVAL 7 DAY) AS reports
                 FROM users u WHERE u.helper > 0 ORDER BY tickets DESC, u.helper DESC LIMIT 25`,
            );
            if (rows.length === 0) return reply('There are no helpers yet. Use /sethelper [ID] [1-5].');
            reply('Helper activity (last 7 days):');
            for (const row of rows) reply(`${row.username} (ID ${row.id}, Helper ${row.helper}): ${Number(row.tickets)} tickets, ${Number(row.reports)} reports`);
        },
    },
    {
        name: 'hpromote', label: 'Propose promotion', description: 'Propose a helper for promotion (sent to admins).', level: 1, helper: 5, category: 'Helpers',
        arguments: [ID, arg('reason', 'Reason', true)], arity: 'min',
        run: async (ctx) => {
            const account = await requireAccount(ctx.args[0]);
            const row = await db.single<{ helper: number }>('SELECT helper FROM users WHERE id = ? LIMIT 1', [account.id]);
            const level = Number(row?.helper ?? 0);
            if (level < 1) fail(`${account.username} is not a helper.`);
            if (level >= MAX_HELPER_LEVEL) fail(`${account.username} is already Helper ${MAX_HELPER_LEVEL}.`);
            const reason = rest(ctx, 1) || 'no reason given';
            await staffSchema;
            await db.insert('INSERT INTO user_notes (user_id, author_id, note) VALUES (?, ?, ?)', [
                account.id,
                ctx.actor.id,
                `Promotion to Helper ${level + 1} proposed: ${reason}`.slice(0, 255),
            ]);
            broadcast(isAdminOnline, '[PROMOTE]', `${ctx.actor.username} proposes ${account.username} (ID ${account.id}) for Helper ${level + 1}: ${reason}`, COLORS.admin);
            ctx.reply(`Promotion proposal for ${account.username} sent to the admins.`);
        },
    },
    {
        name: 'sethelper', label: 'Set helper level', description: `Set a player's helper level (0–${MAX_HELPER_LEVEL}).`, level: 4, category: 'Helpers',
        arguments: [ID, arg('level', `Helper level (0–${MAX_HELPER_LEVEL})`)],
        run: async ({ actor, args, reply }) => {
            const level = parseIntStrict(args[1], 0, MAX_HELPER_LEVEL) ?? fail(`Helper level must be a whole number from 0 to ${MAX_HELPER_LEVEL}.`);
            const account = await requireAccount(args[0]);
            const changed = await db.update('UPDATE users SET helper = ? WHERE id = ?', [level, account.id]);
            if (changed === 0) fail(`${account.username} is already Helper ${level}.`);
            const online = notifyAccount(account.id, level > 0 ? `You are now Helper ${level}. Type /hlevel and /tickets.` : 'You are no longer a helper.');
            if (online !== undefined) Core.patchAccount(online, { helper: level });
            reply(`Set ${account.username} (ID ${account.id}) to Helper ${level}.`);
            broadcast(isStaff, '[STAFF]', `${actor.username} set ${account.username} to Helper ${level}.`, COLORS.staff);
            log.info(`${actor.username} set ${account.username} (${account.id}) to helper ${level}`);
        },
    },
];
