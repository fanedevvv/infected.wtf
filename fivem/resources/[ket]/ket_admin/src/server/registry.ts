import type { AdminCommand } from './command.ts';
import { ADMIN_COMMANDS } from './commands.ts';
import { CHAT_COMMANDS } from './staff/chat.ts';
import { HELPER_COMMANDS } from './staff/helpers.ts';
import { QUESTION_COMMANDS } from './staff/questions.ts';
import './staff/support.ts'; // registers the /questions and /tickets menu RPC

/** Every staff/admin command, in menu order. */
export const COMMANDS: AdminCommand[] = [...ADMIN_COMMANDS, ...CHAT_COMMANDS, ...QUESTION_COMMANDS, ...HELPER_COMMANDS];
export const COMMANDS_BY_NAME = new Map(COMMANDS.map((command) => [command.name, command]));

const duplicates = COMMANDS.map((command) => command.name).filter((name, index, names) => names.indexOf(name) !== index);
if (duplicates.length > 0) throw new Error(`Duplicate command names: ${duplicates.join(', ')}`);
