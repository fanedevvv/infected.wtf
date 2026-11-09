export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Polls `predicate` once per tick until it is truthy or `timeoutMs` elapses. Returns the final result. */
export async function waitFor(predicate: () => boolean, timeoutMs: number, intervalMs = 0): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() >= deadline) return false;
        await sleep(intervalMs);
    }
    return true;
}

/** Limits how many async jobs run at once (e.g. CPU-heavy password hashing). */
export class Semaphore {
    private active = 0;
    private readonly queue: (() => void)[] = [];

    constructor(private readonly limit: number) {}

    async run<T>(job: () => Promise<T>): Promise<T> {
        if (this.active >= this.limit) await new Promise<void>((resolve) => this.queue.push(resolve));
        this.active++;
        try {
            return await job();
        } finally {
            this.active--;
            this.queue.shift()?.();
        }
    }
}
