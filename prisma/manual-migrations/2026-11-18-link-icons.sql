-- Custom logo for a social link (Infected Plus): path under public/uploads/link-icons, NULL = platform icon.
ALTER TABLE `social_links` ADD COLUMN `icon_url` VARCHAR(255) NULL DEFAULT NULL AFTER `url`;
