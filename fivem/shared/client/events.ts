import type { ClientLocalEvents, ClientNetEvents, ServerNetEvents } from '../common/contracts.ts';

type Args<F> = F extends (...args: infer A) => any ? A : never;

export const emitServer = <K extends keyof ServerNetEvents>(name: K, ...args: Args<ServerNetEvents[K]>) => emitNet(name, ...args);

/** Handles a server → client net event. */
export const onServer = <K extends keyof ClientNetEvents>(name: K, handler: ClientNetEvents[K]) => onNet(name, handler);

export const emitLocal = <K extends keyof ClientLocalEvents>(name: K, ...args: Args<ClientLocalEvents[K]>) => emit(name, ...args);

export const onLocal = <K extends keyof ClientLocalEvents>(name: K, handler: ClientLocalEvents[K]) => on(name, handler);

/** Runs once when this resource stops (cleanup: NUI focus, entities, blips). */
export const onResourceStop = (handler: () => void) =>
    on('onResourceStop', (name: string) => name === GetCurrentResourceName() && handler());
