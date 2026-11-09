/**
 * Help tickets, SA-MP style:
 *   player: /helpme [question]  →  helpers: /tickets, /accept [id] or /nextticket
 *   both sides talk with /ht [text]  →  helper ends it with /closeticket (or /reject [id] [reason])
 */
import { log } from '@shared/common/log.ts';
import { parseIntStrict } from '@shared/common/validate.ts';
import { db } from '@shared/server/db.ts';
import { onPlayerDropped } from '@shared/server/events.ts';
import { arg, type AdminCommand } from '../command.ts';
import { fail, rest, type CommandContext } from '../context.ts';
import { broadcast, COLORS, hasHelper, sendColored } from './chat.ts';
import { staffSchema } from './schema.ts';

interface Ticket {
    id: number;
    playerSource: number;
    playerAccountId: string;
    playerName: string;
    question: string;
    createdAt: number;
    helperSource?: number;
    helperAccountId?: string;
    helperName?: string;
}

type EndStatus = 'closed' | 'rejected' | 'abandoned';

const HELPME_COOLDOWN_MS = 60_000;
const tickets = new Map<number, Ticket>();
const lastHelpme = new Map<number, number>();

const toHelpers = (text: string) => broadcast(hasHelper(1), '[HELPME]', text, COLORS.ticket);
const age = (ticket: Ticket) => `${Math.max(1, Math.round((Date.now() - ticket.createdAt) / 60_000))}m`;

const findByPlayer = (source: number) => [...tickets.values()].find((ticket) => ticket.playerSource === source);
const findByHelper = (source: number) => [...tickets.values()].find((ticket) => ticket.helperSource === source);

function requireTicket(argument: string | undefined): Ticket {
    const id = parseIntStrict(argument, 1);
    const ticket = id !== undefined ? tickets.get(id) : undefined;
    return ticket ?? fail('No active ticket with that ID. Use /tickets.');
}

async function endTicket(ticket: Ticket, status: EndStatus, reason: string | null = null): Promise<void> {
    tickets.delete(ticket.id);
    await db.update('UPDATE staff_tickets SET status = ?, reason = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?', [status, reason, ticket.id]);
}

async function accept({ source, actor, reply }: CommandContext, ticket: Ticket): Promise<void> {
    if (ticket.helperSource !== undefined) fail(`Ticket #${ticket.id} was already taken by ${ticket.helperName}.`);
    if (ticket.playerSource === source) fail('You cannot accept your own ticket.');
    const current = findByHelper(source);
    if (current) fail(`Finish ticket #${current.id} first (/closeticket).`);

    Object.assign(ticket, { helperSource: source, helperAccountId: actor.id, helperName: actor.username });
    await db.update("UPDATE staff_tickets SET status = 'accepted', helper_id = ? WHERE id = ?", [actor.id, ticket.id]);

    reply(`You accepted ticket #${ticket.id} from ${ticket.playerName}: "${ticket.question}". Reply with /ht [text].`);
    sendColored(ticket.playerSource, '[HELPME]', `${actor.username} accepted your request. Reply with /ht [text].`, COLORS.ticket);
    toHelpers(`${actor.username} accepted ticket #${ticket.id} (${ticket.playerName}).`);
}

export const TICKET_COMMANDS: AdminCommand[] = [
    {
        name: 'helpme', label: 'Ask for help', description: 'Send a question to the helpers.', level: 0, category: 'Tickets',
        arguments: [arg('question', 'Question')], arity: 'min',
        run: async (ctx) => {
            const question = rest(ctx, 0);
            if (question.length < 5 || question.length > 200) fail('Your question must be 5–200 characters.');
            const existing = findByPlayer(ctx.source);
            if (existing) fail(`You already have an open request (#${existing.id}). Please wait for a helper.`);
            const last = lastHelpme.get(ctx.source) ?? 0;
            if (Date.now() - last < HELPME_COOLDOWN_MS) fail('Please wait a minute before asking again.');
            lastHelpme.set(ctx.source, Date.now());

            await staffSchema;
            const id = await db.insert('INSERT INTO staff_tickets (user_id, question) VALUES (?, ?)', [ctx.actor.id, question]);
            tickets.set(id, { id, playerSource: ctx.source, playerAccountId: ctx.actor.id, playerName: ctx.actor.username, question, createdAt: Date.now() });

            ctx.reply(`Your request #${id} was sent to the helpers. Please wait.`);
            toHelpers(`#${id} ${ctx.actor.username} (ID ${ctx.actor.id}): ${question} — /accept ${id}`);
        },
    },
    {
        name: 'tickets', label: 'Active tickets', description: 'List open and accepted tickets.', level: 1, helper: 1, category: 'Tickets',
        arguments: [],
        run: ({ reply }) => {
            if (tickets.size === 0) return reply('There are no active tickets.');
            for (const ticket of [...tickets.values()].sort((a, b) => a.id - b.id)) {
                const state = ticket.helperName ? `taken by ${ticket.helperName}` : 'OPEN';
                reply(`#${ticket.id} [${state}] ${ticket.playerName} (${age(ticket)}): ${ticket.question}`);
            }
        },
    },
    {
        name: 'accept', label: 'Accept ticket', description: 'Take a ticket.', level: 1, helper: 1, category: 'Tickets',
        arguments: [arg('ticket', 'Ticket ID')],
        run: async (ctx) => accept(ctx, requireTicket(ctx.args[0])),
    },
    {
        name: 'nextticket', label: 'Next ticket', description: 'Take the oldest open ticket.', level: 1, helper: 1, category: 'Tickets',
        arguments: [],
        run: async (ctx) => {
            const next = [...tickets.values()].filter((ticket) => ticket.helperSource === undefined && ticket.playerSource !== ctx.source).sort((a, b) => a.id - b.id)[0];
            if (!next) fail('There are no open tickets.');
            await accept(ctx, next!);
        },
    },
    {
        name: 'reject', label: 'Reject ticket', description: 'Refuse a ticket with a reason.', level: 1, helper: 1, category: 'Tickets',
        arguments: [arg('ticket', 'Ticket ID'), arg('reason', 'Reason')], arity: 'min',
        run: async (ctx) => {
            const ticket = requireTicket(ctx.args[0]);
            const reason = rest(ctx, 1);
            if (ticket.helperSource !== undefined && ticket.helperSource !== ctx.source) fail(`Ticket #${ticket.id} belongs to ${ticket.helperName}.`);
            await endTicket(ticket, 'rejected', reason.slice(0, 255));
            ctx.reply(`You rejected ticket #${ticket.id}.`);
            sendColored(ticket.playerSource, '[HELPME]', `Your request was rejected by ${ctx.actor.username}. Reason: ${reason}`, COLORS.ticket);
            toHelpers(`${ctx.actor.username} rejected ticket #${ticket.id}. Reason: ${reason}`);
        },
    },
    {
        name: 'ht', label: 'Ticket reply', description: 'Talk in your active ticket (helper ↔ player).', level: 0, category: 'Tickets',
        arguments: [arg('message', 'Message')], arity: 'min',
        run: (ctx) => {
            const text = rest(ctx, 0);
            const asHelper = findByHelper(ctx.source);
            const asPlayer = findByPlayer(ctx.source);
            if (asHelper) {
                sendColored(asHelper.playerSource, `[Helper] ${ctx.actor.username}:`, text, COLORS.ticket);
                sendColored(ctx.source, `[To ${asHelper.playerName}]`, text, COLORS.ticket);
            } else if (asPlayer?.helperSource !== undefined) {
                sendColored(asPlayer.helperSource, `[#${asPlayer.id}] ${ctx.actor.username}:`, text, COLORS.ticket);
                sendColored(ctx.source, `[To helper ${asPlayer.helperName}]`, text, COLORS.ticket);
            } else {
                fail(asPlayer ? 'No helper has accepted your request yet. Please wait.' : 'You have no active ticket.');
            }
        },
    },
    {
        name: 'closeticket', label: 'Close ticket', description: 'Close the ticket you are handling.', level: 1, helper: 1, category: 'Tickets',
        arguments: [],
        run: async (ctx) => {
            const ticket = findByHelper(ctx.source) ?? fail('You are not handling a ticket.');
            await endTicket(ticket, 'closed');
            ctx.reply(`Ticket #${ticket.id} closed.`);
            sendColored(ticket.playerSource, '[HELPME]', `${ctx.actor.username} closed your request. Use /helpme if you need more help.`, COLORS.ticket);
        },
    },
    {
        name: 'mytickets', label: 'My tickets', description: 'Your current ticket and totals.', level: 1, helper: 1, category: 'Tickets',
        arguments: [],
        run: async ({ source, actor, reply }) => {
            await staffSchema;
            const current = findByHelper(source);
            const row = await db.single<{ total: number; today: number }>(
                `SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= CURRENT_DATE), 0) AS today
                 FROM staff_tickets WHERE helper_id = ? AND status IN ('accepted', 'closed')`,
                [actor.id],
            );
            reply(current ? `Current: #${current.id} ${current.playerName} — "${current.question}"` : 'You are not handling a ticket right now.');
            reply(`Tickets handled: ${Number(row?.today ?? 0)} today, ${Number(row?.total ?? 0)} in total.`);
        },
    },
];

// Disconnects: the player's ticket ends; a helper's ticket goes back to the queue.
onPlayerDropped((source) => {
    lastHelpme.delete(source);
    for (const ticket of [...tickets.values()]) {
        if (ticket.playerSource === source) {
            if (ticket.helperSource !== undefined) sendColored(ticket.helperSource, '[HELPME]', `${ticket.playerName} left. Ticket #${ticket.id} closed.`, COLORS.ticket);
            void endTicket(ticket, 'abandoned').catch((error) => log.error('Could not close ticket:', error));
        } else if (ticket.helperSource === source) {
            Object.assign(ticket, { helperSource: undefined, helperAccountId: undefined, helperName: undefined });
            void db
                .update("UPDATE staff_tickets SET status = 'open', helper_id = NULL WHERE id = ?", [ticket.id])
                .catch((error) => log.error('Could not requeue ticket:', error));
            sendColored(ticket.playerSource, '[HELPME]', 'Your helper left. Your request is back in the queue.', COLORS.ticket);
            toHelpers(`Ticket #${ticket.id} (${ticket.playerName}) is open again — /accept ${ticket.id}`);
        }
    }
});
