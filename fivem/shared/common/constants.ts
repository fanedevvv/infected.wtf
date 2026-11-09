export interface Vec4 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly heading: number;
}

/** Where players spawn after signing in, and where admins respawn them. */
export const SPAWN_POINT: Vec4 = { x: 237.2323, y: -407.0282, z: 47.9244, heading: 337.971 };

export const DEFAULT_SKIN = 'mp_m_freemode_01';
export const DEFAULT_ACCENT = '#e9bd57';
export const MAX_ADMIN_LEVEL = 7;
export const MAX_SAFE_MONEY = Number.MAX_SAFE_INTEGER;

/** Replicated state-bag keys (readable by every client). */
export const StateKey = {
    /** Player bag: authenticated username. */
    username: 'ket:username',
    /** Player bag: database account id (string). */
    accountId: 'ket:accountId',
    /** Global bag: number of connected players. */
    online: 'ket:online',
} as const;
