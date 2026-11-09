import { log } from '@shared/common/log.ts';
import { isStringArray } from '@shared/common/validate.ts';
import { addSuggestion } from '@shared/server/chat.ts';
import { Core } from '@shared/server/core.ts';
import { emitClient, onClient, onLocal } from '@shared/server/events.ts';
import { distance3 } from '@shared/server/players.ts';
import { COMMANDS, COMMANDS_BY_NAME, describe, usage, type AdminCommand } from './commands.ts';
import { CommandError, notify } from './context.ts';

const MAX_ARGS = 8;
const MAX_ARG_LENGTH = 240;
const ENTITY_TYPE_VEHICLE = 2;

function arityOk(command: AdminCommand, count: number): boolean {
    const required = command.arguments.filter((argument) => !argument.optional).length;
    return command.arity === 'min' ? count >= required : count >= required && count <= command.arguments.length;
}

/** Single entry point for chat commands and the admin menu: permission → arity → handler. */
async function run(source: number, name: string, args: string[]): Promise<void> {
    if (source === 0) return log.warn(`/${name} can only be used by a signed-in player.`);
    const command = COMMANDS_BY_NAME.get(name);
    const actor = Core.getAccount(source);
    if (!command || !actor || actor.admin < command.level) return notify(source, 'You do not have permission to use this command.');
    if (!arityOk(command, args.length)) return notify(source, usage(command));

    try {
        await command.run({ source, actor, args, reply: (message) => notify(source, message) });
    } catch (error) {
        if (error instanceof CommandError) return notify(source, error.message);
        log.error(`/${name} failed for ${actor.username}:`, error);
        notify(source, 'That command failed. Check the server console.');
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
        emitClient('ket_admin:open', source, COMMANDS.filter((command) => level >= command.level).map(describe), level);
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

/** Chat suggestions only for the commands a player may actually use. */
const syncedLevel = new Map<number, number>();

function syncSuggestions(source: number, level: number): void {
    syncedLevel.set(source, level);
    for (const command of COMMANDS) {
        const name = `/${command.name}`;
        if (level < command.level) {
            emitClient('chat:removeSuggestion', source, name);
            continue;
        }
        const params = command.arguments.map((argument) => ({ name: `{${argument.name}}`, help: argument.label }));
        addSuggestion(source, name, `${command.description} (admin ${command.level}+).`, params);
    }
    if (level >= 1) addSuggestion(source, '/admin', 'Open the admin control panel (admin level 1+).');
    else emitClient('chat:removeSuggestion', source, '/admin');
}

onLocal('ket:playerLoaded', (source, account) => account.admin > 0 && syncSuggestions(source, account.admin));
onLocal('ket:accountChanged', (source, account) => (syncedLevel.get(source) ?? 0) !== account.admin && syncSuggestions(source, account.admin));
onLocal('ket:playerUnloaded', (source) => syncedLevel.delete(source));
for (const { source, admin } of Core.online()) if (admin > 0) syncSuggestions(source, admin);
