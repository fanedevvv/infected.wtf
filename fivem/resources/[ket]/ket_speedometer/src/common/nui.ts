export interface SpeedoReading {
    /** Speed in the selected unit, rounded. */
    speed: number;
    /** 0–100, or null when RPM display is off. */
    rpm: number | null;
    /** 'R', 'N' or a number; null when gear display is off. */
    gear: string | null;
    /** 0–100 */
    fuel: number;
    /** 0–100 */
    engine: number;
}

export interface SpeedoSettings {
    showRpm: boolean;
    showGear: boolean;
    sounds: boolean;
    metric: boolean;
}

export type SpeedoNuiMessage =
    | { type: 'reading'; reading: SpeedoReading }
    | { type: 'visible'; visible: boolean }
    | { type: 'settings'; settings: SpeedoSettings };
