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
} from '../common/rpc.ts';

const pending = new PendingRequests();
onNet(rpcResponseEvent(GetCurrentResourceName()), (id: unknown, ok: unknown, payload: unknown) => pending.settle(id, ok, payload));

/** Calls a client → server RPC. Rejects with RpcError on timeout or server failure. */
export function callServer<K extends keyof ServerRpc>(
    name: K,
    args: RpcArgs<ServerRpc[K]>,
    timeoutMs = RPC_TIMEOUT_MS,
): Promise<RpcReturn<ServerRpc[K]>> {
    const { id, promise } = pending.create<RpcReturn<ServerRpc[K]>>(name, timeoutMs);
    emitNet(rpcRequestEvent(name), GetCurrentResourceName(), id, ...args);
    return promise;
}

/** Answers a server → client RPC. Only the server can trigger client net events. */
export function onRpc<K extends keyof ClientRpc>(
    name: K,
    handler: (...args: RpcArgs<ClientRpc[K]>) => RpcReturn<ClientRpc[K]> | Promise<RpcReturn<ClientRpc[K]>>,
): void {
    onNet(rpcRequestEvent(name), async (resource: unknown, id: unknown, ...args: unknown[]) => {
        if (typeof resource !== 'string' || !RESOURCE_NAME.test(resource)) return;
        try {
            emitNet(rpcResponseEvent(resource), id, true, await handler(...(args as RpcArgs<ClientRpc[K]>)));
        } catch (error) {
            log.error(`RPC ${name} failed:`, error);
            emitNet(rpcResponseEvent(resource), id, false, 'Client error');
        }
    });
}
