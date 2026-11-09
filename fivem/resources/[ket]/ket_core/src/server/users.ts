/** Data access for the `users` and `user_bans` tables. */
import { DEFAULT_ACCENT, DEFAULT_SKIN } from '@shared/common/constants.ts';
import type { Account, Settings } from '@shared/common/types.ts';
import { isHexColor } from '@shared/common/validate.ts';
import { db } from '@shared/server/db.ts';

interface UserRow {
    id: number | string;
    username: string;
    cash: number | string | null;
    bank: number | string | null;
    hud_color: string | null;
    hud_show_fps: number | boolean | null;
    hud_show_own_nametag: number | boolean | null;
    hud_speed_metric: number | boolean | null;
    skin: string | null;
    admin: number | null;
    level: number | null;
}

interface LoginRow extends UserRow {
    password_hash: string;
}

const PROFILE_COLUMNS = 'id, username, cash, bank, hud_color, hud_show_fps, hud_show_own_nametag, hud_speed_metric, skin, admin, level';

const flag = (value: unknown) => value === true || Number(value) === 1;

export function toAccount(row: UserRow): Account {
    return {
        id: String(row.id),
        username: row.username,
        level: Number(row.level ?? 1),
        admin: Number(row.admin ?? 0) || 0,
        cash: String(row.cash ?? 0),
        bank: String(row.bank ?? 0),
        skin: row.skin || DEFAULT_SKIN,
        settings: {
            hudColor: isHexColor(row.hud_color) ? row.hud_color.toLowerCase() : DEFAULT_ACCENT,
            showFps: flag(row.hud_show_fps),
            showOwnNameTag: flag(row.hud_show_own_nametag),
            metricSpeed: row.hud_speed_metric == null ? true : flag(row.hud_speed_metric),
        },
    };
}

export const findForLogin = (username: string) =>
    db.single<LoginRow>(`SELECT ${PROFILE_COLUMNS}, password_hash FROM users WHERE username = ? LIMIT 1`, [username]);

export const findById = (id: number | string) =>
    db.single<UserRow>(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);

export const usernameOrEmailTaken = async (username: string, email: string) =>
    (await db.scalar<number>('SELECT 1 FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email])) !== null;

export const createUser = (username: string, email: string, passwordHash: string) =>
    db.insert('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, passwordHash]);

export interface ActiveBan {
    reason: string;
    expiresAt: Date | null;
}

export async function findActiveBan(userId: string): Promise<ActiveBan | null> {
    const row = await db.single<{ reason: string; expires_at: Date | string | null }>(
        `SELECT reason, expires_at FROM user_bans
         WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) LIMIT 1`,
        [userId],
    );
    if (!row) return null;
    return { reason: row.reason || 'No reason provided', expiresAt: row.expires_at ? new Date(row.expires_at) : null };
}

const SETTING_COLUMNS: { [K in keyof Settings]: { column: string; encode: (value: Settings[K]) => unknown } } = {
    hudColor: { column: 'hud_color', encode: (value) => value },
    showFps: { column: 'hud_show_fps', encode: (value) => (value ? 1 : 0) },
    showOwnNameTag: { column: 'hud_show_own_nametag', encode: (value) => (value ? 1 : 0) },
    metricSpeed: { column: 'hud_speed_metric', encode: (value) => (value ? 1 : 0) },
};

/** Persists a (validated) settings patch in one UPDATE. */
export async function saveSettings(userId: string, patch: Partial<Settings>): Promise<void> {
    const entries = Object.entries(patch) as [keyof Settings, never][];
    if (entries.length === 0) return;
    const sets = entries.map(([key]) => `${SETTING_COLUMNS[key].column} = ?`).join(', ');
    const values = entries.map(([key, value]) => SETTING_COLUMNS[key].encode(value));
    await db.update(`UPDATE users SET ${sets} WHERE id = ?`, [...values, userId]);
}
