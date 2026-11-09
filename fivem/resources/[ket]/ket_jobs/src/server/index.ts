/**
 * Jobs server. The server decides everything that matters (job, distance, zone, timing, catch, money);
 * the client only plays animations and the minigame.
 */
import { log } from '@shared/common/log.ts';
import type { Account } from '@shared/common/types.ts';
import { addSuggestion, chatAs } from '@shared/server/chat.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { onLocal, onPlayerDropped } from '@shared/server/events.ts';
import { distance3 } from '@shared/server/players.ts';
import { onRpc } from '@shared/server/rpc.ts';
import { FISH, FISHING, FISHING_RULES, JOBS, type FishInfo } from '../common/config.ts';

const reply = chatAs('JOBS');
const UNEMPLOYED = 'unemployed';

const playerCoords = (source: number) => GetEntityCoords(GetPlayerPed(String(source)));
const inVehicle = (source: number) => GetVehiclePedIsIn(GetPlayerPed(String(source)), false) !== 0;
const nearFishingNpc = (source: number) =>
    distance3(playerCoords(source), [FISHING.npc.x, FISHING.npc.y, FISHING.npc.z]) <= FISHING.getJobRange + 3; // + slack for NPC ground snap
const inFishingZone = (source: number) => distance3(playerCoords(source), [FISHING.zone.x, FISHING.zone.y, FISHING.zone.z]) <= FISHING.zoneRadius;

async function jobOf(account: Account): Promise<string> {
    return (await db.scalar<string>('SELECT job FROM users WHERE id = ? LIMIT 1', [account.id])) ?? UNEMPLOYED;
}

const setJob = (account: Account, job: string) => db.update('UPDATE users SET job = ?, job_grade = 0 WHERE id = ?', [job, account.id]);

/** Server command that needs a signed-in player; errors become a chat message. */
function playerCommand(name: string, handler: (source: number, account: Account) => Promise<void>): void {
    RegisterCommand(
        name,
        (source: number) => {
            if (source === 0) return log.warn(`/${name} can only be used by a player.`);
            const account = Core.getAccount(source);
            if (!account) return reply(source, 'Sign in first.');
            handler(source, account).catch((error) => {
                log.error(`/${name} failed:`, error);
                reply(source, 'Something went wrong. Please try again.');
            });
        },
        false,
    );
}

// ── /getjob, /quitjob ───────────────────────────────────────────────────────
playerCommand('getjob', async (source, account) => {
    if (!nearFishingNpc(source)) return reply(source, 'Go to a job NPC first. Open /jobs and pin the location.');
    const current = await jobOf(account);
    if (current === 'fisherman') return reply(source, 'You are already a fisherman. Type /fish in the fishing zone.');
    await setJob(account, 'fisherman');
    reply(source, `You are now a Fisherman${current !== UNEMPLOYED ? ` (you left your job as ${current})` : ''}. Type /fish to start fishing.`);
});

playerCommand('quitjob', async (source, account) => {
    const current = await jobOf(account);
    if (current === UNEMPLOYED) return reply(source, 'You do not have a job.');
    await setJob(account, UNEMPLOYED);
    sessions.delete(source);
    reply(source, `You quit your job as ${JOBS.find((job) => job.id === current)?.name ?? current}.`);
});

onRpc('ket_jobs:state', async (source) => {
    const account = Core.getAccount(source);
    return account ? { ok: true, data: { job: await jobOf(account) } } : { ok: false, error: 'Sign in first.' };
});

// ── /fish ───────────────────────────────────────────────────────────────────
interface Session {
    id: number;
    startedAt: number;
}

const sessions = new Map<number, Session>();
let nextSession = 1;
onPlayerDropped((source) => sessions.delete(source));

onRpc(
    'ket_jobs:startFishing',
    async (source) => {
        const account = Core.getAccount(source);
        if (!account) return { status: 'error', message: 'Sign in first.' };
        if ((await jobOf(account)) !== 'fisherman') return { status: 'error', message: 'You are not a fisherman. Open /jobs to find the job.' };
        if (inVehicle(source)) return { status: 'error', message: 'Get out of your vehicle to fish.' };
        if (!inFishingZone(source)) return { status: 'zone' };
        // A cast that never finished (crash, resource restart) expires after the max cast time.
        const existing = sessions.get(source);
        if (existing && Date.now() - existing.startedAt < FISHING_RULES.maxCastMs) return { status: 'error', message: 'You are already fishing.' };

        const session = { id: nextSession++, startedAt: Date.now() };
        sessions.set(source, session);
        // Harder catches over time could go here; for now a random target width and marker speed.
        return { status: 'ok', session: session.id, zoneWidth: 0.14 + Math.random() * 0.08, speed: 0.9 + Math.random() * 0.5 };
    },
    { cooldownMs: 1_000 },
);

function pickFish(): FishInfo {
    let roll = Math.random() * FISH.reduce((sum, fish) => sum + fish.weight, 0);
    for (const fish of FISH) if ((roll -= fish.weight) < 0) return fish;
    return FISH[0]!;
}

onRpc('ket_jobs:finishFishing', async (source, sessionId, success) => {
    const account = Core.getAccount(source);
    const session = sessions.get(source);
    if (!account || !session || session.id !== sessionId) return { ok: false, error: 'You are not fishing.' };
    sessions.delete(source);

    const elapsed = Date.now() - session.startedAt;
    if (elapsed < FISHING_RULES.minCastMs || elapsed > FISHING_RULES.maxCastMs) return { ok: false, error: 'The fish got away.' };
    if (success !== true) return { ok: true, data: null };
    if (!inFishingZone(source)) return { ok: false, error: 'You left the fishing zone.' };

    const fish = pickFish();
    await db.update(
        'INSERT INTO user_inventory (user_id, item_name, amount) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE amount = amount + 1',
        [account.id, fish.item],
    );
    return { ok: true, data: { label: fish.label, price: fish.price } };
});

// ── /sellfish (until 24/7 shops exist) ──────────────────────────────────────
const selling = new Set<number>();
onPlayerDropped((source) => selling.delete(source));

playerCommand('sellfish', async (source, account) => {
    if (selling.has(source)) return;
    selling.add(source);
    try {
        const prices = new Map(FISH.map((fish) => [fish.item, fish]));
        const rows = await db.query<{ item_name: string; amount: number | string }>(
            `SELECT item_name, amount FROM user_inventory WHERE user_id = ? AND item_name IN (${FISH.map(() => '?').join(', ')}) AND amount > 0`,
            [account.id, ...FISH.map((fish) => fish.item)],
        );
        if (rows.length === 0) return reply(source, 'You have no fish to sell. Catch some with /fish.');

        let total = 0;
        let count = 0;
        const parts: string[] = [];
        for (const row of rows) {
            const fish = prices.get(row.item_name)!;
            const amount = Number(row.amount);
            total += fish.price * amount;
            count += amount;
            parts.push(`${amount}x ${fish.label}`);
        }

        // Remove exactly what was counted, then pay, atomically.
        const committed = await db.transaction([
            ...rows.map((row) => ({
                query: 'UPDATE user_inventory SET amount = amount - ? WHERE user_id = ? AND item_name = ? AND amount >= ?',
                values: [Number(row.amount), account.id, row.item_name, Number(row.amount)],
            })),
            { query: 'DELETE FROM user_inventory WHERE user_id = ? AND amount = 0', values: [account.id] },
            { query: 'UPDATE users SET cash = cash + ? WHERE id = ?', values: [total, account.id] },
        ]);
        if (!committed) return reply(source, 'Could not sell your fish. Please try again.');

        const cash = await db.scalar<number | string>('SELECT cash FROM users WHERE id = ? LIMIT 1', [account.id]);
        if (cash !== null) Core.patchAccount(source, { cash: String(cash) });
        reply(source, `You sold ${count} fish (${parts.join(', ')}) for $${total.toLocaleString('en-US')}.`);
        log.info(`${account.username} sold ${count} fish for $${total}`);
    } finally {
        selling.delete(source);
    }
});

// ── Chat suggestions ────────────────────────────────────────────────────────
const SUGGESTIONS: [string, string][] = [
    ['/jobs', 'Open the jobs menu.'],
    ['/getjob', 'Take the job of the NPC you are standing next to.'],
    ['/quitjob', 'Quit your current job.'],
    ['/fish', 'Fisherman: cast your rod in the fishing zone.'],
    ['/sellfish', 'Sell all the fish in your inventory.'],
];
const suggest = (source: number) => SUGGESTIONS.forEach(([name, help]) => addSuggestion(source, name, help));
onLocal('ket:playerLoaded', (source) => suggest(source));
for (const { source } of Core.online()) suggest(source);
