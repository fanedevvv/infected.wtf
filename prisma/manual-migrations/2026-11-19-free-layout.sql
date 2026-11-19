-- Free Mode layout: where the owner placed each profile element (JSON, see lib/free-layout.ts). NULL = default arrangement.
ALTER TABLE `profiles` ADD COLUMN `free_layout` TEXT NULL AFTER `layout_template`;
