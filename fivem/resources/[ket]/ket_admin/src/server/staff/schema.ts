import { log } from '@shared/common/log.ts';
import { db } from '@shared/server/db.ts';

const TABLE = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

/** Staff tables, created on boot. Handlers `await staffSchema` before touching them. */
export const staffSchema: Promise<void> = (async () => {
    await db.query(`CREATE TABLE IF NOT EXISTS staff_tickets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        question VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'closed', 'rejected', 'abandoned') NOT NULL DEFAULT 'open',
        helper_id BIGINT UNSIGNED NULL,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        PRIMARY KEY (id),
        KEY staff_tickets_helper (helper_id, created_at)
    ) ${TABLE}`);
    await db.query(`CREATE TABLE IF NOT EXISTS staff_reports (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        message VARCHAR(255) NOT NULL,
        status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
        handled_by BIGINT UNSIGNED NULL,
        answer VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        PRIMARY KEY (id),
        KEY staff_reports_status (status),
        KEY staff_reports_handler (handled_by, created_at)
    ) ${TABLE}`);
    await db.query(`CREATE TABLE IF NOT EXISTS user_notes (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        author_id BIGINT UNSIGNED NOT NULL,
        note VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_notes_user (user_id)
    ) ${TABLE}`);
    log.info('Staff tables are ready.');
})().catch((error) => log.error('Could not create staff tables:', error));
