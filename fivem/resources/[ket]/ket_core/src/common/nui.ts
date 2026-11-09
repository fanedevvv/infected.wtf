import type { AuthRequest } from '@shared/common/types.ts';

/** Branding shown on the sign-in screen. */
export const BRAND = { name: 'SAPHIREX', tagline: 'ROLEPLAY' } as const;

export type CoreNuiMessage =
    | { type: 'open'; online: number }
    | { type: 'close' }
    | { type: 'error'; message: string };

export type SubmitRequest = AuthRequest;
export interface SubmitResponse {
    ok: boolean;
    message: string;
}
