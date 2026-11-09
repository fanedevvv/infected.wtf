import type { ClientNetEvents, ServerLocalEvents, ServerNetEvents } from '../common/contracts.ts';
import type { Untrusted } from '../common/rpc.ts';

type Args<F> = F extends (...args: infer A) => any ? A : never;

/** Sends a typed net event to one player, or -1 for everyone. */
export const emitClient = <K extends keyof ClientNetEvents>(name: K, target: number, ...args: Args<ClientNetEvents[K]>) =>
    emitNet(name, target, ...args);

/** Handles a client → server net event. Arguments are untrusted. */
export function onClient<K extends keyof ServerNetEvents>(
    name: K,
    handler: (source: number, ...args: Untrusted<Args<ServerNetEvents[K]>>) => void | Promise<void>,
): void {
    onNet(name, (...args: unknown[]) => void handler(source, ...(args as Untrusted<Args<ServerNetEvents[K]>>)));
}

export const emitLocal = <K extends keyof ServerLocalEvents>(name: K, ...args: Args<ServerLocalEvents[K]>) => emit(name, ...args);

export const onLocal = <K extends keyof ServerLocalEvents>(name: K, handler: ServerLocalEvents[K]) => on(name, handler);

/** Runs `handler(source)` when any player disconnects. */
export const onPlayerDropped = (handler: (source: number, reason: string) => void) =>
    on('playerDropped', (reason: string) => handler(Number(source), reason));

/** Runs once when this resource stops (cleanup). */
export const onResourceStop = (handler: () => void) =>
    on('onResourceStop', (name: string) => name === GetCurrentResourceName() && handler());
