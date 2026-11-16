CREATE TABLE `prime_gifts` (
	`app_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`until` datetime(3),
	`note` text,
	`given_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `prime_gifts_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `delivery_stage` varchar(16);--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `stage_log` longtext;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `stage_refund` longtext;--> statement-breakpoint
ALTER TABLE `prime_gifts` ADD CONSTRAINT `prime_gifts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prime_gifts` ADD CONSTRAINT `prime_gifts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `prime_gifts_client_idx` ON `prime_gifts` (`client_id`);