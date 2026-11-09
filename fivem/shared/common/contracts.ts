import type { Account, AdminCommandInfo, AuthRequest, ChatMessage, Result, Settings } from './types.ts';

/**
 * Client → server RPCs: name → handler signature (without the implicit player source).
 * Registered with `onRpc` (server) and invoked with `callServer` (client).
 */
export interface ServerRpc {
    'ket_core:auth': (request: AuthRequest) => Result<Account>;
    'ket_core:updateSettings': (patch: Partial<Settings>) => Result<Settings>;
    'ket_chat:commandExists': (name: string) => boolean;
}

/** Server → client RPCs, registered with `onRpc` (client) and invoked with `callClient` (server). */
export interface ClientRpc {
    'ket_hud:getFps': () => number;
}

/** Server → client net events. */
export interface ClientNetEvents {
    'ket_core:account': (account: Account) => void;
    'ket_admin:open': (commands: AdminCommandInfo[], level: number) => void;
    'ket_admin:action': (action: AdminAction) => void;
    'chat:addMessage': (message: ChatMessage) => void;
    'chat:addSuggestion': (name: string, help: string, params?: { name: string; help?: string }[]) => void;
    'chat:removeSuggestion': (name: string) => void;
    'chat:clear': () => void;
}

/** Client → server net events (fire-and-forget; always validated server-side). */
export interface ServerNetEvents {
    'ket_chat:send': (message: string) => void;
    'ket_admin:execute': (command: string, args: string[]) => void;
    'ket_admin:deleteVehicle': (netId: number) => void;
}

/** Same-machine events between resources (client ↔ client or server ↔ server). */
export interface ClientLocalEvents {
    /** Fired by ket_core whenever the local account changes (login, settings, money). */
    'ket:account': (account: Account) => void;
    /** Fired by ket_core once the player has spawned after signing in. */
    'ket:spawned': () => void;
    'chat:addMessage': (message: ChatMessage) => void;
}

export interface ServerLocalEvents {
    'ket:playerLoaded': (source: number, account: Account) => void;
    'ket:playerUnloaded': (source: number, accountId: string) => void;
    'ket:accountChanged': (source: number, account: Account) => void;
}

/** Admin actions that run on the admin's own client without arguments. */
export type AdminSelfAction = 'noclip' | 'invisible' | 'godmode' | 'deleteVehicle' | 'fix' | 'fuel' | 'clearArea' | 'waypoint';

export type AdminAction =
    | { type: 'teleport'; x: number; y: number; z: number; heading?: number }
    | { type: 'respawn' }
    | { type: 'freeze'; frozen: boolean }
    | { type: 'heal' }
    | { type: 'spectate'; target: number }
    | { type: AdminSelfAction }
    | { type: 'spawnVehicle'; model: string };
