import type { AdminCommandInfo } from '@shared/common/types.ts';
import { byId, el } from '@shared/web/dom.ts';
import { onNuiMessage, postNui } from '@shared/web/nui.ts';
import type { AdminNuiMessage, ExecuteRequest } from '../common/nui.ts';

const ALL = 'All';

const panel = byId('panel');
const categoryList = byId('categories');
const commandList = byId('commands');
const form = byId<HTMLFormElement>('command-form');
const fields = byId('fields');
const submitButton = form.querySelector<HTMLButtonElement>('.submit-button')!;

let commands: AdminCommandInfo[] = [];
let category = ALL;
let selected: AdminCommandInfo | undefined;

const close = () => postNui('close').catch((error) => console.error('[ket_admin] close failed', error));

function deselect(): void {
    selected = undefined;
    form.hidden = true;
}

function renderCategories(): void {
    const names = [ALL, ...new Set(commands.map((command) => command.category))];
    categoryList.replaceChildren(
        ...names.map((name) => {
            const button = el('button', `category-button${name === category ? ' active' : ''}`);
            button.type = 'button';
            const count = name === ALL ? commands.length : commands.filter((command) => command.category === name).length;
            button.append(el('span', undefined, name), el('small', undefined, String(count)));
            button.addEventListener('click', () => {
                category = name;
                deselect();
                render();
            });
            return button;
        }),
    );
}

function renderCommands(): void {
    const visible = category === ALL ? commands : commands.filter((command) => command.category === category);
    byId('category-title').textContent = category === ALL ? 'Commands' : category;
    byId('count').textContent = `${visible.length} available`;
    commandList.replaceChildren(
        ...visible.map((command) => {
            const card = el('button', `command-card${selected?.name === command.name ? ' selected' : ''}`);
            card.type = 'button';
            const title = el('span', 'card-title');
            title.append(el('span', 'command-name', `/${command.name}`), el('span', 'admin-rank', `ADMIN ${command.level}+`));
            card.append(title, el('span', 'command-description', command.description));
            card.addEventListener('click', () => select(command));
            return card;
        }),
    );
}

function select(command: AdminCommandInfo): void {
    selected = command;
    byId('form-title').textContent = `/${command.name}`;
    byId('form-description').textContent = command.description;
    fields.replaceChildren(
        ...command.arguments.map((argument) => {
            const label = el('label', 'field', argument.label);
            const input = el('input');
            input.name = argument.name;
            input.autocomplete = 'off';
            input.required = !argument.optional;
            input.maxLength = 240;
            label.append(input);
            return label;
        }),
    );
    form.hidden = false;
    renderCommands();
    (fields.querySelector('input') ?? submitButton).focus();
}

function render(): void {
    renderCategories();
    renderCommands();
}

byId('close').addEventListener('click', close);
byId('cancel').addEventListener('click', () => {
    deselect();
    renderCommands();
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selected || !form.reportValidity()) return;
    const args = [...fields.querySelectorAll('input')].map((input) => input.value.trim());
    while (args.at(-1) === '') args.pop();
    const request: ExecuteRequest = { command: selected.name, args };
    try {
        await postNui('execute', request);
        form.reset();
        deselect();
        renderCommands();
    } catch (error) {
        console.error('[ket_admin] execute failed', error);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('visible')) void close();
});

onNuiMessage<AdminNuiMessage>({
    open: (message) => {
        commands = message.commands;
        category = ALL;
        deselect();
        byId('level').textContent = `ADMIN ${message.level}`;
        document.body.classList.add('visible');
        panel.setAttribute('aria-hidden', 'false');
        render();
    },
    close: () => {
        document.body.classList.remove('visible');
        panel.setAttribute('aria-hidden', 'true');
    },
});
