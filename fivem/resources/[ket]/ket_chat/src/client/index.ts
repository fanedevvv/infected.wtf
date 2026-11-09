import { DEFAULT_ACCENT } from '@shared/common/constants.ts';
import type { ChatMessage, ChatSuggestion } from '@shared/common/types.ts';
import { isString } from '@shared/common/validate.ts';
import { watchAccount, whenSpawned } from '@shared/client/core.ts';
import { emitServer, onResourceStop, onServer } from '@shared/client/events.ts';
import { notify } from '@shared/client/game.ts';
import { onNui, sendNui, setNuiFocus } from '@shared/client/nui.ts';
import { callServer } from '@shared/client/rpc.ts';
import { HISTORY_LIMIT, MAX_MESSAGE_LENGTH } from '../common/config.ts';
import type { ChatNuiMessage } from '../common/nui.ts';

let ready = false;
let open = false;
let paused = false;
let accent = DEFAULT_ACCENT;
const history: ChatMessage[] = [];
const suggestions = new Map<string, ChatSuggestion>();

const send = (message: ChatNuiMessage) => ready && sendNui(message);
const sendSuggestions = () => send({ type: 'suggestions', suggestions: [...suggestions.values()] });

function openChat(): void {
    if (open || IsPauseMenuActive()) return;
    open = true;
    setNuiFocus(true);
    send({ type: 'open' });
}

RegisterCommand('ket_chat_open', openChat, false);
RegisterKeyMapping('ket_chat_open', 'Open chat', 'keyboard', 'T');

RegisterCommand(
    'clearchat',
    () => {
        history.length = 0;
        send({ type: 'clear' });
    },
    false,
);

/** Normalizes anything other resources send through chat:addMessage. */
function toMessage(input: unknown): ChatMessage {
    if (typeof input !== 'object' || input === null) return { args: [String(input)] };
    const raw = input as Partial<ChatMessage> & { message?: unknown };
    const args = Array.isArray(raw.args) ? raw.args.map((part) => String(part ?? '')) : [String(raw.message ?? '')];
    return { ...raw, args };
}

function addMessage(input: unknown): void {
    const message = toMessage(input);
    history.push(message);
    if (history.length > HISTORY_LIMIT) history.shift();
    send({ type: 'message', message });
}

const toSuggestion = (name: unknown, help: unknown, params: unknown): ChatSuggestion | undefined =>
    isString(name, 64, 1)
        ? { name, help: isString(help) ? help : '', params: Array.isArray(params) ? (params as ChatSuggestion['params']) : [] }
        : undefined;

onServer('chat:addMessage', addMessage);
onServer('chat:clear', () => {
    history.length = 0;
    send({ type: 'clear' });
});
onServer('chat:addSuggestion', (name, help, params) => {
    const suggestion = toSuggestion(name, help, params);
    if (!suggestion) return;
    suggestions.set(suggestion.name, suggestion);
    sendSuggestions();
});
onNet('chat:addSuggestions', (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items as Record<string, unknown>[]) {
        const suggestion = toSuggestion(item?.name, item?.help, item?.params);
        if (suggestion) suggestions.set(suggestion.name, suggestion);
    }
    sendSuggestions();
});
onServer('chat:removeSuggestion', (name) => {
    if (suggestions.delete(name)) sendSuggestions();
});

const isClientCommand = (name: string) => {
    const wanted = name.toLowerCase();
    return (GetRegisteredCommands() as { name: string }[]).some((command) => command.name.toLowerCase() === wanted);
};

async function runCommand(command: string): Promise<void> {
    const name = command.split(/\s/, 1)[0] ?? '';
    if (isClientCommand(name)) return ExecuteCommand(command);
    try {
        if (await callServer('ket_chat:commandExists', [name], 5_000)) ExecuteCommand(command);
        else notify('SYSTEM', `Unknown command: /${name}. Type / to see suggestions.`);
    } catch {
        notify('SYSTEM', `Could not verify /${name}. Please try again.`);
    }
}

onNui('ready', () => {
    ready = true;
    send({ type: 'init', messages: history, suggestions: [...suggestions.values()], color: accent, paused });
});

onNui<{ message?: unknown }>('submit', ({ message }) => {
    if (!isString(message)) return { ok: false };
    const text = message.trim();
    if (text.startsWith('/')) {
        const command = text.slice(1).trim();
        if (command) void runCommand(command);
    } else if (text && text.length <= MAX_MESSAGE_LENGTH) {
        emitServer('ket_chat:send', text);
    }
    return { ok: true };
});

onNui('close', () => {
    open = false;
    setNuiFocus(false);
});

watchAccount(({ settings }) => {
    if (settings.hudColor === accent) return;
    accent = settings.hudColor;
    send({ type: 'accent', color: accent });
});

whenSpawned(() => addMessage({ args: ['SYSTEM', 'Local chat ready. Press T to talk.'], multiline: true }));

setInterval(() => {
    const next = IsPauseMenuActive();
    if (next !== paused) send({ type: 'paused', paused: (paused = next) });
}, 250);

onResourceStop(() => open && setNuiFocus(false));
