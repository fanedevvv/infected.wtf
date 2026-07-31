-- ═══════════════════════════════════════════════════════════════════════════
--  BioLink — Complete Database Schema (All-in-one)
--  Compatible with any database name — no USE statement.
--  Run this on a fresh database or use the ALTER statements for existing ones.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `username`            VARCHAR(30)  UNIQUE NOT NULL,
    `email`               VARCHAR(500)         NOT NULL,
    `email_blind_index`   VARCHAR(64)          DEFAULT NULL,
    `password`            VARCHAR(255) NOT NULL,
    `email_verified`      TINYINT(1)   NOT NULL DEFAULT 0,
    `cookie_consent`      ENUM('accepted','rejected') DEFAULT NULL,
    `last_login`          DATETIME     DEFAULT NULL,
    `login_notify`        TINYINT(1)   NOT NULL DEFAULT 1,
    `two_fa_enabled`      TINYINT(1)   NOT NULL DEFAULT 0,
    `two_fa_secret`       VARCHAR(64)  DEFAULT NULL,
    `switch_token`        VARCHAR(64)  DEFAULT NULL,
    `switch_token_expires` DATETIME    DEFAULT NULL,
    `is_admin`            TINYINT(1)   DEFAULT 0,
    `is_owner`            TINYINT(1)   DEFAULT 0,
    `is_mod`              TINYINT(1)   NOT NULL DEFAULT 0,
    `is_premium`          TINYINT(1)   DEFAULT 0,
    `premium_expires_at`  DATETIME     DEFAULT NULL,
    `banned`              TINYINT(1)   DEFAULT 0,
    `ban_until`           DATETIME     DEFAULT NULL,
    `remember_token`      VARCHAR(64)  DEFAULT NULL,
    `token_expires`       DATETIME     DEFAULT NULL,
    `tokens`              INT          DEFAULT 0,
    `tokens_spent`        INT          DEFAULT 0,
    `referral_code`       VARCHAR(20)  DEFAULT NULL UNIQUE,
    `referred_by`         VARCHAR(20)  DEFAULT NULL,
    `username_changed_at` DATETIME     DEFAULT NULL,
    `leaderboard_region_code` CHAR(2)     DEFAULT NULL,
    `leaderboard_region_name` VARCHAR(80) DEFAULT NULL,
    `reg_ip_hash`         VARCHAR(64)  DEFAULT NULL,
    `created_at`          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reg_ip_hash` (`reg_ip_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `profiles` (
    `id`               INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`          INT UNIQUE NOT NULL,
    `display_name`     VARCHAR(100) DEFAULT NULL,
    `bio`              VARCHAR(300) DEFAULT NULL,
    `location`         VARCHAR(100) DEFAULT NULL,
    `avatar`           VARCHAR(300) DEFAULT NULL,
    `background_type`  ENUM('color','gradient','image','video','particles') DEFAULT 'particles',
    `background_value` VARCHAR(500) DEFAULT '#050507',
    `accent_color`     VARCHAR(7)   DEFAULT '#00d4ff',
    `secondary_color`  VARCHAR(7)   DEFAULT '#ff00ff',
    `music_path`       VARCHAR(500) DEFAULT NULL,
    `cursor_path`      VARCHAR(500) DEFAULT NULL,
    `cursor_trail`     TINYINT(1)   DEFAULT 0,
    `particle_effect`  TINYINT(1)   DEFAULT 0,
    `profile_font`     VARCHAR(50)  DEFAULT 'Syne',
    `profile_opacity`  TINYINT UNSIGNED DEFAULT 100,
    `profile_blur`     TINYINT UNSIGNED DEFAULT 0,
    `typing_effect`    TINYINT(1)   DEFAULT 0,
    `views`            INT          DEFAULT 0,
    `badges`           JSON         DEFAULT NULL,
    `badge_hidden`     JSON         DEFAULT NULL,
    `badge_order`      JSON         DEFAULT NULL,
    `avatar_shape`     ENUM('square','soft','rounded','circle','heart','star','eye','diamond','egg','sun') NOT NULL DEFAULT 'circle',
    `avatar_ring`      ENUM('none','normal','premium') NOT NULL DEFAULT 'none',
    `local_views`      INT          DEFAULT 0,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Social Links ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `social_links` (
    `id`            INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`       INT NOT NULL,
    `platform`      VARCHAR(50)  NOT NULL,
    `url`           VARCHAR(500) NOT NULL,
    `display_order` INT DEFAULT 0,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Views Log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `views_log` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `profile_user_id` INT NOT NULL,
    `ip_hash`         VARCHAR(64) NOT NULL,
    `device_type`     VARCHAR(10) DEFAULT 'desktop',
    `country_code`    CHAR(2)     DEFAULT 'XX',
    `country_name`    VARCHAR(80) DEFAULT 'Unknown',
    `browser`         VARCHAR(50) DEFAULT 'Unknown',
    `os_name`         VARCHAR(50) DEFAULT 'Unknown',
    `viewed_at`       DATE NOT NULL,
    UNIQUE KEY `unique_view` (`profile_user_id`, `ip_hash`, `viewed_at`),
    FOREIGN KEY (`profile_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Link Clicks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `link_clicks` (
    `id`              INT AUTO_INCREMENT PRIMARY KEY,
    `profile_user_id` INT NOT NULL,
    `link_id`         INT NOT NULL,
    `link_title`      VARCHAR(200) DEFAULT NULL,
    `link_url`        VARCHAR(500) DEFAULT NULL,
    `ip_hash`         VARCHAR(64)  NOT NULL,
    `clicked_at`      DATE NOT NULL,
    FOREIGN KEY (`profile_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Integrations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `integrations` (
    `id`                  INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`             INT NOT NULL,
    `type`                VARCHAR(30)  NOT NULL DEFAULT 'discord',
    `discord_user_id`     VARCHAR(25)  DEFAULT NULL,
    `discord_username`    VARCHAR(100) DEFAULT NULL,
    `discord_global_name` VARCHAR(100) DEFAULT NULL,
    `discord_avatar`      VARCHAR(100) DEFAULT NULL,
    `discord_server_invite`  VARCHAR(255) DEFAULT NULL COMMENT 'Discord invite link (e.g. https://discord.gg/xyz)',
    `discord_server_id`      VARCHAR(30)  DEFAULT NULL COMMENT 'Guild ID fetched from Discord API',
    `discord_server_name`    VARCHAR(100) DEFAULT NULL COMMENT 'Guild name',
    `discord_server_icon`    VARCHAR(100) DEFAULT NULL COMMENT 'Guild icon hash',
    `discord_server_online`  INT          DEFAULT NULL COMMENT 'Online member count (cached)',
    `discord_server_total`   INT          DEFAULT NULL COMMENT 'Total member count (cached)',
    `discord_server_visible` TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'Visible on profile?',
    `discord_server_updated` DATETIME     DEFAULT NULL COMMENT 'Last time server data was refreshed',
    `visible`             TINYINT(1)   DEFAULT 1,
    `created_at`          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uniq_user_type` (`user_id`, `type`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Referrals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `referrals` (
    `id`           INT AUTO_INCREMENT PRIMARY KEY,
    `referrer_id`  INT NOT NULL,
    `referred_id`  INT NOT NULL UNIQUE,
    `tokens_given` INT DEFAULT 10,
    `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`referrer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`referred_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Email Verifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_verifications` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT NOT NULL,
    `token`      VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `used`       TINYINT(1) NOT NULL DEFAULT 0,
    `used_at`    DATETIME DEFAULT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_token`   (`token`),
    INDEX `idx_user_id` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Email Change Pending ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `email_change_pending` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT NOT NULL,
    `new_email`  VARCHAR(255) NOT NULL,
    `token`      VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_token`   (`token`),
    INDEX `idx_user_id` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Action Confirmations (password change, delete account, re-login) ──────────
CREATE TABLE IF NOT EXISTS `action_confirmations` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT NOT NULL,
    `action_type` VARCHAR(50) NOT NULL,
    `payload`     TEXT DEFAULT NULL,
    `token`       VARCHAR(64) NOT NULL UNIQUE,
    `expires_at`  DATETIME NOT NULL,
    `used`        TINYINT(1) NOT NULL DEFAULT 0,
    `used_at`     DATETIME DEFAULT NULL,
    `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_token`       (`token`),
    INDEX `idx_user_action` (`user_id`, `action_type`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Password Resets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `user_id`     INT UNSIGNED    NOT NULL,
    `token_hash`  VARCHAR(64)     NOT NULL COMMENT 'SHA-256 hash of the raw token',
    `expires_at`  DATETIME        NOT NULL COMMENT 'Token valid for 1 hour',
    `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_id`    (`user_id`),
    UNIQUE KEY `uq_token_hash` (`token_hash`),
    KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Login History (new device/location detection) ─────────────────────────────
CREATE TABLE IF NOT EXISTS `login_history` (
    `id`          INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`     INT NOT NULL,
    `ip_hash`     VARCHAR(64) NOT NULL,
    `ip_display`  VARCHAR(20) DEFAULT NULL,
    `device_type` VARCHAR(10) DEFAULT 'desktop',
    `browser`     VARCHAR(50) DEFAULT 'Unknown',
    `logged_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_ip` (`user_id`, `ip_hash`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Site Settings (whitelist / maintenance) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `site_settings` (
    `id`                INT AUTO_INCREMENT PRIMARY KEY,
    `whitelist_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `updated_at`        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by`        INT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default row (whitelist off)
INSERT IGNORE INTO `site_settings` (`id`, `whitelist_enabled`) VALUES (1, 0);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS `idx_users_is_mod` ON `users` (`is_mod`);

-- ═══════════════════════════════════════════════════════════════════════════
--  FOR EXISTING INSTALLATIONS — run only the ALTER statements below
--  (skip if you ran this file fresh on an empty database)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `email_verified`      TINYINT(1) NOT NULL DEFAULT 1 AFTER `email`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `last_login`          DATETIME   DEFAULT NULL AFTER `email_verified`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `login_notify`        TINYINT(1) NOT NULL DEFAULT 1 AFTER `last_login`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `two_fa_enabled`      TINYINT(1) NOT NULL DEFAULT 0 AFTER `login_notify`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `two_fa_secret`       VARCHAR(64) DEFAULT NULL AFTER `two_fa_enabled`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `switch_token`        VARCHAR(64) DEFAULT NULL AFTER `two_fa_secret`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `switch_token_expires` DATETIME DEFAULT NULL AFTER `switch_token`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_premium`          TINYINT(1) DEFAULT 0 AFTER `tokens`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `premium_expires_at`  DATETIME   DEFAULT NULL AFTER `is_premium`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_admin`            TINYINT(1) DEFAULT 0 AFTER `password`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_owner`            TINYINT(1) DEFAULT 0 AFTER `is_admin`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_mod`              TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_owner`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `banned`              TINYINT(1) DEFAULT 0;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `ban_until`           DATETIME   DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `remember_token`      VARCHAR(64) DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `token_expires`       DATETIME   DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tokens`              INT DEFAULT 0;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `tokens_spent`        INT DEFAULT 0;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `referral_code`       VARCHAR(20) DEFAULT NULL UNIQUE;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `referred_by`          VARCHAR(20) DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `username_changed_at` DATETIME   DEFAULT NULL;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `email_blind_index`   VARCHAR(64) DEFAULT NULL AFTER `email`;
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `cookie_consent`      ENUM('accepted','rejected') DEFAULT NULL;
-- ALTER TABLE `users` MODIFY COLUMN `email`                          VARCHAR(500) NOT NULL;
-- CREATE INDEX IF NOT EXISTS `idx_users_email_blind` ON `users` (`email_blind_index`);
--
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `cursor_path`     VARCHAR(500) DEFAULT NULL;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `badges`          JSON DEFAULT NULL;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `badge_hidden`    JSON DEFAULT NULL;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `badge_order`     JSON DEFAULT NULL;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `typing_effect`   TINYINT(1) DEFAULT 0;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `profile_opacity` TINYINT UNSIGNED DEFAULT 100;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `profile_blur`    TINYINT UNSIGNED DEFAULT 0;
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `avatar_shape`    ENUM('square','soft','rounded','circle','heart','star','eye','diamond','egg','sun') NOT NULL DEFAULT 'circle';
-- ALTER TABLE `profiles` ADD COLUMN IF NOT EXISTS `avatar_ring`     ENUM('none','normal','premium') NOT NULL DEFAULT 'none';
-- ▼ Dacă coloana există deja cu ENUM vechi, rulează asta pentru a extinde valorile:
ALTER TABLE `profiles` MODIFY COLUMN `avatar_shape` ENUM('square','soft','rounded','circle','heart','star','eye','diamond','egg','sun') NOT NULL DEFAULT 'circle';
--
-- UPDATE `users` SET `email_verified` = 1 WHERE `email_verified` = 0;
-- UPDATE `users` SET `last_login` = `created_at` WHERE `last_login` IS NULL;

-- ── Badge-uri noi (v2) ────────────────────────────────────────────────────────
-- Rulează pe instalări existente (ignorat dacă deja există):
--
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `usd_spent` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `tokens_spent`;
-- Coloana `usd_spent` urmărește totalul cheltuit în EUR/USD (premium €7 = $7 per achiziție).
-- Badge-ul 'billionaire' se acordă manual din admin panel când usd_spent >= 10.
--
-- Badge-uri noi în profiles.badges (JSON array):
--   'lover'           → cumpărat din shop (300 tokens)
--   'fresh'           → cumpărat din shop (50 tokens)
--   'crew'            → acordat manual din admin panel (idei implementate)
--   'billionaire'     → acordat manual din admin panel (>$10 cheltuiți în shop)
--   'promoter'        → automat după 10 referrals (gri)
--   'promoter_elite'  → automat după 20 referrals (gri+negru, înlocuiește 'promoter')
--   'content_creator' → acordat manual din admin panel (creator de conținut)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Migrare badge-uri discord (rulează o singură dată, după CREATE TABLE-uri) ──
--
-- Badge-ul 'discord' se acordă automat când userul conectează Discord OAuth.
-- Badge-ul 'booster' se acordă automat de botu Discord via /api/internal_badge.php.
-- Ambele sunt stocate în coloana `profiles.badges` (JSON array).
--
-- Dacă ai useri care au deja Discord conectat dar badge-ul 'discord' lipsește
-- din profiles.badges, rulează query-ul de mai jos:
--
UPDATE `profiles` p
  INNER JOIN `integrations` i ON i.user_id = p.user_id AND i.type = 'discord'
  SET p.`badges` = JSON_ARRAY_APPEND(
      COALESCE(p.`badges`, JSON_ARRAY()),
      '$', 'discord'
  )
  WHERE JSON_SEARCH(COALESCE(p.`badges`, '[]'), 'one', 'discord') IS NULL;
--
-- Nu există migrare pentru 'booster' — se acordă exclusiv de botu Discord.
-- ─────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- ── Notifications (adăugat prin migration) ───────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notifications` (
    `id`         INT AUTO_INCREMENT PRIMARY KEY,
    `user_id`    INT NOT NULL,
    `type`       VARCHAR(50)  NOT NULL,
    `title`      VARCHAR(200) NOT NULL,
    `body`       VARCHAR(500) DEFAULT NULL,
    `icon`       VARCHAR(50)  DEFAULT 'bell',
    `link`       VARCHAR(300) DEFAULT NULL,
    `is_read`    TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at` DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_unread` (`user_id`, `is_read`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ── Effects System (v3) ───────────────────────────────────────────────────────
-- Run on existing installations:
--
ALTER TABLE `profiles`
    ADD COLUMN IF NOT EXISTS `purchased_effects` JSON DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS `active_effects`    JSON DEFAULT NULL;
--
-- purchased_effects: JSON array of owned effect IDs
--   e.g. ["cursor_fire","avatar_crown","bg_hell"]
-- active_effects: JSON object of currently active effects per slot
--   e.g. {"cursor":"cursor_fire","avatar":"avatar_crown","bg":"bg_hell"}
-- ── IP Registration Limit ─────────────────────────────────────────────────────
-- Run on existing installations (skip if fresh install — already in CREATE TABLE):
--
ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `reg_ip_hash` VARCHAR(64) DEFAULT NULL AFTER `created_at`;
ALTER TABLE `users`
    ADD INDEX IF NOT EXISTS `idx_reg_ip_hash` (`reg_ip_hash`);