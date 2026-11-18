-- 165 The app's stories (Dashboard › Stories), served into the Studio story elements whose source is the dashboard once the owner has saved them there (apps.stories_saved_at; until then the Studio design); each story copied from the Studio design once (import_key), and when the app's were copied (apps.stories_seeded_at).
CREATE TABLE `app_stories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`category_id` varchar(64),
	`import_key` varchar(191),
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `app_stories_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_stories_import_unique` UNIQUE(`app_id`,`import_key`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `stories_seeded_at` datetime(3);--> statement-breakpoint
ALTER TABLE `apps` ADD `stories_saved_at` datetime(3);--> statement-breakpoint
ALTER TABLE `app_stories` ADD CONSTRAINT `app_stories_app_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_stories_app_idx` ON `app_stories` (`app_id`,`position`);