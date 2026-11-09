/**
 * Tickets (admins only): players open one in /tickets, admins answer or dismiss them in the
 * /tickets menu. Stored in the `staff_reports` table (kept from the earlier /report system).
 */
import type { Account, SupportItem } from '@shared/common/types.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { emitClient, onPlayerDropped } from '@shared/server/events.ts';
import { fail } from '../context.ts';
import { broadcast, COLORS, isAdminOnline, sendColored } from './chat.ts';
import { staffSchema } from './schema.ts';

const OPEN_COOLDOWN_MS = 60_000;
const lastOpened = new Map<number, number>();
onPlayerDropped((source) => lastOpened.delete(source));

const toAdmins = (text: string) => broadcast(isAdminOnline, '[TICKET]', text, COLORS.report);

/** Tells open /tickets menus (admins + the player concerned) to refresh. */
function changed(...players: (number | undefined)[]): void {
    const targets = new Set(players.filter((source): source is number => source !== undefined));
    for (const account of Core.online()) if (account.admin >= 1) targets.add(account.source);
    for (const target of targets) emitClient('ket_admin:supportChanged', target, 'ticket');
}

interface TicketRow {
    id: number;
    user_id: number;
    username: string;
    message: string;
    minutes: number;
}

async function requireOpen(id: number): Promise<TicketRow> {
    await staffSchema;
    const row = await db.single<TicketRow>(
        `SELECT r.id, r.user_id, u.username, r.message, TIMESTAMPDIFF(MINUTE, r.created_at, CURRENT_TIMESTAMP) AS minutes
         FROM staff_reports r JOIN users u ON u.id = r.user_id WHERE r.id = ? AND r.status = 'open' LIMIT 1`,
        [id],
    );
    return row ?? fail(`Ticket #${id} does not exist or is already closed.`);
}

async function closeTicket(id: number, handler: Account, answer: string | null): Promise<void> {
    const changedRows = await db.update(
        "UPDATE staff_reports SET status = 'closed', handled_by = ?, answer = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'",
        [handler.id, answer, id],
    );
    if (changedRows === 0) fail(`Ticket #${id} was already closed.`);
}

export const ticketService = {
    async list(): Promise<SupportItem[]> {
        await staffSchema;
        const rows = await db.query<TicketRow>(
            `SELECT r.id, r.user_id, u.username, r.message, TIMESTAMPDIFF(MINUTE, r.created_at, CURRENT_TIMESTAMP) AS minutes
             FROM staff_reports r JOIN users u ON u.id = r.user_id WHERE r.status = 'open' ORDER BY r.id ASC LIMIT 50`,
        );
        return rows.map((row) => ({
            id: row.id,
            player: row.username,
            playerId: String(row.user_id),
            text: row.message,
            ageMinutes: Number(row.minutes),
            helper: null,
            mine: false,
        }));
    },

    async pendingFor(account: Account) {
        await staffSchema;
        const row = await db.single<{ id: number; message: string }>(
            "SELECT id, message FROM staff_reports WHERE user_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1",
            [account.id],
        );
        return row ? { id: row.id, text: row.message, helper: null } : null;
    },

    async create(source: number, account: Account, raw: string): Promise<void> {
        const text = raw.trim();
        if (text.length < 5 || text.length > 200) fail('Your ticket must be 5–200 characters.');
        if (await ticketService.pendingFor(account)) fail('You already have an open ticket. Please wait for an admin.');
        if (Date.now() - (lastOpened.get(source) ?? 0) < OPEN_COOLDOWN_MS) fail('Please wait a minute before opening another ticket.');
        lastOpened.set(source, Date.now());

        const id = await db.insert('INSERT INTO staff_reports (user_id, message) VALUES (?, ?)', [account.id, text]);
        toAdmins(`#${id} ${account.username} (ID ${account.id}): ${text} — open /tickets`);
        changed(source);
    },

    async answer(account: Account, id: number, raw: string): Promise<void> {
        const text = raw.trim();
        if (text.length < 2 || text.length > 200) fail('Your answer must be 2–200 characters.');
        const ticket = await requireOpen(id);
        await closeTicket(id, account, text);
        const player = Core.findByAccountId(ticket.user_id);
        if (player !== undefined) sendColored(player, '[TICKET]', `${account.username} answered your ticket #${id}: ${text}`, COLORS.report);
        changed(player);
    },

    async dismiss(account: Account, id: number): Promise<void> {
        const ticket = await requireOpen(id);
        await closeTicket(id, account, null);
        const player = Core.findByAccountId(ticket.user_id);
        if (player !== undefined) sendColored(player, '[TICKET]', `Your ticket #${id} was closed by ${account.username}.`, COLORS.report);
        changed(player);
    },
};
