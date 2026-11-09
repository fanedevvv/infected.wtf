/** Fixed-window limiter: at most `max` hits per key per `windowMs`. */
export class RateLimiter {
    private readonly windows = new Map<string, { startedAt: number; count: number }>();

    constructor(
        private readonly max: number,
        private readonly windowMs: number,
    ) {
        // Drop expired windows so the map can't grow without bound.
        setInterval(() => {
            const now = Date.now();
            for (const [key, window] of this.windows) if (now - window.startedAt >= this.windowMs) this.windows.delete(key);
        }, windowMs);
    }

    take(key: string): boolean {
        const now = Date.now();
        const window = this.windows.get(key);
        if (!window || now - window.startedAt >= this.windowMs) {
            this.windows.set(key, { startedAt: now, count: 1 });
            return true;
        }
        if (window.count >= this.max) return false;
        window.count++;
        return true;
    }
}
