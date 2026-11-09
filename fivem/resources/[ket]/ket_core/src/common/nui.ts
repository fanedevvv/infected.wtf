import type { AuthRequest } from '@shared/common/types.ts';

export type CoreNuiMessage = { type: 'open' } | { type: 'close' } | { type: 'error'; message: string };

export type SubmitRequest = AuthRequest;
export interface SubmitResponse {
    ok: boolean;
    message: string;
}
