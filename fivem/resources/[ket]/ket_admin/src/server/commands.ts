import { MAX_ADMIN_LEVEL } from '@shared/common/constants.ts';
import type { AdminAction, AdminSelfAction } from '@shared/common/contracts.ts';
import type { AdminArgument, AdminCommandInfo } from '@shared/common/types.ts';
import { parseIntStrict } from '@shared/common/validate.ts';
import { Core } from '@shared/server/core.ts';
import { db } from '@shared/server/db.ts';
import { emitClient } from '@shared/server/events.ts';
import { getPedCoords } from '@shared/server/players.ts';
import { sendChat } from '@shared/server/chat.ts';
import { log } from '@shared/common/log.ts';
import { customVehicles } from './vehicles.ts';
import { fail, notify, notifyAccount, requireAccount, requireOnline, rest, type CommandContext } from './context.ts';

export interface AdminCommand extends AdminCommandInfo {
    /** Exact argument count (default: arguments.length). `'min'` allows trailing free text. */
    arity?: 'exact' | 'min';
    run: (context: CommandContext) => void | Promise<void>;
}

const action = (target: number, payload: AdminAction) => emitClient('ket_admin:action', target, payload);

const ID: AdminArgument = { name: 'id', label: 'Database ID' };
const arg = (name: string, label: string, optional = false): AdminArgument => ({ name, label, ...(optional && { optional }) });

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
    if (target.source !== source) notify(target.source, frozen ? 'An admin froze you.' : 'An admin unfroze you.');
}

function bring({ source, args, reply }: CommandContext): void {
    const target = requireOnline(args[0]);
    action(target.source, { type: 'teleport', ...getPedCoords(source) });
    reply(`Brought ${target.username} to you.`);
    if (target.source !== source) notify(target.source, 'An admin teleported you to them.');
}

/** Denies acting on accounts with an equal or higher admin level. */
function assertOutranks(actorLevel: number, targetLevel: number, verb: string): void {
    if (targetLevel >= actorLevel) fail(`You cannot ${verb} an administrator with an equal or higher level.`);
}

export const COMMANDS: AdminCommand[] = [
    // ── Teleport ────────────────────────────────────────────────────────────
    {
        name: 'goto', label: 'Teleport to player', description: 'Teleport to a player.', level: 2, category: 'Teleport', arguments: [ID],
        run: ({ source, args, reply }) => {
            const target = requireOnline(args[0]);
            action(source, { type: 'teleport', ...getPedCoords(target.source) });
            reply(`Teleported to ${target.username}.`);
        },
    },
    { name: 'gethere', label: 'Bring player', description: 'Bring a player to you.', level: 2, category: 'Teleport', arguments: [ID], run: bring },
    { name: 'bring', label: 'Bring player (alias)', description: 'Alias for /gethere.', level: 2, category: 'Teleport', arguments: [ID], run: bring },
    selfAction('tpm', 'Teleport to waypoint', 'Teleport to your map waypoint.', 1, 'Teleport', 'waypoint'),

    // ── Player ──────────────────────────────────────────────────────────────
    { name: 'freeze', label: 'Freeze player', description: 'Freeze a player in place.', level: 1, category: 'Player', arguments: [ID], run: (ctx) => setFrozen(ctx, true) },
    { name: 'unfreeze', label: 'Unfreeze player', description: 'Unfreeze a player.', level: 1, category: 'Player', arguments: [ID], run: (ctx) => setFrozen(ctx, false) },
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
        name: 'spectate', label: 'Spectate player', description: 'Toggle spectating a player.', level: 1, category: 'Player', arguments: [ID],
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
        name: 'warn', label: 'Warn player', description: 'Record a warning for a player.', level: 1, category: 'Punishment',
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
        name: 'announce', label: 'Global announcement', description: 'Send a message to everyone online.', level: 4, category: 'Server',
        arguments: [arg('message', 'Announcement')], arity: 'min',
        run: (ctx) => {
            const message = rest(ctx, 0);
            if (message.length > 240) fail('Usage: /announce [message, up to 240 characters]');
            sendChat(-1, 'ANNOUNCEMENT', `[${ctx.actor.username}] ${message}`);
            log.info(`Announcement by ${ctx.actor.username}: ${message}`);
        },
    },
];

export const COMMANDS_BY_NAME = new Map(COMMANDS.map((command) => [command.name, command]));

/** The menu/suggestion view of a command (no handler). */
export const describe = ({ name, label, description, level, category, arguments: args }: AdminCommand): AdminCommandInfo => ({
    name,
    label,
    description,
    level,
    category,
    arguments: args,
});

/** "Usage: /ban {id} {days} {reason}" */
export const usage = (command: AdminCommand) =>
    `Usage: /${command.name}${command.arguments.map((argument) => ` [${argument.label}${argument.optional ? ' (optional)' : ''}]`).join('')}`;
