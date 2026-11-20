-- Collectibles (nameplates + profile effects), limited drops, crews and quests.

-- Owned / equipped cosmetics live on the profile, like decorations.
ALTER TABLE `profiles`
  ADD COLUMN `nameplates_owned` LONGTEXT NULL AFTER `active_decoration`,
  ADD COLUMN `active_nameplate` VARCHAR(30) NULL AFTER `nameplates_owned`,
  ADD COLUMN `profile_effects_owned` LONGTEXT NULL AFTER `active_nameplate`,
  ADD COLUMN `active_profile_effect` VARCHAR(30) NULL AFTER `profile_effects_owned`;

-- Limited drops: one row per minted copy; serial is 1..supply per item, one copy per user.
CREATE TABLE `collectible_mints` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `item_key` VARCHAR(40) NOT NULL,
  `serial` INT NOT NULL,
  `user_id` INT NOT NULL,
  `minted_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_mint_serial` (`item_key`, `serial`),
  UNIQUE KEY `uniq_mint_user` (`item_key`, `user_id`),
  KEY `idx_mint_user` (`user_id`),
  CONSTRAINT `fk_mint_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crews: a tag shown next to members' names everywhere, a page, a leaderboard.
CREATE TABLE `crews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tag` VARCHAR(4) NOT NULL,
  `name` VARCHAR(40) NOT NULL,
  `description` VARCHAR(300) NULL,
  `color` VARCHAR(7) NOT NULL DEFAULT '#c6ff3d',
  `emblem` VARCHAR(20) NOT NULL DEFAULT 'biohazard',
  `owner_id` INT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_crew_tag` (`tag`),
  KEY `idx_crew_owner` (`owner_id`),
  CONSTRAINT `fk_crew_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crew_members` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `crew_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` VARCHAR(10) NOT NULL DEFAULT 'member',
  `joined_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_crew_member_user` (`user_id`),
  KEY `idx_crew_member_crew` (`crew_id`),
  CONSTRAINT `fk_crew_member_crew` FOREIGN KEY (`crew_id`) REFERENCES `crews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crew_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `crew_invites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `crew_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `invited_by` INT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_crew_invite` (`crew_id`, `user_id`),
  KEY `idx_crew_invite_user` (`user_id`),
  CONSTRAINT `fk_crew_invite_crew` FOREIGN KEY (`crew_id`) REFERENCES `crews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crew_invite_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quests: one row per claimed reward per period (daily = YYYY-MM-DD, weekly = YYYY-Www, once = "once").
CREATE TABLE `quest_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `quest_id` VARCHAR(40) NOT NULL,
  `period` VARCHAR(12) NOT NULL,
  `claimed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_quest_claim` (`user_id`, `quest_id`, `period`),
  CONSTRAINT `fk_quest_claim_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
