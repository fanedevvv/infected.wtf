import type { ChatSegment } from '../common/types.ts';
import { emitClient } from './events.ts';

/** Sends `[author] text` to one player (or -1 for everyone). */
export function sendChat(target: number, author: string, text: string, segments?: ChatSegment[]): void {
    emitClient('chat:addMessage', target, { args: [author, text], multiline: true, ...(segments && { segments }) });
}

export const addSuggestion = (target: number, name: string, help: string, params: { name: string; help?: string }[] = []) =>
    emitClient('chat:addSuggestion', target, name, help, params);

/** Returns a `sendChat` bound to a fixed author label, e.g. `const notify = chatAs('ADMIN')`. */
export const chatAs = (author: string) => (target: number, text: string, segments?: ChatSegment[]) =>
    sendChat(target, author, text, segments);
