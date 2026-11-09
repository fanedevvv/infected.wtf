export interface Settings {
    hudColor: string;
    showFps: boolean;
    showOwnNameTag: boolean;
    /** Speedometer unit: true = km/h, false = mph. */
    metricSpeed: boolean;
}

/** Account data sent to its owner. Money is a decimal string (BIGINT safe). */
export interface Account {
    id: string;
    username: string;
    level: number;
    admin: number;
    /** Helper level 0–5 (0 = not a helper). */
    helper: number;
    cash: string;
    bank: string;
    skin: string;
    settings: Settings;
}

export type AuthMode = 'login' | 'register';

export interface AuthRequest {
    mode: AuthMode;
    username: string;
    email: string;
    password: string;
}

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface ChatSegment {
    text: string;
    color?: string;
}

export interface ChatMessage {
    args: string[];
    segments?: ChatSegment[];
    color?: [number, number, number];
    multiline?: boolean;
}

export interface ChatSuggestion {
    name: string;
    help: string;
    params: { name: string; help?: string }[];
}

/** An add-on vehicle declared by a resource's fxmanifest (`ket_vehicle` / `ket_vehicle_name`). */
export interface CustomVehicle {
    model: string;
    name: string;
    resource: string;
}

/** Support menus (/questions for helpers, /tickets for admins). */
export type SupportKind = 'question' | 'ticket';

export interface SupportItem {
    id: number;
    player: string;
    playerId: string;
    text: string;
    ageMinutes: number;
    /** Questions only: helper who took it (null = open). */
    helper: string | null;
    /** Questions only: taken by the viewer. */
    mine: boolean;
}

export type SupportView =
    | { view: 'ask'; kind: SupportKind; pending: { id: number; text: string; helper: string | null } | null }
    | { view: 'queue'; kind: SupportKind; items: SupportItem[] };

export type SupportAction =
    | { op: 'open'; kind: SupportKind }
    | { op: 'create'; kind: SupportKind; text: string }
    | { op: 'accept' | 'close'; kind: 'question'; id: number }
    | { op: 'reject'; kind: 'question'; id: number; reason: string }
    | { op: 'answer'; kind: 'ticket'; id: number; text: string }
    | { op: 'dismiss'; kind: 'ticket'; id: number };

export interface AdminArgument {
    name: string;
    label: string;
    optional?: boolean;
}

export interface AdminCommandInfo {
    name: string;
    label: string;
    description: string;
    level: number;
    category: string;
    arguments: AdminArgument[];
}
