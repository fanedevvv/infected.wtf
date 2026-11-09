import { db } from '@shared/server/db.ts';
import { log } from '@shared/common/log.ts';
import { sleep } from '@shared/common/async.ts';

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

const CREATE_TABLES = [
    `CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(24) NOT NULL,
        email VARCHAR(254) NOT NULL,
        password_hash VARCHAR(180) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY users_username_unique (username),
        UNIQUE KEY users_email_unique (email)
    ) ${TABLE_OPTIONS}`,
    `CREATE TABLE IF NOT EXISTS user_bans (
        user_id BIGINT UNSIGNED NOT NULL,
        expires_at DATETIME NULL DEFAULT NULL,
        reason VARCHAR(255) NOT NULL,
        banned_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id)
    ) ${TABLE_OPTIONS}`,
    `CREATE TABLE IF NOT EXISTS user_warnings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        reason VARCHAR(255) NOT NULL,
        warned_by BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_warnings_user_id (user_id)
    ) ${TABLE_OPTIONS}`,
    `CREATE TABLE IF NOT EXISTS user_inventory (
        user_id BIGINT UNSIGNED NOT NULL,
        item_name VARCHAR(48) NOT NULL,
        amount BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_name)
    ) ${TABLE_OPTIONS}`,
];

/** Columns added to `users` over time. Missing ones are added on boot (idempotent). */
const USER_COLUMNS: Record<string, string> = {
    cash: 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
    bank: 'BIGINT UNSIGNED NOT NULL DEFAULT 0',
    hud_color: "CHAR(7) NOT NULL DEFAULT '#e9bd57'",
    hud_show_fps: 'TINYINT(1) NOT NULL DEFAULT 0',
    hud_show_own_nametag: 'TINYINT(1) NOT NULL DEFAULT 0',
    hud_speed_metric: 'TINYINT(1) NOT NULL DEFAULT 1',
    skin: "VARCHAR(64) NOT NULL DEFAULT 'mp_m_freemode_01'",
    admin: 'INT UNSIGNED NOT NULL DEFAULT 0',
    level: 'INT UNSIGNED NOT NULL DEFAULT 1',
    job: "VARCHAR(48) NOT NULL DEFAULT 'unemployed'",
    job_grade: 'INT UNSIGNED NOT NULL DEFAULT 0',
};

async function migrate(): Promise<void> {
    for (const sql of CREATE_TABLES) await db.query(sql);

    const existing = await db.query<{ name: string }>(
        `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
    );
    const present = new Set(existing.map((row) => row.name.toLowerCase()));
    const missing = Object.entries(USER_COLUMNS).filter(([name]) => !present.has(name));

    if (missing.length > 0) {
        await db.query(`ALTER TABLE users ${missing.map(([name, type]) => `ADD COLUMN \`${name}\` ${type}`).join(', ')}`);
        log.info(`Added users columns: ${missing.map(([name]) => name).join(', ')}`);
    }
}

let ready = false;
export const isDatabaseReady = () => ready;

/** Runs migrations, retrying with exponential backoff until the database is reachable. */
export async function initDatabase(): Promise<void> {
    for (let delay = 5_000; !ready; delay = Math.min(delay * 2, 60_000)) {
        try {
            await migrate();
            ready = true;
            log.info('Database schema is ready.');
        } catch (error) {
            log.error(`Database init failed, retrying in ${delay / 1000}s:`, error);
            await sleep(delay);
        }
    }
}
