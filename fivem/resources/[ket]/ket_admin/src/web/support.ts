/** /questions and /tickets menus. Player-written text is only ever set as text, never as HTML. */
import type { SupportAction, SupportItem, SupportView } from '@shared/common/types.ts';
import { byId, el } from '@shared/web/dom.ts';
import { postNui } from '@shared/web/nui.ts';
import type { SupportResponse } from '../common/nui.ts';

const section = byId('support');
const status = byId('support-status');
const askForm = byId<HTMLFormElement>('ask-form');
const askText = byId<HTMLTextAreaElement>('ask-text');
const askCount = byId('ask-count');
const askSubmit = byId<HTMLButtonElement>('ask-submit');
const pending = byId('pending');
const queue = byId('queue');
const empty = byId('queue-empty');

const COPY = {
    question: {
        queueTitle: 'Questions', askTitle: 'Ask a helper', eyebrow: 'HELPERS',
        hint: 'Describe what you need help with. A helper will take your question and talk to you in chat (/ht).',
        placeholder: 'e.g. How do I rent a bike?', empty: 'No questions right now.',
        footerQueue: 'Take a question, then talk to the player with /ht [text].', footerAsk: 'Helpers answer in chat. Reply with /ht [text].',
    },
    ticket: {
        queueTitle: 'Tickets', askTitle: 'Open a ticket', eyebrow: 'ADMINS',
        hint: 'Report a problem or a player to the admins. You will get the answer in chat.',
        placeholder: 'e.g. Player 12 is spawn-killing at the bank.', empty: 'No open tickets.',
        footerQueue: 'Answer a ticket to send the reply to the player and close it.', footerAsk: 'Admins answer in chat.',
    },
} as const;

let current: SupportView | undefined;

function setStatus(message: string, ok = false): void {
    status.hidden = message === '';
    status.textContent = message;
    status.classList.toggle('ok', ok);
}

/** Sends an action; on success the server returns the fresh view. */
async function act(action: SupportAction, button?: HTMLButtonElement, success = ''): Promise<boolean> {
    if (button) button.disabled = true;
    try {
        const result = await postNui<SupportResponse>('support', action);
        if (!result.ok) {
            setStatus(result.error);
            return false;
        }
        render(result.data);
        setStatus(success, true);
        return true;
    } catch {
        setStatus('Could not reach the server. Please try again.');
        return false;
    } finally {
        if (button) button.disabled = false;
    }
}

const age = (minutes: number) => (minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`);

function button(label: string, className: string, onClick: (self: HTMLButtonElement) => void): HTMLButtonElement {
    const element = el('button', className, label);
    element.type = 'button';
    element.addEventListener('click', () => onClick(element));
    return element;
}

function questionActions(item: SupportItem, actions: HTMLElement): void {
    if (item.helper === null) actions.append(button('Accept', 'submit-button', (self) => void act({ op: 'accept', kind: 'question', id: item.id }, self, `You took question #${item.id}. Reply with /ht.`)));
    if (item.mine) actions.append(button('Close', 'submit-button', (self) => void act({ op: 'close', kind: 'question', id: item.id }, self, `Question #${item.id} closed.`)));
    if (item.helper === null || item.mine) {
        actions.append(
            button('Reject', 'ghost-button danger', (self) => {
                self.hidden = true;
                const row = el('div', 'reason');
                const input = el('input');
                input.placeholder = 'Reason for rejecting';
                input.maxLength = 200;
                const confirm = button('Reject', 'ghost-button danger', (b) => void act({ op: 'reject', kind: 'question', id: item.id, reason: input.value }, b, `Question #${item.id} rejected.`));
                input.addEventListener('keydown', (event) => event.key === 'Enter' && confirm.click());
                row.append(input, confirm);
                actions.append(row);
                input.focus();
            }),
        );
    }
}

function ticketActions(item: SupportItem, card: HTMLElement, actions: HTMLElement): void {
    const answer = el('textarea');
    answer.rows = 2;
    answer.maxLength = 200;
    answer.placeholder = 'Your answer to the player…';
    answer.dataset.answer = String(item.id);
    card.insertBefore(answer, actions);
    actions.append(
        button('Answer & close', 'submit-button', (self) => void act({ op: 'answer', kind: 'ticket', id: item.id, text: answer.value }, self, `Ticket #${item.id} answered.`)),
        button('Close without answer', 'ghost-button', (self) => void act({ op: 'dismiss', kind: 'ticket', id: item.id }, self, `Ticket #${item.id} closed.`)),
    );
}

function renderQueue(view: Extract<SupportView, { view: 'queue' }>): void {
    // Keep half-written ticket answers across live refreshes.
    const drafts = new Map<string, string>();
    for (const field of queue.querySelectorAll<HTMLTextAreaElement>('textarea[data-answer]')) {
        if (field.value) drafts.set(field.dataset.answer!, field.value);
    }

    queue.replaceChildren(
        ...view.items.map((item) => {
            const card = el('article', `item${item.mine ? ' mine' : ''}`);
            const head = el('div', 'item-head');
            head.append(el('span', 'id', `#${item.id}`), el('span', 'player', item.player), el('span', undefined, `ID ${item.playerId} · ${age(item.ageMinutes)}`));
            if (view.kind === 'question') {
                const badge = item.mine ? el('span', 'badge mine', 'YOURS') : item.helper ? el('span', 'badge taken', `TAKEN · ${item.helper}`) : el('span', 'badge', 'OPEN');
                head.append(badge);
            }
            const actions = el('div', 'item-actions');
            card.append(head, el('p', 'item-text', item.text), actions);
            if (view.kind === 'question') questionActions(item, actions);
            else ticketActions(item, card, actions);
            return card;
        }),
    );

    for (const [id, value] of drafts) {
        const field = queue.querySelector<HTMLTextAreaElement>(`textarea[data-answer="${id}"]`);
        if (field) field.value = value;
    }

    empty.hidden = view.items.length > 0;
    empty.textContent = COPY[view.kind].empty;
    byId('support-count').textContent = `${view.items.length} OPEN`;
}

function renderAsk(view: Extract<SupportView, { view: 'ask' }>): void {
    const copy = COPY[view.kind];
    askForm.hidden = view.pending !== null;
    pending.hidden = view.pending === null;
    if (view.pending) {
        const what = view.kind === 'question' ? 'question' : 'ticket';
        const state = view.pending.helper ? `${view.pending.helper} is helping you — reply in chat with /ht [text].` : `Waiting for ${view.kind === 'question' ? 'a helper' : 'an admin'}…`;
        pending.replaceChildren(el('strong', undefined, `Your ${what} #${view.pending.id}`), el('p', undefined, `"${view.pending.text}"`), el('p', undefined, state));
    } else {
        byId('ask-hint').textContent = copy.hint;
        askText.placeholder = copy.placeholder;
    }
    byId('support-count').textContent = '';
}

export function render(view: SupportView): void {
    current = view;
    const copy = COPY[view.kind];
    const isQueue = view.view === 'queue';
    byId('support-eyebrow').textContent = copy.eyebrow;
    byId('support-title').textContent = isQueue ? copy.queueTitle : copy.askTitle;
    byId('support-footer').textContent = isQueue ? copy.footerQueue : copy.footerAsk;
    queue.hidden = !isQueue;
    if (isQueue) {
        askForm.hidden = true;
        pending.hidden = true;
        renderQueue(view);
    } else {
        empty.hidden = true;
        queue.replaceChildren();
        renderAsk(view);
    }
}

/** Shows the menu (called when the client opens /questions or /tickets). */
export function showSupport(view: SupportView): void {
    const wasOpen = !section.hidden && current?.kind === view.kind;
    section.hidden = false;
    if (!wasOpen) {
        setStatus('');
        askText.value = '';
        askCount.textContent = '0 / 200';
    }
    render(view);
    if (view.view === 'ask' && !view.pending && !wasOpen) askText.focus();
}

export const hideSupport = () => {
    section.hidden = true;
    current = undefined;
};

askText.addEventListener('input', () => (askCount.textContent = `${askText.value.length} / 200`));
askForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!current) return;
    const kind = current.kind;
    if (await act({ op: 'create', kind, text: askText.value }, askSubmit, kind === 'question' ? 'Question sent to the helpers.' : 'Ticket sent to the admins.')) askText.value = '';
});

byId('support-close').addEventListener('click', () => void postNui('close').catch(() => undefined));
