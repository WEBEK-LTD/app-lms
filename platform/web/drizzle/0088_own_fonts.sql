CREATE TABLE `own_fonts` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`family` varchar(64) NOT NULL,
	`files` longtext NOT NULL,
	`size_bytes` int NOT NULL,
	`licence_confirmed_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `own_fonts_id` PRIMARY KEY(`id`),
	CONSTRAINT `own_fonts_app_family_idx` UNIQUE(`app_id`,`family`)
);
--> statement-breakpoint
ALTER TABLE `own_fonts` ADD CONSTRAINT `own_fonts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;