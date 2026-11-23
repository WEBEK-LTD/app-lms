CREATE TABLE `store_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`title` varchar(200) NOT NULL,
	`answers` longtext NOT NULL,
	`customer` longtext NOT NULL,
	`status` varchar(12) NOT NULL,
	`reply` varchar(2000),
	`quote_cents` bigint unsigned,
	`currency` varchar(3) NOT NULL,
	`lang` varchar(8),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `dimensions` longtext;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `make_days` longtext;--> statement-breakpoint
ALTER TABLE `store_requests` ADD CONSTRAINT `store_requests_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_requests` ADD CONSTRAINT `store_requests_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `store_requests_app_idx` ON `store_requests` (`app_id`,`status`,`created_at`);