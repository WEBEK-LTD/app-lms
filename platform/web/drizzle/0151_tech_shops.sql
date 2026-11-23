CREATE TABLE `trade_in_requests` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`name` varchar(80) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`model` varchar(60) NOT NULL,
	`storage` varchar(20) NOT NULL,
	`grade` varchar(10) NOT NULL,
	`estimate_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`note` varchar(500),
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `trade_in_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `specs` longtext;--> statement-breakpoint
ALTER TABLE `trade_in_requests` ADD CONSTRAINT `trade_in_requests_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trade_in_requests` ADD CONSTRAINT `trade_in_requests_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `trade_in_requests_app_idx` ON `trade_in_requests` (`app_id`,`created_at`);