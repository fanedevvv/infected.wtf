import type { ChatMessage, ChatSuggestion } from '@shared/common/types.ts';

export type ChatNuiMessage =
    | { type: 'init'; messages: ChatMessage[]; suggestions: ChatSuggestion[]; color: string; paused: boolean }
    | { type: 'message'; message: ChatMessage }
    | { type: 'suggestions'; suggestions: ChatSuggestion[] }
    | { type: 'open' }
    | { type: 'clear' }
    | { type: 'paused'; paused: boolean }
    | { type: 'accent'; color: string };
