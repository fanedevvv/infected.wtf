import type { AdminCommandInfo } from '@shared/common/types.ts';

export interface VehicleEntry {
    model: string;
    name: string;
    make: string;
    /** Vehicle class id (GetVehicleClassFromName), or -1 if unknown. */
    classId: number;
    custom: boolean;
}

export interface VehicleCategory {
    /** `custom`, or a vehicle class id as a string. */
    id: string;
    label: string;
}

export type AdminNuiMessage =
    | { type: 'open'; commands: AdminCommandInfo[]; level: number }
    | { type: 'carlist'; categories: VehicleCategory[]; vehicles: VehicleEntry[]; level: number }
    | { type: 'close' };

export interface ExecuteRequest {
    command: string;
    args: string[];
}
