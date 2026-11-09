import { formatMoney } from '@shared/common/format.ts';
import { byId, setAccent } from '@shared/web/dom.ts';
import { notifyReady, onNuiMessage } from '@shared/web/nui.ts';
import type { HudNuiMessage } from '../common/nui.ts';

const username = byId('username');
const cash = byId('cash');
const bank = byId('bank');
const online = byId('online');
const fpsCounter = byId('fps-counter');
const fpsValue = byId('fps-value');

onNuiMessage<HudNuiMessage>({
    player: ({ player }) => {
        username.textContent = player.username;
        cash.textContent = formatMoney(player.cash);
        bank.textContent = formatMoney(player.bank);
    },
    online: ({ count }) => (online.textContent = String(count)),
    visible: ({ visible }) => document.body.classList.toggle('visible', visible),
    paused: ({ paused }) => document.body.classList.toggle('paused', paused),
    accent: ({ color }) => setAccent('hud-accent', color),
    fps: ({ enabled }) => fpsCounter.classList.toggle('visible', enabled),
    fpsValue: ({ value }) => (fpsValue.textContent = String(value)),
});

notifyReady();
