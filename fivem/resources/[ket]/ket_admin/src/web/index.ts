import type { AdminCommandInfo } from '@shared/common/types.ts';
import { byId, el } from '@shared/web/dom.ts';
import { onNuiMessage, postNui } from '@shared/web/nui.ts';
import type { AdminNuiMessage, ExecuteRequest, VehicleCategory, VehicleEntry } from '../common/nui.ts';

const ALL = 'All';

const panel = byId('panel');
const categoryList = byId('categories');
const cardList = byId('commands');
const form = byId<HTMLFormElement>('command-form');
const fields = byId('fields');
const search = byId<HTMLInputElement>('search');
const empty = byId('empty');
const submitButton = form.querySelector<HTMLButtonElement>('.submit-button')!;

type Mode = 'commands' | 'cars';
let mode: Mode = 'commands';
let category = ALL;

let commands: AdminCommandInfo[] = [];
let selected: AdminCommandInfo | undefined;

let vehicleCategories: VehicleCategory[] = [];
let vehicles: VehicleEntry[] = [];

const close = () => postNui('close').catch((error) => console.error('[ket_admin] close failed', error));
const execute = (request: ExecuteRequest) => postNui('execute', request);

function setChrome(next: Mode, level: number): void {
    mode = next;
    const cars = mode === 'cars';
    byId('brand-eyebrow').textContent = cars ? 'VEHICLES' : 'SERVER CONTROL';
    byId('brand-title').textContent = cars ? 'Car list' : 'Administration';
    byId('footer-text').textContent = cars ? 'Click a vehicle to spawn it. Spawning is verified by the server.' : 'Commands are verified by the server before execution.';
    byId('level').textContent = `ADMIN ${level}`;
    search.hidden = !cars;
    search.value = '';
    deselect();
    document.body.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
}

function deselect(): void {
    selected = undefined;
    form.hidden = true;
}

function tabButton(id: string, label: string, count: number, extraClass = ''): HTMLButtonElement {
    const button = el('button', `category-button${id === category ? ' active' : ''}${extraClass}`);
    button.type = 'button';
    button.append(el('span', undefined, label), el('small', undefined, String(count)));
    button.addEventListener('click', () => {
        category = id;
        search.value = '';
        deselect();
        render();
    });
    return button;
}

// ── Commands mode ─────────────────────────────────────────────────────────
function renderCommandTabs(): void {
    const names = [ALL, ...new Set(commands.map((command) => command.category))];
    categoryList.replaceChildren(
        ...names.map((name) => tabButton(name, name, name === ALL ? commands.length : commands.filter((command) => command.category === name).length)),
    );
}

function renderCommands(): void {
    const visible = category === ALL ? commands : commands.filter((command) => command.category === category);
    byId('category-title').textContent = category === ALL ? 'Commands' : category;
    byId('count').textContent = `${visible.length} available`;
    empty.hidden = true;
    cardList.replaceChildren(
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

// ── Cars mode ─────────────────────────────────────────────────────────────
const inCategory = (vehicle: VehicleEntry, id: string) => (id === 'custom' ? vehicle.custom : String(vehicle.classId) === id);

function renderVehicleTabs(): void {
    categoryList.replaceChildren(
        ...vehicleCategories.map(({ id, label }) =>
            tabButton(id, label, vehicles.filter((vehicle) => inCategory(vehicle, id)).length, id === 'custom' ? ' custom' : ''),
        ),
    );
}

function renderVehicles(): void {
    const query = search.value.trim().toLowerCase();
    const visible = query
        ? vehicles.filter((vehicle) => [vehicle.name, vehicle.model, vehicle.make].some((value) => value.toLowerCase().includes(query)))
        : vehicles.filter((vehicle) => inCategory(vehicle, category));

    byId('category-title').textContent = query ? 'Search results' : (vehicleCategories.find((item) => item.id === category)?.label ?? '');
    byId('count').textContent = `${visible.length} vehicle${visible.length === 1 ? '' : 's'}`;
    empty.hidden = visible.length > 0;
    empty.textContent = query
        ? `No vehicles match “${search.value.trim()}”.`
        : 'No custom cars yet. Add a car resource to resources/[cars]/ with ket_vehicle in its fxmanifest.';

    cardList.replaceChildren(
        ...visible.map((vehicle) => {
            const card = el('button', 'command-card vehicle-card');
            card.type = 'button';
            const title = el('span', 'card-title');
            const name = el('span', 'command-name', vehicle.name);
            if (vehicle.custom) name.append(el('span', 'custom-badge', 'CUSTOM'));
            title.append(name, el('span', 'vehicle-model', vehicle.model));
            card.append(title, el('span', 'command-description', vehicle.make || '—'));
            card.title = `Spawn ${vehicle.name}`;
            card.addEventListener('click', async () => {
                await execute({ command: 'car', args: [vehicle.model] }).catch((error) => console.error('[ket_admin] spawn failed', error));
                void close();
            });
            return card;
        }),
    );
}

function render(): void {
    if (mode === 'cars') {
        renderVehicleTabs();
        renderVehicles();
    } else {
        renderCommandTabs();
        renderCommands();
    }
}

search.addEventListener('input', () => renderVehicles());

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
    try {
        await execute({ command: selected.name, args });
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
        setChrome('commands', message.level);
        render();
    },
    carlist: (message) => {
        vehicleCategories = message.categories;
        vehicles = message.vehicles;
        category = 'custom'; // CUSTOM is always the first, highlighted tab
        setChrome('cars', message.level);
        render();
        search.focus();
    },
    close: () => {
        document.body.classList.remove('visible');
        panel.setAttribute('aria-hidden', 'true');
    },
});
