import type { ClientRpc, ServerRpc } from '../common/contracts.ts';
import { log } from '../common/log.ts';
import {
    PendingRequests,
    RESOURCE_NAME,
    RPC_TIMEOUT_MS,
    rpcRequestEvent,
    rpcResponseEvent,
    type RpcArgs,
    type RpcReturn,
    type Untrusted,
} from '../common/rpc.ts';
import { onPlayerDropped } from './events.ts';

interface RpcOptions {
    /** Minimum time between two calls from the same player. */
    cooldownMs?: number;
}

/** Answers a client → server RPC. Throwing (or rejecting) sends a generic error to the caller. */
export function onRpc<K extends keyof ServerRpc>(
    name: K,
    handler: (source: number, ...args: Untrusted<RpcArgs<ServerRpc[K]>>) => RpcReturn<ServerRpc[K]> | Promise<RpcReturn<ServerRpc[K]>>,
    { cooldownMs = 0 }: RpcOptions = {},
): void {
    const lastCall = new Map<number, number>();
    if (cooldownMs > 0) onPlayerDropped((src) => lastCall.delete(src));

    onNet(rpcRequestEvent(name), async (resource: unknown, id: unknown, ...args: unknown[]) => {
        const src = source;
        if (typeof resource !== 'string' || !RESOURCE_NAME.test(resource) || typeof id !== 'number') return;
        const reply = (ok: boolean, payload: unknown) => {
            if (GetPlayerName(String(src))) emitNet(rpcResponseEvent(resource), src, id, ok, payload);
        };

        if (cooldownMs > 0) {
            const now = GetGameTimer();
            if (now - (lastCall.get(src) ?? -Infinity) < cooldownMs) return reply(false, 'Too many requests.');
            lastCall.set(src, now);
        }

        try {
            reply(true, await handler(src, ...(args as Untrusted<RpcArgs<ServerRpc[K]>>)));
        } catch (error) {
            log.error(`RPC ${name} failed for player ${src}:`, error);
            reply(false, 'Internal server error.');
        }
    });
}

const pending = new PendingRequests();
onNet(rpcResponseEvent(GetCurrentResourceName()), (id: unknown, ok: unknown, payload: unknown) => {
    pending.settle(id, ok, payload, source);
});
onPlayerDropped((src) => pending.rejectOwner(src, 'Player disconnected'));

/** Calls a server → client RPC on one player. Rejects on timeout or disconnect. */
export function callClient<K extends keyof ClientRpc>(
    target: number,
    name: K,
    args: RpcArgs<ClientRpc[K]>,
    timeoutMs = RPC_TIMEOUT_MS,
): Promise<RpcReturn<ClientRpc[K]>> {
    const { id, promise } = pending.create<RpcReturn<ClientRpc[K]>>(name, timeoutMs, target);
    emitNet(rpcRequestEvent(name), target, GetCurrentResourceName(), id, ...args);
    return promise;
}
