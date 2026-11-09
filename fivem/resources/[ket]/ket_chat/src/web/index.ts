import type { ChatMessage, ChatSuggestion } from '@shared/common/types.ts';
import { isHexColor } from '@shared/common/validate.ts';
import { byId, el, setAccent } from '@shared/web/dom.ts';
import { notifyReady, onNuiMessage, postNui } from '@shared/web/nui.ts';
import type { ChatNuiMessage } from '../common/nui.ts';

const VISIBLE_MESSAGES = 8;
const FADE_AFTER_MS = 9_000;
const MAX_SUGGESTIONS = 6;

const chat = byId('chat');
const messages = byId('messages');
const composer = byId('composer');
const input = byId<HTMLInputElement>('message-input');
const suggestionList = byId('suggestions');

let suggestions: ChatSuggestion[] = [];
let fadeTimer: number | undefined;
let paused = false;

const isComposing = () => composer.classList.contains('open');

function scheduleFade(): void {
    clearTimeout(fadeTimer);
    if (paused || isComposing()) return;
    fadeTimer = window.setTimeout(() => chat.classList.remove('active'), FADE_AFTER_MS);
}

function setPaused(next: boolean): void {
    paused = next;
    document.body.classList.toggle('paused', paused);
    clearTimeout(fadeTimer);
    if (!paused && messages.childElementCount > 0) scheduleFade();
}

function renderMessage({ args, segments, color }: ChatMessage): void {
    const row = el('div', 'message');
    const parts = [...args];
    if (parts.length > 1) row.append(el('span', 'message-author', parts.shift()));

    const content = el('span', 'message-content');
    if (Array.isArray(segments) && segments.length > 0) {
        for (const segment of segments) {
            if (typeof segment?.text !== 'string') continue;
            const part = el('span', 'message-segment', segment.text);
            if (isHexColor(segment.color)) part.style.color = segment.color;
            content.append(part);
        }
    } else {
        content.textContent = parts.join(' ');
    }
    row.append(content);

    if (Array.isArray(color) && color.length >= 3) {
        const rgb = color.slice(0, 3).map((value) => Math.min(255, Math.max(0, Math.round(Number(value) || 0))));
        row.style.color = `rgb(${rgb.join(', ')})`;
    }

    messages.append(row);
    while (messages.childElementCount > VISIBLE_MESSAGES) messages.firstElementChild?.remove();
    chat.classList.add('active');
    scheduleFade();
}

function renderSuggestions(): void {
    const query = input.value.trim().split(/\s/, 1)[0]?.toLowerCase() ?? '';
    const matching = query.startsWith('/')
        ? suggestions.filter((suggestion) => suggestion.name.toLowerCase().startsWith(query)).slice(0, MAX_SUGGESTIONS)
        : [];

    suggestionList.replaceChildren(
        ...matching.map((suggestion) => {
            const row = el('div', 'suggestion');
            row.append(el('span', 'suggestion-name', suggestion.name));
            const params = suggestion.params.map((param) => (typeof param === 'string' ? param : param?.name)).filter(Boolean).join(' ');
            const detail = [params, suggestion.help].filter(Boolean).join(' — ');
            if (detail) row.append(el('span', 'suggestion-params', detail));
            return row;
        }),
    );
    suggestionList.classList.toggle('open', matching.length > 0);
}

function openComposer(): void {
    clearTimeout(fadeTimer);
    chat.classList.add('active');
    composer.classList.add('open');
    input.value = '';
    suggestionList.classList.remove('open');
    input.focus();
}

function closeComposer(): void {
    composer.classList.remove('open');
    suggestionList.classList.remove('open');
    input.blur();
    postNui('close').catch((error) => console.error('[ket_chat] close failed', error));
    if (messages.childElementCount === 0) chat.classList.remove('active');
    else scheduleFade();
}

async function submit(): Promise<void> {
    const message = input.value.trim();
    input.value = '';
    if (message) await postNui('submit', { message }).catch((error) => console.error('[ket_chat] submit failed', error));
    closeComposer();
}

input.addEventListener('input', renderSuggestions);
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        void submit();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        closeComposer();
    } else if (event.key === 'Tab') {
        const first = suggestionList.querySelector('.suggestion-name');
        if (!first) return;
        event.preventDefault();
        input.value = `${first.textContent} `;
        renderSuggestions();
    }
});

function clear(): void {
    messages.replaceChildren();
    chat.classList.remove('active');
}

onNuiMessage<ChatNuiMessage>({
    init: (data) => {
        messages.replaceChildren();
        data.messages.forEach(renderMessage);
        suggestions = data.suggestions;
        setAccent('chat-accent', data.color);
        setPaused(data.paused);
    },
    message: ({ message }) => renderMessage(message),
    suggestions: (data) => {
        suggestions = data.suggestions;
        if (isComposing()) renderSuggestions();
    },
    open: openComposer,
    clear,
    paused: ({ paused }) => setPaused(paused),
    accent: ({ color }) => setAccent('chat-accent', color),
});

notifyReady();
