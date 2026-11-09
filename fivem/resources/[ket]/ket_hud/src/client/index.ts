import { DEFAULT_ACCENT, StateKey } from '@shared/common/constants.ts';
import { watchAccount, whenSpawned } from '@shared/client/core.ts';
import { onNui, sendNui } from '@shared/client/nui.ts';
import { onRpc } from '@shared/client/rpc.ts';
import type { HudNuiMessage, HudPlayer } from '../common/nui.ts';

/** Native HUD components replaced by this resource (cash, MP cash, vehicle/area/street names…). */
const HIDDEN_COMPONENTS = [3, 4, 6, 7, 8, 9, 13];

const state = {
    ready: false,
    visible: false,
    paused: false,
    accent: DEFAULT_ACCENT,
    showFps: false,
    online: Number(GlobalState[StateKey.online] ?? 0),
    player: { id: '', username: 'Guest', cash: '0', bank: '0' } as HudPlayer,
};

const send = (message: HudNuiMessage) => state.ready && sendNui(message);

onNui('ready', () => {
    state.ready = true;
    send({ type: 'accent', color: state.accent });
    send({ type: 'fps', enabled: state.showFps });
    send({ type: 'player', player: state.player });
    send({ type: 'online', count: state.online });
    send({ type: 'paused', paused: state.paused });
    send({ type: 'visible', visible: state.visible });
});

watchAccount(({ id, username, cash, bank, settings }) => {
    state.player = { id, username, cash, bank };
    send({ type: 'player', player: state.player });
    if (settings.hudColor !== state.accent) send({ type: 'accent', color: (state.accent = settings.hudColor) });
    if (settings.showFps !== state.showFps) send({ type: 'fps', enabled: (state.showFps = settings.showFps) });
});

whenSpawned(() => send({ type: 'visible', visible: (state.visible = true) }));

AddStateBagChangeHandler(StateKey.online, 'global', (_bag: string, _key: string, value: unknown) => {
    if (typeof value !== 'number') return;
    send({ type: 'online', count: (state.online = Math.max(0, Math.floor(value))) });
});

setInterval(() => {
    const paused = IsPauseMenuActive();
    if (paused !== state.paused) send({ type: 'paused', paused: (state.paused = paused) });
}, 250);

// One per-frame tick: hides native components and measures FPS (also served to /id).
let fps = 0;
let frames = 0;
let windowStart = GetGameTimer();

setTick(() => {
    for (const component of HIDDEN_COMPONENTS) HideHudComponentThisFrame(component);

    frames++;
    const now = GetGameTimer();
    const elapsed = now - windowStart;
    if (elapsed < 1_000) return;
    fps = Math.round((frames * 1_000) / elapsed);
    frames = 0;
    windowStart = now;
    if (state.showFps) send({ type: 'fpsValue', value: fps });
});

onRpc('ket_hud:getFps', () => fps);
