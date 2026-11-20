-- Groups (the evolution of crews, like rage.wtf groups): media, join policy, links, join requests and boosts.
ALTER TABLE `crews`
  ADD COLUMN `icon` VARCHAR(200) NULL AFTER `emblem`,
  ADD COLUMN `banner` VARCHAR(200) NULL AFTER `icon`,
  ADD COLUMN `strip` VARCHAR(200) NULL AFTER `banner`,
  ADD COLUMN `join_policy` VARCHAR(10) NOT NULL DEFAULT 'request' AFTER `strip`,
  ADD COLUMN `links` TEXT NULL AFTER `join_policy`;

-- "Ask to join": one pending request per user per group.
CREATE TABLE `crew_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `crew_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_crew_request` (`crew_id`, `user_id`),
  KEY `idx_crew_request_user` (`user_id`),
  CONSTRAINT `fk_crew_request_crew` FOREIGN KEY (`crew_id`) REFERENCES `crews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crew_request_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Boosts: anyone can boost a group with tokens for 30 days; active boosts set the group's level.
CREATE TABLE `crew_boosts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `crew_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_crew_boost_crew` (`crew_id`, `expires_at`),
  KEY `idx_crew_boost_user` (`user_id`),
  CONSTRAINT `fk_crew_boost_crew` FOREIGN KEY (`crew_id`) REFERENCES `crews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_crew_boost_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
