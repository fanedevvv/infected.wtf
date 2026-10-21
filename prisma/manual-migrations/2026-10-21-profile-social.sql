-- CreateTable
CREATE TABLE `profile_dislikes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_user_id` INTEGER NOT NULL,
    `disliker_user_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_pd_disliker`(`disliker_user_id`),
    UNIQUE INDEX `uniq_profile_disliker`(`profile_user_id`, `disliker_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `author_id` INTEGER NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_pc_profile_created`(`profile_id`, `created_at`),
    INDEX `fk_pc_author`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_comment_likes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comment_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_pcl_user`(`user_id`),
    UNIQUE INDEX `uniq_comment_user`(`comment_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `reporter_id` INTEGER NULL,
    `ip_hash` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(30) NOT NULL,
    `details` VARCHAR(1000) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `resolved_at` DATETIME(0) NULL,

    INDEX `fk_pr_profile`(`profile_id`),
    INDEX `fk_pr_reporter`(`reporter_id`),
    INDEX `idx_pr_status_created`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profile_dislikes` ADD CONSTRAINT `fk_pd_disliker` FOREIGN KEY (`disliker_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_dislikes` ADD CONSTRAINT `fk_pd_profile` FOREIGN KEY (`profile_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_comments` ADD CONSTRAINT `fk_pc_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_comments` ADD CONSTRAINT `fk_pc_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_comment_likes` ADD CONSTRAINT `fk_pcl_comment` FOREIGN KEY (`comment_id`) REFERENCES `profile_comments`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_comment_likes` ADD CONSTRAINT `fk_pcl_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_reports` ADD CONSTRAINT `fk_pr_profile` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `profile_reports` ADD CONSTRAINT `fk_pr_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

