import { byId, el, setAccent } from '@shared/web/dom.ts';
import { notifyReady, onNuiMessage, postNui } from '@shared/web/nui.ts';
import { FISHING_RULES, JOBS, type JobId, type JobInfo } from '../common/config.ts';
import type { JobsNuiMessage } from '../common/nui.ts';

/** Inline icons (no external icon fonts). */
const ICONS: Record<JobId, string> = {
    fisherman: '<path d="M3 12c3-5 9-6 14-2l4-3v10l-4-3c-5 4-11 3-14-2Z"/><circle cx="15" cy="11" r=".8"/>',
    trucker: '<path d="M2 7h11v9H2zM13 10h5l3 3v3h-8z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    miner: '<path d="M14 4c3 0 6 2 7 5-4-2-9-2-13 0 1-3 3-5 6-5Z"/><path d="M11 9 3 21"/>',
    lumberjack: '<path d="M12 2 6 11h3l-4 6h14l-4-6h3Z"/><path d="M12 17v5"/>',
    garbage: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
    pizza: '<path d="M12 3 3 20c6 2 12 2 18 0Z"/><circle cx="11" cy="12" r="1.2"/><circle cx="14" cy="16" r="1.2"/>',
};

// ── Jobs menu ───────────────────────────────────────────────────────────────
const menu = byId('menu');
const jobsList = byId('jobs');
const current = byId('current');

function icon(job: JobId): HTMLElement {
    const box = el('span', 'job-icon');
    // Static markup from ICONS above (not user input).
    box.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[job]}</svg>`;
    return box;
}

function jobCard(job: JobInfo, currentJob: string): HTMLElement {
    const mine = job.id === currentJob;
    const card = el('article', `job ${job.available ? 'available' : 'soon'}${mine ? ' mine' : ''}`);
    const top = el('div', 'job-top');
    const title = el('div');
    title.append(el('div', 'job-name', job.name), el('div', 'job-pay', job.pay));
    top.append(icon(job.id), title);
    card.append(top, el('p', 'job-desc', job.description));
    if (mine) card.append(el('span', 'badge', 'YOUR JOB'));
    else if (!job.available) card.append(el('span', 'badge soon', 'SOON'));

    const actions = el('div', 'job-actions');
    const pin = el('button', 'primary', job.available ? 'Pin location' : 'Coming soon');
    pin.type = 'button';
    pin.disabled = !job.available;
    pin.addEventListener('click', async () => {
        await postNui('pin', { job: job.id }).catch(() => undefined);
        pin.textContent = 'Pinned on GPS ✓';
    });
    actions.append(pin);
    if (mine) {
        const quit = el('button', 'ghost', 'Quit job');
        quit.type = 'button';
        quit.addEventListener('click', () => {
            menu.hidden = true;
            void postNui('quit').catch(() => undefined);
        });
        actions.append(quit);
    }
    card.append(actions);
    return card;
}

function openMenu(currentJob: string): void {
    const job = JOBS.find((item) => item.id === currentJob);
    current.replaceChildren();
    if (job) current.append('Your job: ', el('b', undefined, job.name));
    else current.textContent = 'You are unemployed. Pick a job below.';
    jobsList.replaceChildren(...JOBS.map((item) => jobCard(item, currentJob)));
    menu.hidden = false;
}

function closeMenu(): void {
    if (menu.hidden) return;
    menu.hidden = true;
    void postNui('close').catch(() => undefined);
}

byId('close').addEventListener('click', closeMenu);

// ── Fishing minigame ────────────────────────────────────────────────────────
const minigame = byId('minigame');
const zone = byId('mg-zone');
const marker = byId('mg-marker');
const timeBar = byId('mg-time');

let running = false;
let frame = 0;
let position = 0; // 0..1
let direction = 1;
let zoneStart = 0;
let zoneEnd = 0;
let speed = 1; // bar widths per second
let startedAt = 0;
let last = 0;

function finish(success: boolean): void {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
    minigame.classList.add(success ? 'hit' : 'miss');
    setTimeout(() => {
        minigame.hidden = true;
        minigame.classList.remove('hit', 'miss');
        void postNui('minigame', { success }).catch(() => undefined);
    }, 650);
}

function step(now: number): void {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    position += direction * speed * dt;
    if (position >= 1) [position, direction] = [1, -1];
    if (position <= 0) [position, direction] = [0, 1];
    marker.style.left = `${position * 100}%`;

    const left = 1 - (now - startedAt) / FISHING_RULES.minigameMs;
    timeBar.style.transform = `scaleX(${Math.max(0, left)})`;
    if (left <= 0) return finish(false);
    frame = requestAnimationFrame(step);
}

function startMinigame(width: number, markerSpeed: number): void {
    zoneStart = 0.15 + Math.random() * (0.7 - width);
    zoneEnd = zoneStart + width;
    zone.style.left = `${zoneStart * 100}%`;
    zone.style.width = `${width * 100}%`;
    speed = markerSpeed;
    position = Math.random() < 0.5 ? 0 : 1;
    direction = position === 0 ? 1 : -1;
    minigame.classList.remove('hit', 'miss');
    minigame.hidden = false;
    running = true;
    startedAt = last = performance.now();
    frame = requestAnimationFrame(step);
}

window.addEventListener('keydown', (event) => {
    if (running && (event.code === 'Space' || event.key === ' ')) {
        event.preventDefault();
        finish(position >= zoneStart && position <= zoneEnd);
    } else if (event.key === 'Escape') {
        if (running) finish(false);
        else closeMenu();
    }
});

onNuiMessage<JobsNuiMessage>({
    menu: ({ currentJob }) => openMenu(currentJob),
    minigame: ({ zoneWidth, speed: markerSpeed }) => startMinigame(zoneWidth, markerSpeed),
    accent: ({ color }) => setAccent('accent', color),
    close: () => {
        menu.hidden = true;
        if (running) {
            running = false;
            cancelAnimationFrame(frame);
        }
        minigame.hidden = true;
    },
});

notifyReady();
