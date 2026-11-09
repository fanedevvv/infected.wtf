import { MAX_ADMIN_LEVEL } from '@shared/common/constants.ts';
import { log } from '@shared/common/log.ts';
import type { Account } from '@shared/common/types.ts';
import { isStringArray } from '@shared/common/validate.ts';
import { addSuggestion } from '@shared/server/chat.ts';
import { Core } from '@shared/server/core.ts';
import { emitClient, onClient, onLocal } from '@shared/server/events.ts';
import { distance3 } from '@shared/server/players.ts';
import { canUse, describe, HELPERS_ONLY, usage, type AdminCommand } from './command.ts';
import { COMMANDS, COMMANDS_BY_NAME } from './registry.ts';
import { CommandError, notify } from './context.ts';

const MAX_ARGS = 8;
const MAX_ARG_LENGTH = 240;
const ENTITY_TYPE_VEHICLE = 2;

function arityOk(command: AdminCommand, count: number): boolean {
    const required = command.arguments.filter((argument) => !argument.optional).length;
    return command.arity === 'min' ? count >= required : count >= required && count <= command.arguments.length;
}

/** Commands that also work from the server / txAdmin console (they don't need the caller's ped). */
const CONSOLE_COMMANDS = new Set([
    'setadmin', 'kick', 'ban', 'unban', 'warn', 'announce', 'givemoney', 'giveitem', 'setjob', 'clearinv', 'respawn', 'heal', 'freeze', 'unfreeze',
    'a', 'sethelper', 'history', 'hnote', 'hactivity', 'checkid', 'reports', 'clearreport', 'ar',
]);

/** The console acts as an account above every admin level. */
const CONSOLE_ACTOR: Account = {
    id: '0',
    username: 'Console',
    level: 0,
    admin: MAX_ADMIN_LEVEL + 1,
    helper: 0,
    cash: '0',
    bank: '0',
    skin: '',
    settings: { hudColor: '', showFps: false, showOwnNameTag: false, metricSpeed: true },
};

/** Single entry point for chat commands, the admin menu and the console: permission → arity → handler. */
async function run(source: number, name: string, args: string[]): Promise<void> {
    const command = COMMANDS_BY_NAME.get(name);
    const fromConsole = source === 0;
    const reply = fromConsole ? (message: string) => log.info(message) : (message: string) => notify(source, message);

    if (fromConsole && (!command || !CONSOLE_COMMANDS.has(name))) return log.warn(`/${name} can only be used in-game by a signed-in admin.`);
    const actor = fromConsole ? CONSOLE_ACTOR : Core.getAccount(source);
    if (!command || !actor || !canUse(actor, command)) return reply('You do not have permission to use this command.');
    if (!arityOk(command, args.length)) return reply(usage(command));

    try {
        await command.run({ source, actor, args, reply });
    } catch (error) {
        if (error instanceof CommandError) return reply(error.message);
        log.error(`/${name} failed for ${actor.username}:`, error);
        reply('That command failed. Check the server console.');
    }
}

for (const command of COMMANDS) {
    RegisterCommand(command.name, (source: number, args: string[]) => void run(source, command.name, args), false);
}

RegisterCommand(
    'admin',
    (source: number) => {
        if (source === 0) return log.warn('/admin can only be used by a player.');
        const level = Core.getAdminLevel(source);
        if (level < 1) return notify(source, 'You do not have permission to use this command.');
        emitClient('ket_admin:open', source, COMMANDS.filter((command) => command.level >= 1 && level >= command.level).map(describe), level);
    },
    false,
);

onClient('ket_admin:execute', (source, name, args) => {
    if (typeof name !== 'string' || !isStringArray(args, MAX_ARGS, MAX_ARG_LENGTH)) return notify(source, 'Invalid command input.');
    const trimmed = args.map((argument) => argument.trim());
    while (trimmed.at(-1) === '') trimmed.pop();
    void run(source, name, trimmed);
});

onClient('ket_admin:deleteVehicle', (source, netId) => {
    if (!Core.isAdmin(source, 1)) return notify(source, 'You do not have permission to use this command.');
    if (!Number.isSafeInteger(netId) || (netId as number) < 1) return notify(source, 'Invalid vehicle.');
    const vehicle = NetworkGetEntityFromNetworkId(netId as number);
    if (vehicle === 0 || !DoesEntityExist(vehicle) || GetEntityType(vehicle) !== ENTITY_TYPE_VEHICLE) return notify(source, 'Vehicle not found.');
    if (distance3(GetEntityCoords(vehicle), GetEntityCoords(GetPlayerPed(String(source)))) > 10) return notify(source, 'That vehicle is too far away.');
    DeleteEntity(vehicle);
    notify(source, 'Vehicle deleted.');
});

/** Chat suggestions only for the commands a player may actually use (players, helpers, admins). */
const syncedRank = new Map<number, string>();

const rankKey = (account: Pick<Account, 'admin' | 'helper'>) => `${account.admin}:${account.helper}`;

function requirement(command: AdminCommand): string {
    if (command.level === 0) return '';
    if (command.level >= HELPERS_ONLY) return ` (helper ${command.helper}+)`;
    return command.helper !== undefined ? ` (helper ${command.helper}+ / admin ${command.level}+)` : ` (admin ${command.level}+)`;
}

function syncSuggestions(source: number, account: Pick<Account, 'admin' | 'helper'>): void {
    syncedRank.set(source, rankKey(account));
    for (const command of COMMANDS) {
        const name = `/${command.name}`;
        if (!canUse(account, command)) {
            emitClient('chat:removeSuggestion', source, name);
            continue;
        }
        const params = command.arguments.map((argument) => ({ name: `{${argument.name}}`, help: argument.label }));
        addSuggestion(source, name, `${command.description}${requirement(command)}`, params);
    }
    if (account.admin >= 1) addSuggestion(source, '/admin', 'Open the admin control panel (admin level 1+).');
    else emitClient('chat:removeSuggestion', source, '/admin');
}

onLocal('ket:playerLoaded', (source, account) => syncSuggestions(source, account));
onLocal('ket:accountChanged', (source, account) => syncedRank.get(source) !== rankKey(account) && syncSuggestions(source, account));
onLocal('ket:playerUnloaded', (source) => syncedRank.delete(source));
for (const { source, admin, helper } of Core.online()) syncSuggestions(source, { admin, helper });
