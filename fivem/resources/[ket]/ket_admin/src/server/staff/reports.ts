/**
 * Player reports, SA-MP style:
 *   player: /report [text]  →  admins only: /reports, /ar [id] [answer], /clearreport [id]
 */
import { parseIntStrict } from '@shared/common/validate.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { onPlayerDropped } from '@shared/server/events.ts';
import { arg, type AdminCommand } from '../command.ts';
import { fail, rest } from '../context.ts';
import { broadcast, COLORS, isAdminOnline, sendColored } from './chat.ts';
import { staffSchema } from './schema.ts';

const REPORT_COOLDOWN_MS = 60_000;
const lastReport = new Map<number, number>();
onPlayerDropped((source) => lastReport.delete(source));

const toStaff = (text: string) => broadcast(isAdminOnline, '[REPORT]', text, COLORS.report);

interface OpenReport {
    id: number;
    user_id: number;
    username: string;
    message: string;
}

async function requireOpenReport(argument: string | undefined): Promise<OpenReport> {
    const id = parseIntStrict(argument, 1) ?? fail('Use a valid report ID.');
    await staffSchema;
    const report = await db.single<OpenReport>(
        `SELECT r.id, r.user_id, u.username, r.message FROM staff_reports r JOIN users u ON u.id = r.user_id
         WHERE r.id = ? AND r.status = 'open' LIMIT 1`,
        [id],
    );
    return report ?? fail(`Report #${id} does not exist or is already closed.`);
}

const closeReport = (id: number, handlerId: string, answer: string | null) =>
    db.update("UPDATE staff_reports SET status = 'closed', handled_by = ?, answer = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'", [
        handlerId,
        answer,
        id,
    ]);

export const REPORT_COMMANDS: AdminCommand[] = [
    {
        name: 'report', label: 'Report', description: 'Report a problem or a player to the admins.', level: 0, category: 'Reports',
        arguments: [arg('text', 'Problem')], arity: 'min',
        run: async (ctx) => {
            const text = rest(ctx, 0);
            if (text.length < 5 || text.length > 200) fail('Your report must be 5–200 characters.');
            if (Date.now() - (lastReport.get(ctx.source) ?? 0) < REPORT_COOLDOWN_MS) fail('Please wait a minute before sending another report.');
            lastReport.set(ctx.source, Date.now());

            await staffSchema;
            const id = await db.insert('INSERT INTO staff_reports (user_id, message) VALUES (?, ?)', [ctx.actor.id, text]);
            ctx.reply(`Your report #${id} was sent to the admins.`);
            toStaff(`#${id} ${ctx.actor.username} (ID ${ctx.actor.id}): ${text} — /ar ${id} [answer]`);
        },
    },
    {
        name: 'reports', label: 'Open reports', description: 'List open player reports.', level: 1, category: 'Reports',
        arguments: [],
        run: async ({ reply }) => {
            await staffSchema;
            const rows = await db.query<OpenReport & { minutes: number }>(
                `SELECT r.id, r.user_id, u.username, r.message, TIMESTAMPDIFF(MINUTE, r.created_at, CURRENT_TIMESTAMP) AS minutes
                 FROM staff_reports r JOIN users u ON u.id = r.user_id
                 WHERE r.status = 'open' ORDER BY r.id ASC LIMIT 15`,
            );
            if (rows.length === 0) return reply('There are no open reports.');
            for (const row of rows) reply(`#${row.id} ${row.username} (ID ${row.user_id}, ${row.minutes}m ago): ${row.message}`);
        },
    },
    {
        name: 'ar', label: 'Answer report', description: 'Answer a report and close it.', level: 1, category: 'Reports',
        arguments: [arg('report', 'Report ID'), arg('answer', 'Answer')], arity: 'min',
        run: async (ctx) => {
            const report = await requireOpenReport(ctx.args[0]);
            const answer = rest(ctx, 1);
            if (answer.length > 200) fail('Your answer must be 200 characters or fewer.');
            if ((await closeReport(report.id, ctx.actor.id, answer)) === 0) fail(`Report #${report.id} was already closed.`);

            ctx.reply(`You answered report #${report.id}.`);
            const reporter = Core.findByAccountId(report.user_id);
            if (reporter !== undefined) sendColored(reporter, '[REPORT]', `${ctx.actor.username} answered your report #${report.id}: ${answer}`, COLORS.report);
            toStaff(`${ctx.actor.username} answered report #${report.id}.`);
        },
    },
    {
        name: 'clearreport', label: 'Close report', description: 'Close a report without answering.', level: 1, category: 'Reports',
        arguments: [arg('report', 'Report ID')],
        run: async (ctx) => {
            const report = await requireOpenReport(ctx.args[0]);
            if ((await closeReport(report.id, ctx.actor.id, null)) === 0) fail(`Report #${report.id} was already closed.`);
            ctx.reply(`Report #${report.id} closed.`);
            toStaff(`${ctx.actor.username} closed report #${report.id}.`);
        },
    },
];
