export interface Settings {
    hudColor: string;
    showFps: boolean;
    showOwnNameTag: boolean;
}

/** Account data sent to its owner. Money is a decimal string (BIGINT safe). */
export interface Account {
    id: string;
    username: string;
    level: number;
    admin: number;
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
