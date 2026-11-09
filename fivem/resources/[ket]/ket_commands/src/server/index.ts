import { addSuggestion, chatAs } from '@shared/server/chat.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { onLocal } from '@shared/server/events.ts';
import { callClient } from '@shared/server/rpc.ts';

const reply = chatAs('SERVER');
const ADMIN_COLOR = '#ff4d4d';

/** Registers a player-only command; the console gets a short notice instead. */
function playerCommand(name: string, handler: (source: number, args: string[]) => void | Promise<void>): void {
    RegisterCommand(
        name,
        (source: number, args: string[]) => {
            if (source === 0) return console.log(`/${name} can only be used by a player.`);
            void Promise.resolve(handler(source, args)).catch((error) => {
                console.error(`/${name} failed:`, error);
                reply(source, 'Something went wrong. Please try again.');
            });
        },
        false,
    );
}

/** Resolves `/id` targets: database account ID (digits) or username, signed-in players only. */
const resolvePlayer = (argument: string): number | undefined =>
    /^\d+$/.test(argument) ? Core.findByAccountId(argument) : Core.findByUsername(argument);

playerCommand('id', async (source, args) => {
    if (args.length > 1) return reply(source, 'Usage: /id [database ID or username]');
    const target = args[0] ? resolvePlayer(args[0]) : source;
    const account = target !== undefined ? Core.getAccount(target) : undefined;
    if (target === undefined || !account) return reply(source, 'Player not found or not logged in. Use /id [database ID or username].');

    const fps = await callClient(target, 'ket_hud:getFps', [], 2_000).then(
        (value) => (value > 0 ? String(value) : '--'),
        () => '--',
    );
    const ping = GetPlayerPing(String(target));
    const head = `${account.username} (#${account.id}) | Level: ${account.level} | `;
    const admin = `Admin: ${account.admin}`;
    const tail = ` | Ping: ${ping} ms | FPS: ${fps}`;
    reply(source, head + admin + tail, [{ text: head }, { text: admin, color: ADMIN_COLOR }, { text: tail }]);
});

playerCommand('inventory', async (source) => {
    const account = Core.getAccount(source);
    if (!account) return;
    const items = await db.query<{ item_name: string; amount: number | string }>(
        'SELECT item_name, amount FROM user_inventory WHERE user_id = ? ORDER BY item_name',
        [account.id],
    );
    reply(source, items.length === 0 ? 'Your inventory is empty.' : `Inventory: ${items.map((item) => `${item.item_name} x${item.amount}`).join(', ')}`);
});

playerCommand('myjob', async (source) => {
    const account = Core.getAccount(source);
    if (!account) return;
    const row = await db.single<{ job: string; job_grade: number }>('SELECT job, job_grade FROM users WHERE id = ? LIMIT 1', [account.id]);
    reply(source, row ? `Your job: ${row.job} (grade ${row.job_grade}).` : 'Could not load your job. Please try again.');
});

/** Chat suggestions for commands every signed-in player can use. */
const SUGGESTIONS: [name: string, help: string, params?: { name: string; help: string }[]][] = [
    ['/id', 'Show account stats, or look up a logged-in player.', [{ name: 'name/id', help: 'Database ID or username (optional)' }]],
    ['/inventory', 'Show your saved database inventory.'],
    ['/myjob', 'Show your saved job and grade.'],
    ['/settings', 'Open your HUD and interface settings.'],
    ['/clearchat', 'Clear your chat window.'],
    ['/bike', 'Rent a bike at the rental attendant.'],
    ['/unrentbike', 'Return your rental bike.'],
];

const sendSuggestions = (source: number) => SUGGESTIONS.forEach(([name, help, params]) => addSuggestion(source, name, help, params));

onLocal('ket:playerLoaded', (source) => sendSuggestions(source));
for (const { source } of Core.online()) sendSuggestions(source);
