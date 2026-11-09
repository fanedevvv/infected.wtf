import { MAX_ADMIN_LEVEL } from '@shared/common/constants.ts';
import type { AdminSelfAction } from '@shared/common/contracts.ts';
import { parseIntStrict } from '@shared/common/validate.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { emitClient } from '@shared/server/events.ts';
import { getPedCoords } from '@shared/server/players.ts';
import { log } from '@shared/common/log.ts';
import { sendChat } from '@shared/server/chat.ts';
import { action, arg, ID, type AdminCommand } from './command.ts';
import { rememberPosition } from './positions.ts';
import { customVehicles } from './vehicles.ts';
import { fail, notify, notifyAccount, requireAccount, requireOnline, rest, type CommandContext } from './context.ts';


/** Commands that run entirely on the admin's own client. */
const selfAction = (
    name: string,
    label: string,
    description: string,
    level: number,
    category: string,
    type: AdminSelfAction,
): AdminCommand => ({ name, label, description, level, category, arguments: [], run: ({ source }) => action(source, { type }) });

function setFrozen({ source, args, reply }: CommandContext, frozen: boolean): void {
    const target = requireOnline(args[0]);
    action(target.source, { type: 'freeze', frozen });
    reply(`${frozen ? 'Froze' : 'Unfroze'} ${target.username}.`);
    if (target.source !== source) notify(target.source, frozen ? 'A staff member froze you.' : 'A staff member unfroze you.');
}

function bring({ source, args, reply }: CommandContext): void {
    const target = requireOnline(args[0]);
    action(target.source, { type: 'teleport', ...getPedCoords(source) });
    reply(`Brought ${target.username} to you.`);
    if (target.source !== source) notify(target.source, 'A staff member teleported you to them.');
}

type Rgb = [number, number, number];

/** Named colours for /carcolor (anything else: #rrggbb). */
const COLORS: Record<string, Rgb> = {
    black: [10, 10, 10], white: [240, 240, 240], grey: [110, 110, 110], gray: [110, 110, 110], silver: [180, 185, 190],
    red: [200, 20, 20], darkred: [110, 10, 15], orange: [240, 110, 20], yellow: [245, 205, 20], gold: [212, 175, 55],
    green: [30, 150, 50], darkgreen: [15, 70, 30], lime: [130, 220, 40], blue: [25, 80, 210], darkblue: [15, 30, 90],
    lightblue: [90, 170, 240], cyan: [20, 200, 220], purple: [110, 40, 170], pink: [235, 90, 160], brown: [100, 60, 30],
    beige: [215, 195, 155], sapphire: [47, 134, 255],
};
const COLOR_NAMES = Object.keys(COLORS).filter((name) => name !== 'gray').join(', ');

function parseColor(input: string | undefined): Rgb | undefined {
    const value = (input ?? '').toLowerCase();
    if (COLORS[value]) return COLORS[value];
    const hex = /^#?([\da-f]{6})$/.exec(value)?.[1];
    if (!hex) return undefined;
    const n = Number.parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Denies acting on accounts with an equal or higher admin level. */
function assertOutranks(actorLevel: number, targetLevel: number, verb: string): void {
    if (targetLevel >= actorLevel) fail(`You cannot ${verb} an administrator with an equal or higher level.`);
}

export const ADMIN_COMMANDS: AdminCommand[] = [
    // ── Teleport ────────────────────────────────────────────────────────────
    {
        name: 'goto', label: 'Teleport to player', description: 'Teleport to a player (/return to go back).', level: 2, helper: 2, category: 'Teleport', arguments: [ID],
        run: ({ source, args, reply }) => {
            const target = requireOnline(args[0]);
            if (target.source === source) fail('You cannot teleport to yourself.');
            rememberPosition(source);
            action(source, { type: 'teleport', ...getPedCoords(target.source) });
            reply(`Teleported to ${target.username}.`);
        },
    },
    { name: 'gethere', label: 'Bring player', description: 'Bring a player to you.', level: 2, helper: 2, category: 'Teleport', arguments: [ID], run: bring },
    { name: 'bring', label: 'Bring player (alias)', description: 'Alias for /gethere.', level: 2, helper: 2, category: 'Teleport', arguments: [ID], run: bring },
    {
        name: 'mypos', label: 'My position', description: 'Show your exact position (for placing NPCs, zones, blips).', level: 1, category: 'Teleport', arguments: [],
        run: ({ source, reply }) => {
            const { x, y, z, heading } = getPedCoords(source);
            const text = `x: ${x.toFixed(2)}, y: ${y.toFixed(2)}, z: ${z.toFixed(2)}, heading: ${heading.toFixed(1)}`;
            reply(text);
            log.info(`/mypos ${text}`);
        },
    },
    selfAction('tpm', 'Teleport to waypoint', 'Teleport to your map waypoint.', 1, 'Teleport', 'waypoint'),

    // ── Player ──────────────────────────────────────────────────────────────
    { name: 'freeze', label: 'Freeze player', description: 'Freeze a player in place.', level: 1, helper: 3, category: 'Player', arguments: [ID], run: (ctx) => setFrozen(ctx, true) },
    { name: 'unfreeze', label: 'Unfreeze player', description: 'Unfreeze a player.', level: 1, helper: 3, category: 'Player', arguments: [ID], run: (ctx) => setFrozen(ctx, false) },
    {
        name: 'heal', label: 'Heal player', description: 'Restore a player to full health.', level: 1, category: 'Player', arguments: [ID],
        run: ({ args, reply }) => {
            const target = requireOnline(args[0]);
            action(target.source, { type: 'heal' });
            notify(target.source, 'You have been healed by an admin.');
            reply(`Healed ${target.username}.`);
        },
    },
    {
        name: 'spectate', label: 'Spectate player', description: 'Toggle spectating a player (/specoff to stop).', level: 1, helper: 3, category: 'Player', arguments: [ID],
        run: ({ source, args, reply }) => {
            const target = requireOnline(args[0]);
            if (target.source === source) fail('You cannot spectate yourself.');
            action(source, { type: 'spectate', target: target.source });
            reply(`Spectating ${target.username}. Use /spectate [ID] again to stop.`);
        },
    },
    {
        name: 'respawn', label: 'Respawn player', description: 'Respawn a logged-in player.', level: 1, category: 'Player',
        arguments: [{ name: 'id', label: 'Database ID or username' }],
        run: ({ source, args, reply }) => {
            const target = requireOnline(args[0]);
            action(target.source, { type: 'respawn' });
            reply(`Respawned ${target.username} (ID ${target.accountId}).`);
            if (target.source !== source) notify(target.source, 'An admin has respawned you.');
        },
    },
    selfAction('noclip', 'Toggle noclip', 'Toggle free movement.', 1, 'Player', 'noclip'),
    selfAction('invisible', 'Toggle invisibility', 'Toggle your visibility.', 3, 'Player', 'invisible'),
    selfAction('godmode', 'Toggle godmode', 'Toggle invulnerability.', 1, 'Player', 'godmode'),

    // ── Punishment ──────────────────────────────────────────────────────────
    {
        name: 'kick', label: 'Kick player', description: 'Remove a player from the server.', level: 1, category: 'Punishment',
        arguments: [ID, arg('reason', 'Reason')], arity: 'min',
        run: (ctx) => {
            const target = requireOnline(ctx.args[0]);
            const reason = rest(ctx, 1);
            if (reason.length > 180) fail('Reason must be 180 characters or fewer.');
            if (target.source !== ctx.source) assertOutranks(ctx.actor.admin, Core.getAdminLevel(target.source), 'kick');
            DropPlayer(String(target.source), `Kicked by an administrator. Reason: ${reason}`);
            ctx.reply(`Kicked ${target.username}.`);
        },
    },
    {
        name: 'ban', label: 'Ban player', description: 'Ban an account for a number of days (0 = permanent).', level: 2, category: 'Punishment',
        arguments: [ID, arg('days', 'Days (0 = permanent)'), arg('reason', 'Reason')], arity: 'min',
        run: async (ctx) => {
            const days = parseIntStrict(ctx.args[1], 0, 36_500);
            const reason = rest(ctx, 2);
            if (days === undefined || reason.length < 1 || reason.length > 240) fail('Days must be 0–36500 and reason must be 1–240 characters.');
            const account = await requireAccount(ctx.args[0]);
            if (account.id === ctx.actor.id) fail('You cannot ban your own account.');
            assertOutranks(ctx.actor.admin, account.admin, 'ban');

            await db.update(
                `INSERT INTO user_bans (user_id, expires_at, reason, banned_by)
                 VALUES (?, IF(? = 0, NULL, TIMESTAMPADD(DAY, ?, CURRENT_TIMESTAMP)), ?, ?)
                 ON DUPLICATE KEY UPDATE expires_at = VALUES(expires_at), reason = VALUES(reason),
                     banned_by = VALUES(banned_by), created_at = CURRENT_TIMESTAMP`,
                [account.id, days, days, reason, ctx.actor.id],
            );
            ctx.reply(`Banned ${account.username} (ID ${account.id}) ${days === 0 ? 'permanently' : `for ${days} day(s)`}.`);
            const online = Core.findByAccountId(account.id);
            if (online !== undefined) DropPlayer(String(online), `Banned. Reason: ${reason}`);
        },
    },
    {
        name: 'unban', label: 'Unban account', description: 'Remove a database account ban.', level: 2, category: 'Punishment', arguments: [ID],
        run: async ({ args, reply }) => {
            const account = await requireAccount(args[0]);
            const removed = await db.update('DELETE FROM user_bans WHERE user_id = ?', [account.id]);
            reply(removed > 0 ? `Removed the ban for ${account.username} (ID ${account.id}).` : `${account.username} (ID ${account.id}) has no active ban.`);
        },
    },
    {
        name: 'warn', label: 'Warn player', description: 'Record a warning for a player.', level: 1, helper: 4, category: 'Punishment',
        arguments: [ID, arg('reason', 'Reason')], arity: 'min',
        run: async (ctx) => {
            const target = requireOnline(ctx.args[0]);
            const reason = rest(ctx, 1);
            if (reason.length > 240) fail('Reason must be 240 characters or fewer.');
            const warningId = await db.insert('INSERT INTO user_warnings (user_id, reason, warned_by) VALUES (?, ?, ?)', [target.accountId, reason, ctx.actor.id]);
            ctx.reply(`Warned ${target.username}. Warning #${warningId} recorded.`);
            notify(target.source, `You received a warning: ${reason}`);
        },
    },

    // ── Vehicle ─────────────────────────────────────────────────────────────
    {
        name: 'car', label: 'Spawn vehicle', description: 'Spawn a vehicle by model name.', level: 1, category: 'Vehicle', arguments: [arg('model', 'Vehicle model')],
        run: ({ source, args }) => {
            const model = args[0] ?? '';
            if (!/^\w{1,64}$/.test(model)) fail('Usage: /car [vehicle model]');
            action(source, { type: 'spawnVehicle', model });
        },
    },
    {
        name: 'carlist', label: 'Car list', description: 'Browse every vehicle on the server (custom cars first) and spawn one.', level: 1, category: 'Vehicle', arguments: [],
        run: ({ source }) => emitClient('ket_admin:carlist', source, customVehicles()),
    },
    selfAction('dv', 'Delete vehicle', 'Delete the vehicle you are in or looking at.', 1, 'Vehicle', 'deleteVehicle'),
    {
        name: 'carcolor', label: 'Car color', description: 'Paint the car you are in (name or #hex; optional second color).', level: 1, category: 'Vehicle',
        arguments: [arg('color', 'Color (e.g. red or #2f86ff)'), arg('secondary', 'Second color', true)],
        run: ({ source, args, reply }) => {
            const primary = parseColor(args[0]) ?? fail(`Unknown color "${args[0]}". Use #rrggbb or one of: ${COLOR_NAMES}.`);
            const secondary = args[1] === undefined ? undefined : (parseColor(args[1]) ?? fail(`Unknown color "${args[1]}". Use #rrggbb or one of: ${COLOR_NAMES}.`));
            action(source, { type: 'carColor', primary, ...(secondary && { secondary }) });
            reply(`Painting your car ${args[0]}${secondary ? ` / ${args[1]}` : ''}.`);
        },
    },
    selfAction('fix', 'Repair vehicle', 'Repair the vehicle you are in.', 1, 'Vehicle', 'fix'),
    selfAction('fuel', 'Refuel vehicle', 'Set the vehicle fuel level to 100%.', 1, 'Vehicle', 'fuel'),
    selfAction('cleararea', 'Clear nearby vehicles', 'Delete unoccupied vehicles within 100 meters.', 1, 'Vehicle', 'clearArea'),

    // ── Economy ─────────────────────────────────────────────────────────────
    {
        name: 'givemoney', label: 'Give money', description: 'Give cash to a logged-in player.', level: 1, category: 'Economy',
        arguments: [ID, arg('amount', 'Amount'), arg('reason', 'Optional reason', true)], arity: 'min',
        run: async (ctx) => {
            const amount = parseIntStrict(ctx.args[1], 1) ?? fail('Amount must be a positive whole number within the supported range.');
            const target = requireOnline(ctx.args[0]);
            const reason = rest(ctx, 2);
            if (reason.length > 120) fail('Reason must be 120 characters or fewer.');

            const updated = await db.update('UPDATE users SET cash = cash + ? WHERE id = ?', [amount, target.accountId]);
            if (updated !== 1) fail('Cash was not added. Check the server console.');
            const cash = String((await db.scalar<number | string>('SELECT cash FROM users WHERE id = ? LIMIT 1', [target.accountId])) ?? '?');

            const suffix = reason ? ` Reason: ${reason}` : '';
            ctx.reply(`Gave $${amount} to ${target.username}. New cash balance: $${cash}.${suffix}`);
            if (Core.findByAccountId(target.accountId) === target.source) {
                Core.patchAccount(target.source, { cash });
                notify(target.source, `You received $${amount}. Cash balance: $${cash}.${suffix}`);
            }
            log.info(`${ctx.actor.username} gave $${amount} to ${target.username} (account ${target.accountId}). Reason: ${reason || 'not provided'}`);
        },
    },
    {
        name: 'giveitem', label: 'Give item', description: 'Add an item to a player’s database inventory.', level: 3, category: 'Economy',
        arguments: [ID, arg('item', 'Item name'), arg('amount', 'Quantity')],
        run: async ({ args, reply }) => {
            const item = (args[1] ?? '').toLowerCase();
            if (!/^[\w-]{1,48}$/.test(item)) fail('Usage: /giveitem [database ID] [item] [quantity]');
            const amount = parseIntStrict(args[2], 1, 1_000_000) ?? fail('Quantity must be a whole number between 1 and 1,000,000.');
            const account = await requireAccount(args[0]);
            await db.update(
                'INSERT INTO user_inventory (user_id, item_name, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + VALUES(amount)',
                [account.id, item, amount],
            );
            reply(`Added ${amount} x ${item} to ${account.username} (ID ${account.id}).`);
            notifyAccount(account.id, `You received ${amount} x ${item}.`);
        },
    },
    {
        name: 'setjob', label: 'Set job', description: 'Set a player’s saved job and grade.', level: 2, category: 'Economy',
        arguments: [ID, arg('job', 'Job name'), arg('grade', 'Grade')],
        run: async ({ args, reply }) => {
            const job = (args[1] ?? '').toLowerCase();
            if (!/^\w{1,48}$/.test(job)) fail('Usage: /setjob [database ID] [job] [grade]');
            const grade = parseIntStrict(args[2], 0, 1000) ?? fail('Job grade must be a whole number from 0 to 1000.');
            const account = await requireAccount(args[0]);
            const changed = await db.update('UPDATE users SET job = ?, job_grade = ? WHERE id = ?', [job, grade, account.id]);
            if (changed === 0) fail(`${account.username} already has that job and grade.`);
            reply(`Set ${account.username} (ID ${account.id}) to ${job}, grade ${grade}.`);
            notifyAccount(account.id, `Your job is now ${job} (grade ${grade}).`);
        },
    },
    {
        name: 'clearinv', label: 'Clear inventory', description: 'Remove all saved items from a player.', level: 4, category: 'Economy', arguments: [ID],
        run: async ({ args, reply }) => {
            const account = await requireAccount(args[0]);
            await db.update('DELETE FROM user_inventory WHERE user_id = ?', [account.id]);
            reply(`Cleared the inventory for ${account.username} (ID ${account.id}).`);
            notifyAccount(account.id, 'An admin cleared your inventory.');
        },
    },

    // ── Server ──────────────────────────────────────────────────────────────
    {
        name: 'setadmin', label: 'Set admin level', description: `Change a player’s admin level (0–${MAX_ADMIN_LEVEL}).`, level: 6, category: 'Server',
        arguments: [ID, arg('level', `Admin level (0–${MAX_ADMIN_LEVEL})`)],
        run: async ({ actor, args, reply }) => {
            const level = parseIntStrict(args[1], 0, MAX_ADMIN_LEVEL) ?? fail(`Admin level must be a whole number from 0 to ${MAX_ADMIN_LEVEL}.`);
            if (level > actor.admin || (level === actor.admin && actor.admin < MAX_ADMIN_LEVEL)) fail('You may only assign an admin level below your own.');
            const account = await requireAccount(args[0]);
            if (account.id === actor.id) fail('You cannot change your own admin level.');
            assertOutranks(actor.admin, account.admin, 'change');

            const changed = await db.update('UPDATE users SET admin = ? WHERE id = ?', [level, account.id]);
            if (changed === 0) fail(`${account.username} already has admin level ${level}.`);
            reply(`Set ${account.username} (ID ${account.id}) to admin level ${level}.`);
            const online = notifyAccount(account.id, `Your admin level is now ${level}.`);
            if (online !== undefined) Core.patchAccount(online, { admin: level });
        },
    },
    {
        name: 'announce', label: 'Global announcement', description: 'Show a message on everyone\'s screen and in chat.', level: 4, category: 'Server',
        arguments: [arg('message', 'Announcement')], arity: 'min',
        run: (ctx) => {
            const message = rest(ctx, 0);
            if (message.length > 240) fail('Usage: /announce [message, up to 240 characters]');
            // Big on-screen banner for everyone (like SA-MP GameText), plus the chat line.
            action(-1, { type: 'announce', title: 'ANNOUNCEMENT', message, author: ctx.actor.username });
            sendChat(-1, 'ANNOUNCEMENT', `[${ctx.actor.username}] ${message}`);
            log.info(`Announcement by ${ctx.actor.username}: ${message}`);
        },
    },
];
