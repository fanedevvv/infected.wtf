import type { Result, Settings } from '@shared/common/types.ts';
import { isBoolean, isHexColor } from '@shared/common/validate.ts';
import { sessions } from './sessions.ts';
import { saveSettings } from './users.ts';

const validators: { [K in keyof Settings]: (value: unknown) => Settings[K] | undefined } = {
    hudColor: (value) => (isHexColor(value) ? value.toLowerCase() : undefined),
    showFps: (value) => (isBoolean(value) ? value : undefined),
    showOwnNameTag: (value) => (isBoolean(value) ? value : undefined),
};

/** Validates every key of an untrusted patch; unknown keys or bad values reject the whole patch. */
function parsePatch(input: unknown): Partial<Settings> | undefined {
    if (typeof input !== 'object' || input === null) return undefined;
    const patch: Partial<Settings> = {};
    for (const [key, value] of Object.entries(input)) {
        const validate = validators[key as keyof Settings];
        const parsed = validate?.(value);
        if (parsed === undefined) return undefined;
        (patch as Record<string, unknown>)[key] = parsed;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}

export async function updateSettings(source: number, input: unknown): Promise<Result<Settings>> {
    const account = sessions.get(source);
    if (!account) return { ok: false, error: 'Sign in first.' };
    const patch = parsePatch(input);
    if (!patch) return { ok: false, error: 'Invalid setting.' };

    await saveSettings(account.id, patch);
    const updated = sessions.update(source, (current) => Object.assign(current.settings, patch));
    return updated ? { ok: true, data: { ...updated.settings } } : { ok: false, error: 'Session ended.' };
}
