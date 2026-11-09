/**
 * Questions (helpers only): players ask in /questions, helpers take them in the /questions menu,
 * then both sides talk with /ht. Stored in the `staff_tickets` table.
 */
import type { Account, SupportItem } from '@shared/common/types.ts';
import { log } from '@shared/common/log.ts';
import { db } from '@shared/server/db.ts';
import { emitClient, onPlayerDropped } from '@shared/server/events.ts';
import { Core } from '@shared/server/core.ts';
import { arg, type AdminCommand } from '../command.ts';
import { fail, rest } from '../context.ts';
import { broadcast, COLORS, hasHelper, sendColored } from './chat.ts';
import { staffSchema } from './schema.ts';

interface Question {
    id: number;
    playerSource: number;
    playerAccountId: string;
    playerName: string;
    text: string;
    createdAt: number;
    helperSource?: number;
    helperName?: string;
}

type EndStatus = 'closed' | 'rejected' | 'abandoned';

const ASK_COOLDOWN_MS = 60_000;
const questions = new Map<number, Question>();
const lastAsked = new Map<number, number>();

const toHelpers = (text: string) => broadcast(hasHelper(1), '[QUESTION]', text, COLORS.ticket);

/** Tells open /questions menus (helpers + the asker) to refresh. */
function changed(...players: number[]): void {
    const targets = new Set(players);
    for (const account of Core.online()) if (account.helper >= 1) targets.add(account.source);
    for (const target of targets) emitClient('ket_admin:supportChanged', target, 'question');
}

const findByPlayer = (source: number) => [...questions.values()].find((question) => question.playerSource === source);
const findByHelper = (source: number) => [...questions.values()].find((question) => question.helperSource === source);
const requireQuestion = (id: number) => questions.get(id) ?? fail('That question is no longer open.');

async function end(question: Question, status: EndStatus, reason: string | null = null): Promise<void> {
    questions.delete(question.id);
    await db.update('UPDATE staff_tickets SET status = ?, reason = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?', [status, reason, question.id]);
}

export const questionService = {
    list(viewer: number): SupportItem[] {
        return [...questions.values()]
            .sort((a, b) => a.id - b.id)
            .map((question) => ({
                id: question.id,
                player: question.playerName,
                playerId: question.playerAccountId,
                text: question.text,
                ageMinutes: Math.floor((Date.now() - question.createdAt) / 60_000),
                helper: question.helperName ?? null,
                mine: question.helperSource === viewer,
            }));
    },

    pendingFor(source: number) {
        const question = findByPlayer(source);
        return question ? { id: question.id, text: question.text, helper: question.helperName ?? null } : null;
    },

    async create(source: number, account: Account, raw: string): Promise<void> {
        const text = raw.trim();
        if (text.length < 5 || text.length > 200) fail('Your question must be 5–200 characters.');
        if (findByPlayer(source)) fail('You already have an open question. Please wait for a helper.');
        if (Date.now() - (lastAsked.get(source) ?? 0) < ASK_COOLDOWN_MS) fail('Please wait a minute before asking again.');
        lastAsked.set(source, Date.now());

        await staffSchema;
        const id = await db.insert('INSERT INTO staff_tickets (user_id, question) VALUES (?, ?)', [account.id, text]);
        questions.set(id, { id, playerSource: source, playerAccountId: account.id, playerName: account.username, text, createdAt: Date.now() });
        toHelpers(`#${id} ${account.username} (ID ${account.id}): ${text} — open /questions`);
        changed(source);
    },

    async accept(source: number, account: Account, id: number): Promise<void> {
        const question = requireQuestion(id);
        if (question.helperSource !== undefined) fail(`Question #${id} was already taken by ${question.helperName}.`);
        if (question.playerSource === source) fail('You cannot take your own question.');
        const current = findByHelper(source);
        if (current) fail(`Close question #${current.id} first.`);

        Object.assign(question, { helperSource: source, helperName: account.username });
        await db.update("UPDATE staff_tickets SET status = 'accepted', helper_id = ? WHERE id = ?", [account.id, id]);
        sendColored(source, '[QUESTION]', `You took #${id} from ${question.playerName}: "${question.text}". Reply with /ht [text].`, COLORS.ticket);
        sendColored(question.playerSource, '[QUESTION]', `${account.username} is answering your question. Reply with /ht [text].`, COLORS.ticket);
        changed(question.playerSource);
    },

    async reject(source: number, account: Account, id: number, rawReason: string): Promise<void> {
        const question = requireQuestion(id);
        const reason = rawReason.trim();
        if (reason.length < 2 || reason.length > 200) fail('Give a reason (2–200 characters).');
        if (question.helperSource !== undefined && question.helperSource !== source) fail(`Question #${id} belongs to ${question.helperName}.`);
        await end(question, 'rejected', reason);
        sendColored(question.playerSource, '[QUESTION]', `Your question was rejected by ${account.username}. Reason: ${reason}`, COLORS.ticket);
        changed(question.playerSource);
    },

    async close(source: number, account: Account, id: number): Promise<void> {
        const question = requireQuestion(id);
        if (question.helperSource !== source) fail('You can only close a question you took.');
        await end(question, 'closed');
        sendColored(question.playerSource, '[QUESTION]', `${account.username} closed your question. Use /questions if you need more help.`, COLORS.ticket);
        changed(question.playerSource);
    },
};

/** /ht — the live conversation between a helper and the player whose question they took. */
export const QUESTION_COMMANDS: AdminCommand[] = [
    {
        name: 'ht', label: 'Question reply', description: 'Talk in your active question (helper ↔ player).', level: 0, category: 'Questions',
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
                fail(asPlayer ? 'No helper has taken your question yet. Please wait.' : 'You have no active question.');
            }
        },
    },
];

// Disconnects: the asker's question ends; a helper's question goes back to the queue.
onPlayerDropped((source) => {
    lastAsked.delete(source);
    for (const question of [...questions.values()]) {
        if (question.playerSource === source) {
            if (question.helperSource !== undefined) sendColored(question.helperSource, '[QUESTION]', `${question.playerName} left. Question #${question.id} closed.`, COLORS.ticket);
            void end(question, 'abandoned').catch((error) => log.error('Could not close question:', error));
            changed();
        } else if (question.helperSource === source) {
            Object.assign(question, { helperSource: undefined, helperName: undefined });
            void db
                .update("UPDATE staff_tickets SET status = 'open', helper_id = NULL WHERE id = ?", [question.id])
                .catch((error) => log.error('Could not requeue question:', error));
            sendColored(question.playerSource, '[QUESTION]', 'Your helper left. Your question is back in the queue.', COLORS.ticket);
            toHelpers(`Question #${question.id} (${question.playerName}) is open again — open /questions`);
            changed(question.playerSource);
        }
    }
});
