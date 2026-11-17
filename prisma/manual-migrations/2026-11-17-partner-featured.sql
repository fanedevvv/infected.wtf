-- "Main partner" flag: featured partners get a large highlighted card at the top of /partners.
ALTER TABLE `partners` ADD COLUMN `featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `active`;
