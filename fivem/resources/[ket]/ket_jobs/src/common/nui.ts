import type { JobId } from './config.ts';

export type JobsNuiMessage =
    | { type: 'menu'; currentJob: string }
    | { type: 'minigame'; zoneWidth: number; speed: number }
    | { type: 'close' }
    | { type: 'accent'; color: string };

export interface MinigameResult {
    success: boolean;
}

export type PinRequest = { job: JobId };
