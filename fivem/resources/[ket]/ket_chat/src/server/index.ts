import { isString } from '@shared/common/validate.ts';
import { chatAs } from '@shared/server/chat.ts';
import { Core } from '@shared/server/core.ts';
import { emitClient, onClient, onPlayerDropped } from '@shared/server/events.ts';
import { distance3, getPlayerIds } from '@shared/server/players.ts';
import { onRpc } from '@shared/server/rpc.ts';
import { MAX_MESSAGE_LENGTH, MESSAGE_COOLDOWN_MS, PROXIMITY_RADIUS } from '../common/config.ts';

const COMMAND_NAME = /^[\w:-]{1,64}$/;
const lastMessageAt = new Map<number, number>();
const system = chatAs('SYSTEM');

onPlayerDropped((src) => lastMessageAt.delete(src));

onClient('ket_chat:send', (src, input) => {
    if (!isString(input, MAX_MESSAGE_LENGTH * 2)) return;
    const message = input.trim();
    if (message === '' || message.length > MAX_MESSAGE_LENGTH || message.startsWith('/')) return;

    const now = GetGameTimer();
    if (now - (lastMessageAt.get(src) ?? -Infinity) < MESSAGE_COOLDOWN_MS) return;
    lastMessageAt.set(src, now);

    const author = Core.getUsername(src);
    if (!author) return; // not signed in

    const chat = { args: [author, message], multiline: true };
    const origin = GetEntityCoords(GetPlayerPed(String(src)));
    for (const target of getPlayerIds()) {
        const ped = GetPlayerPed(String(target));
        if (target === src || (ped !== 0 && distance3(origin, GetEntityCoords(ped)) <= PROXIMITY_RADIUS)) {
            emitClient('chat:addMessage', target, chat);
        }
    }
});

onRpc(
    'ket_chat:commandExists',
    (_src, name) => {
        if (typeof name !== 'string' || !COMMAND_NAME.test(name)) return false;
        const wanted = name.toLowerCase();
        return (GetRegisteredCommands() as { name: string }[]).some((command) => command.name.toLowerCase() === wanted);
    },
    { cooldownMs: 100 },
);

/** /clearall — clears chat for everyone (admin 1+). Players use the client-side /clearchat. */
RegisterCommand(
    'clearall',
    (src: number) => {
        if (src !== 0 && !Core.isAdmin(src, 1)) return system(src, 'You do not have permission to use this command.');
        emitClient('chat:clear', -1);
    },
    false,
);
