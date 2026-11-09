import { notify } from '@shared/client/game.ts';
import { onNui, sendNui } from '@shared/client/nui.ts';
import type { SpeedoNuiMessage, SpeedoReading, SpeedoSettings } from '../common/nui.ts';

/** 20 updates per second: smooth with the CSS transitions, a fraction of a per-frame loop's cost. */
const UPDATE_INTERVAL_MS = 50;
const MS_TO_KMH = 3.6;
const MS_TO_MPH = 2.236936;
const SETTINGS_KEY = 'settings';
const DEFAULT_SETTINGS: SpeedoSettings = { showRpm: true, showGear: true, sounds: true, metric: true };

let ready = false;
let visible = false;
let lastReading = '';
let lastGear: string | null = null;

const send = (message: SpeedoNuiMessage) => ready && sendNui(message);

/** Per-player settings, stored on the player's own machine (resource KVP). */
function loadSettings(): SpeedoSettings {
    try {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(GetResourceKvpString(SETTINGS_KEY) ?? '{}') as Partial<SpeedoSettings>) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}
const settings = loadSettings();

const clampPercent = (value: number) => Math.round(Math.min(100, Math.max(0, value)));

/** Fuel as a percentage of the vehicle's tank (the game stores litres up to the tank volume). */
function fuelPercent(vehicle: number): number {
    const level = GetVehicleFuelLevel(vehicle);
    const tank = GetVehicleHandlingFloat(vehicle, 'CHandlingData', 'fPetrolTankVolume');
    return clampPercent(tank > 0 ? (level / tank) * 100 : level);
}

function gearLabel(vehicle: number, speed: number): string {
    const gear = GetVehicleCurrentGear(vehicle);
    if (gear === 0) return 'R';
    return speed < 1 && GetVehicleCurrentRpm(vehicle) <= 0.21 ? 'N' : String(gear);
}

function playGearSound(gear: string): void {
    if (!settings.sounds || !settings.showGear || lastGear === null || gear === lastGear) return;
    if (gear === 'R') PlaySoundFrontend(-1, 'CONFIRM_BEEP', 'HUD_MINI_GAME_SOUNDSET', true);
    else if (Number(gear) > Number(lastGear)) PlaySoundFrontend(-1, 'NAV_UP_DOWN', 'HUD_FRONTEND_DEFAULT_SOUNDSET', true);
}

function setVisible(next: boolean): void {
    if (next === visible) return;
    visible = next;
    lastReading = '';
    if (!next) lastGear = null;
    send({ type: 'visible', visible: next });
}

function update(): void {
    const vehicle = GetVehiclePedIsIn(PlayerPedId(), false);
    if (vehicle === 0 || !GetIsVehicleEngineRunning(vehicle) || IsPauseMenuActive()) return setVisible(false);

    const metersPerSecond = GetEntitySpeed(vehicle);
    const gear = gearLabel(vehicle, metersPerSecond);
    const reading: SpeedoReading = {
        speed: Math.round(metersPerSecond * (settings.metric ? MS_TO_KMH : MS_TO_MPH)),
        rpm: settings.showRpm ? clampPercent(GetVehicleCurrentRpm(vehicle) * 100) : null,
        gear: settings.showGear ? gear : null,
        fuel: fuelPercent(vehicle),
        engine: clampPercent(GetVehicleEngineHealth(vehicle) / 10),
    };

    setVisible(true);
    playGearSound(gear);
    lastGear = gear;

    // Only talk to the UI when something visible changed.
    const key = JSON.stringify(reading);
    if (key === lastReading) return;
    lastReading = key;
    send({ type: 'reading', reading });
}

setInterval(update, UPDATE_INTERVAL_MS);

onNui('ready', () => {
    ready = true;
    send({ type: 'settings', settings });
    send({ type: 'visible', visible });
});

const OPTIONS: Record<string, keyof SpeedoSettings> = { rpm: 'showRpm', gear: 'showGear', sounds: 'sounds', metric: 'metric' };
const describe = () =>
    `RPM ${settings.showRpm ? 'on' : 'off'} · gear ${settings.showGear ? 'on' : 'off'} · sounds ${settings.sounds ? 'on' : 'off'} · ${settings.metric ? 'km/h' : 'mph'}`;

RegisterCommand(
    'speedo',
    (_source: number, args: string[]) => {
        const key = OPTIONS[(args[0] ?? '').toLowerCase()];
        if (!key) return notify('SPEEDO', `Usage: /speedo [rpm|gear|sounds|metric] — now: ${describe()}`);
        settings[key] = !settings[key];
        SetResourceKvp(SETTINGS_KEY, JSON.stringify(settings));
        lastReading = '';
        send({ type: 'settings', settings });
        notify('SPEEDO', describe());
    },
    false,
);
