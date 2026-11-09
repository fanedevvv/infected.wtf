import { StateKey } from '@shared/common/constants.ts';
import { onPlayerDropped } from '@shared/server/events.ts';
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
