CREATE TABLE `app_layout_versions` (
	`app_id` varchar(36) NOT NULL,
	`number` int NOT NULL,
	`layout` longtext NOT NULL,
	`published_at` datetime(3) NOT NULL,
	`published_by` varchar(191),
	CONSTRAINT `app_layout_versions_app_id_number_pk` PRIMARY KEY(`app_id`,`number`)
);
--> statement-breakpoint
ALTER TABLE `app_layout_versions` ADD CONSTRAINT `app_layout_versions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;