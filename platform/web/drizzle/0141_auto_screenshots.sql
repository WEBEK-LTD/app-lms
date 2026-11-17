ALTER TABLE `assets` MODIFY COLUMN `kind` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `auto_screenshots` longtext;