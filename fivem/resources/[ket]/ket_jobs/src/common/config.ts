import type { Vec4 } from '@shared/common/constants.ts';

export type JobId = 'fisherman' | 'trucker' | 'miner' | 'lumberjack' | 'garbage' | 'pizza';

export interface JobInfo {
    id: JobId;
    name: string;
    description: string;
    pay: string;
    available: boolean;
    /** Where to get the job (job NPC). */
    location?: Vec4;
}

/**
 * Fisherman: NPC and fishing zone on Del Perro Pier.
 * To move them: stand on the spot in-game, type /mypos, and paste the numbers here.
 * The NPC is placed on the ground automatically, so z only needs to be roughly right.
 */
export const FISHING = {
    npc: { x: -1838.4, y: -1233.6, z: 13.0, heading: 140 } satisfies Vec4,
    npcModel: 's_m_m_dockwork_01',
    zone: { x: -1850.3, y: -1250.3, z: 8.6 },
    /** Meters around `zone` where /fish works. */
    zoneRadius: 18,
    /** Meters from the NPC within which /getjob works. */
    getJobRange: 4,
} as const;

export const JOBS: JobInfo[] = [
    {
        id: 'fisherman', name: 'Fisherman', available: true, location: FISHING.npc, pay: '$40 – $220 per fish',
        description: 'Get the job from the fisherman on Del Perro Pier, cast with /fish and sell your catch with /sellfish.',
    },
    { id: 'trucker', name: 'Trucker', available: false, pay: 'Coming soon', description: 'Deliver cargo across San Andreas.' },
    { id: 'miner', name: 'Miner', available: false, pay: 'Coming soon', description: 'Mine ore in the quarry and refine it.' },
    { id: 'lumberjack', name: 'Lumberjack', available: false, pay: 'Coming soon', description: 'Cut trees in Paleto Forest and sell the wood.' },
    { id: 'garbage', name: 'Garbage collector', available: false, pay: 'Coming soon', description: 'Drive the garbage truck and empty the city bins.' },
    { id: 'pizza', name: 'Pizza delivery', available: false, pay: 'Coming soon', description: 'Deliver hot pizzas on a scooter before they get cold.' },
];

export interface FishInfo {
    item: string;
    label: string;
    price: number;
    /** Relative chance. */
    weight: number;
}

export const FISH: FishInfo[] = [
    { item: 'fish_sardine', label: 'Sardine', price: 40, weight: 40 },
    { item: 'fish_mackerel', label: 'Mackerel', price: 65, weight: 28 },
    { item: 'fish_bass', label: 'Sea bass', price: 90, weight: 18 },
    { item: 'fish_salmon', label: 'Salmon', price: 140, weight: 10 },
    { item: 'fish_tuna', label: 'Tuna', price: 220, weight: 4 },
];

/** Minigame + anti-cheat timing. */
export const FISHING_RULES = {
    /** Shortest believable cast (bite delay + minigame), checked by the server. */
    minCastMs: 2_000,
    maxCastMs: 60_000,
    /** Minigame: time to press SPACE before the fish escapes. */
    minigameMs: 6_000,
} as const;
