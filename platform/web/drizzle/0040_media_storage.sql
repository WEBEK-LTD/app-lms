-- Videos and pictures hosted by Yallapp (roadmap 51): each app's Media library (media_files; the files are on Yallapp's own server), the storage packs it bought (storage_packs), and what a card payment pays (a plan, or storage packs) on plan_payments.
CREATE TABLE `media_files` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` bigint unsigned NOT NULL,
	`storage_key` varchar(300) NOT NULL,
	`status` varchar(12) NOT NULL,
	`public` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `media_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storage_packs` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`offer` varchar(32) NOT NULL,
	`gb` int NOT NULL,
	`active_until` datetime(3) NOT NULL,
	`payment_id` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`ended_notice_at` datetime(3),
	CONSTRAINT `storage_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `purpose` varchar(8);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `storage_packs` longtext;--> statement-breakpoint
ALTER TABLE `media_files` ADD CONSTRAINT `media_files_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storage_packs` ADD CONSTRAINT `storage_packs_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storage_packs` ADD CONSTRAINT `storage_packs_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `media_files_app_idx` ON `media_files` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_files_status_idx` ON `media_files` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `storage_packs_app_idx` ON `storage_packs` (`app_id`,`active_until`);--> statement-breakpoint
CREATE INDEX `storage_packs_until_idx` ON `storage_packs` (`active_until`);