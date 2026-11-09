import type { AdminCommandInfo } from '@shared/common/types.ts';

export type AdminNuiMessage = { type: 'open'; commands: AdminCommandInfo[]; level: number } | { type: 'close' };

export interface ExecuteRequest {
    command: string;
    args: string[];
}
