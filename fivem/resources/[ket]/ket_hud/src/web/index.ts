import { byId, setAccent } from '@shared/web/dom.ts';
import { notifyReady, onNuiMessage } from '@shared/web/nui.ts';
import type { HudNuiMessage } from '../common/nui.ts';

const COUNT_MS = 650;
const grouping = new Intl.NumberFormat('en-US');

const username = byId('username');
const accountId = byId('account-id');
const online = byId('online');
const fpsCounter = byId('fps-counter');
const fpsValue = byId('fps-value');

/** Money amounts may exceed 2^53, so they are handled as BigInt. */
const toBig = (value: string): bigint => {
    try {
        return BigInt(value);
    } catch {
        return 0n;
    }
};
const format = (value: bigint) => grouping.format(value);

/** One money line: counts toward new values and pops a +/- delta. */
class MoneyLine {
    private value: bigint | undefined;
    private frame = 0;

    constructor(
        private readonly amount: HTMLElement,
        private readonly delta: HTMLElement,
    ) {}

    set(raw: string): void {
        const next = toBig(raw);
        const previous = this.value;
        this.value = next;
        if (previous === undefined || previous === next) {
            this.amount.textContent = format(next);
            return;
        }
        this.showDelta(next - previous);
        this.countTo(previous, next);
    }

    private showDelta(change: bigint): void {
        const gain = change > 0n;
        this.delta.textContent = `${gain ? '+' : '−'}$${format(gain ? change : -change)}`;
        this.delta.className = `delta ${gain ? 'gain' : 'loss'}`;
        void this.delta.offsetWidth; // restart the animation
        this.delta.classList.add('show');
        const box = this.amount.parentElement!;
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
    }

    private countTo(from: bigint, to: bigint): void {
        cancelAnimationFrame(this.frame);
        const span = to - from;
        // Very large jumps can't be interpolated precisely as numbers: just show the result.
        if (span > BigInt(Number.MAX_SAFE_INTEGER) || -span > BigInt(Number.MAX_SAFE_INTEGER)) {
            this.amount.textContent = format(to);
            return;
        }
        const distance = Number(span);
        const started = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - started) / COUNT_MS);
            const eased = 1 - (1 - t) ** 3;
            this.amount.textContent = format(t >= 1 ? to : from + BigInt(Math.round(distance * eased)));
            if (t < 1) this.frame = requestAnimationFrame(step);
        };
        this.frame = requestAnimationFrame(step);
    }
}

const cash = new MoneyLine(byId('cash'), byId('cash-delta'));
const bank = new MoneyLine(byId('bank'), byId('bank-delta'));

onNuiMessage<HudNuiMessage>({
    player: ({ player }) => {
        username.textContent = player.username;
        accountId.textContent = player.id ? `#${player.id}` : '#—';
        cash.set(player.cash);
        bank.set(player.bank);
    },
    online: ({ count }) => (online.textContent = String(count)),
    visible: ({ visible }) => document.body.classList.toggle('visible', visible),
    paused: ({ paused }) => document.body.classList.toggle('paused', paused),
    accent: ({ color }) => setAccent('hud-accent', color),
    fps: ({ enabled }) => fpsCounter.classList.toggle('visible', enabled),
    fpsValue: ({ value }) => (fpsValue.textContent = String(value)),
});

notifyReady();
