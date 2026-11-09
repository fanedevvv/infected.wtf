import type { Settings } from '@shared/common/types.ts';

export type SettingsNuiMessage = { type: 'open'; settings: Settings };

export type UpdateResponse = { ok: true; settings: Settings } | { ok: false; error: string };
