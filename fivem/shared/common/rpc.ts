/** Wire format shared by the client and server RPC implementations. */
export const RPC_TIMEOUT_MS = 10_000;
export const RESOURCE_NAME = /^[\w-]{1,64}$/;

export const rpcRequestEvent = (name: string) => `ket:rpc:req:${name}`;
export const rpcResponseEvent = (resource: string) => `ket:rpc:res:${resource}`;

export class RpcError extends Error {
    override name = 'RpcError';
}

type Fn = (...args: any[]) => any;
export type RpcArgs<F> = F extends Fn ? Parameters<F> : never;
export type RpcReturn<F> = F extends Fn ? Awaited<ReturnType<F>> : never;
/** Network input is untrusted: handlers receive every argument as `unknown` and must validate it. */
export type Untrusted<T extends unknown[]> = { [K in keyof T]: unknown };

interface Pending {
    owner: number | undefined;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

/** Tracks in-flight requests for one resource. */
export class PendingRequests {
    private nextId = 0;
    private readonly pending = new Map<number, Pending>();

    /** `owner` pins the request to one sender (server side: the target player). */
    create<T>(label: string, timeoutMs: number, owner?: number): { id: number; promise: Promise<T> } {
        const id = (this.nextId = (this.nextId + 1) % 0x7fffffff);
        const promise = new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new RpcError(`RPC "${label}" timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pending.set(id, { owner, resolve: resolve as (value: unknown) => void, reject, timer });
        });
        return { id, promise };
    }

    settle(id: unknown, ok: unknown, payload: unknown, sender?: number): void {
        if (typeof id !== 'number') return;
        const entry = this.pending.get(id);
        if (!entry || (entry.owner !== undefined && entry.owner !== sender)) return;
        this.pending.delete(id);
        clearTimeout(entry.timer);
        if (ok === true) entry.resolve(payload);
        else entry.reject(new RpcError(typeof payload === 'string' ? payload : 'RPC failed'));
    }

    /** Rejects every request pinned to `owner` (e.g. a player who disconnected). */
    rejectOwner(owner: number, reason: string): void {
        for (const [id, entry] of this.pending) {
            if (entry.owner !== owner) continue;
            clearTimeout(entry.timer);
            this.pending.delete(id);
            entry.reject(new RpcError(reason));
        }
    }
}
