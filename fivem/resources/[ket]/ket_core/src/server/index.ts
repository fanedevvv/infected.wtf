import { StateKey } from '@shared/common/constants.ts';
import { log } from '@shared/common/log.ts';
import { onClient, onPlayerDropped } from '@shared/server/events.ts';
import { getPlayerIds } from '@shared/server/players.ts';
import { onRpc } from '@shared/server/rpc.ts';
import { authenticate } from './auth.ts';
import { initDatabase } from './schema.ts';
import { sessions } from './sessions.ts';
import { updateSettings } from './settings.ts';
import { registerExport } from '@shared/common/fx.ts';

void initDatabase();

onRpc('ket_core:auth', authenticate);
onRpc('ket_core:updateSettings', updateSettings, { cooldownMs: 250 });

// Online counter: one replicated global value instead of every client polling.
const connected = new Set(getPlayerIds());
const publishOnline = () => GlobalState.set(StateKey.online, connected.size, true);
publishOnline();

on('playerJoining', () => {
    connected.add(Number(source));
    publishOnline();
});

onPlayerDropped((src) => {
    connected.delete(src);
    sessions.close(src);
    publishOnline();
});

// Exports (see shared/server/core.ts for the typed wrapper).
registerExport('getAccount', (src: number) => sessions.copy(Number(src)));
registerExport('getUsername', (src: number) => sessions.get(Number(src))?.username);
registerExport('getAdminLevel', (src: number) => sessions.get(Number(src))?.admin ?? 0);
registerExport('isAdmin', (src: number, minimum = 1) => {
    const level = sessions.get(Number(src))?.admin;
    return level !== undefined && Number.isSafeInteger(minimum) && level >= minimum;
});
registerExport('findByAccountId', (id: string) => sessions.findByAccountId(String(id)));
registerExport('findByUsername', (username: string) => (typeof username === 'string' ? sessions.findByUsername(username) : undefined));
registerExport('online', () => sessions.online());
registerExport('patchAccount', (src: number, patch: Parameters<typeof sessions.patch>[1]) => sessions.patch(Number(src), patch ?? {}));

// Login-scene diagnostics: a few reports per player, primitives only.
const reportsBySource = new Map<number, number>();
onPlayerDropped((src) => reportsBySource.delete(src));
onClient('ket_core:sceneReport', (src, stage, state) => {
    const count = reportsBySource.get(src) ?? 0;
    if (count >= 12 || typeof stage !== 'string' || stage.length > 32 || typeof state !== 'object' || state === null) return;
    reportsBySource.set(src, count + 1);
    const fields = Object.entries(state as Record<string, unknown>)
        .slice(0, 20)
        .filter(([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value))
        .map(([key, value]) => `${key.slice(0, 24)}=${String(value).slice(0, 40)}`);
    log.info(`scene[${src}] ${stage}: ${fields.join(' ')}`);
});
