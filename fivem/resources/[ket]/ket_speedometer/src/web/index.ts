import { byId, el } from '@shared/web/dom.ts';
import { notifyReady, onNuiMessage } from '@shared/web/nui.ts';
import type { SpeedoNuiMessage } from '../common/nui.ts';

const container = byId('speedo');
const speed = byId('speed');
const unit = byId('unit');
const fuel = byId('fuel');
const fuelFill = byId('fuel-fill');
const engine = byId('engine');
const rpmPart = byId('rpm-part');
const rpm = byId('rpm');

let shownGear: string | null = null;

/** Gear changes pop briefly, as in the original design. */
function showGear(gear: string | null): void {
    if (gear === shownGear) return;
    shownGear = gear;
    container.querySelector('.gear')?.remove();
    if (gear !== null) container.append(el('div', 'gear', gear));
}

onNuiMessage<SpeedoNuiMessage>({
    visible: ({ visible }) => {
        container.classList.toggle('hidden', !visible);
        if (!visible) showGear(null);
    },
    settings: ({ settings }) => {
        unit.textContent = settings.metric ? 'km/h' : 'mph';
        rpmPart.hidden = !settings.showRpm;
    },
    reading: ({ reading }) => {
        speed.textContent = String(reading.speed);
        fuel.textContent = String(reading.fuel);
        fuelFill.style.width = `${reading.fuel}%`;
        engine.textContent = String(reading.engine);
        if (reading.rpm !== null) {
            rpm.style.width = `${reading.rpm}%`;
            rpm.style.backgroundColor = reading.rpm > 80 ? '#e04141' : reading.rpm >= 50 ? '#f77a2d' : '';
        }
        showGear(reading.gear);
    },
});

notifyReady();
