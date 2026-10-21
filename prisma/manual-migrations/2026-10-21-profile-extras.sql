-- CreateTable
CREATE TABLE `profile_projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `title` VARCHAR(80) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `url` VARCHAR(300) NULL,
    `repo_url` VARCHAR(300) NULL,
    `technologies` VARCHAR(500) NULL,
    `image` VARCHAR(300) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reject_reason` VARCHAR(300) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewed_at` DATETIME(0) NULL,

    INDEX `idx_pp_profile_status`(`profile_id`, `status`),
    INDEX `idx_pp_status_created`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_aliases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `alias` VARCHAR(30) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uniq_alias`(`alias`),
    INDEX `fk_pa_profile`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_best_friends` (
    `profile_id` INTEGER NOT NULL,
    `friend_profile_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_pbf_friend`(`friend_profile_id`),
    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_skills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 50,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_ps_profile`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_projects` ADD CONSTRAINT `fk_pp_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_aliases` ADD CONSTRAINT `fk_pa_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_best_friends` ADD CONSTRAINT `fk_pbf_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_best_friends` ADD CONSTRAINT `fk_pbf_friend` FOREIGN KEY (`friend_profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_skills` ADD CONSTRAINT `fk_ps_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

