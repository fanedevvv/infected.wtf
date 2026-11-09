export interface HudPlayer {
    username: string;
    cash: string;
    bank: string;
}

export type HudNuiMessage =
    | { type: 'player'; player: HudPlayer }
    | { type: 'online'; count: number }
    | { type: 'visible'; visible: boolean }
    | { type: 'paused'; paused: boolean }
    | { type: 'accent'; color: string }
    | { type: 'fps'; enabled: boolean }
    | { type: 'fpsValue'; value: number };
