CREATE TABLE `app_layouts` (
	`app_id` varchar(36) NOT NULL,
	`draft` longtext NOT NULL,
	`draft_updated_at` datetime(3) NOT NULL,
	`published` longtext,
	`published_at` datetime(3),
	`published_by` varchar(191),
	`publish_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `app_layouts_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
ALTER TABLE `app_layouts` ADD CONSTRAINT `app_layouts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;