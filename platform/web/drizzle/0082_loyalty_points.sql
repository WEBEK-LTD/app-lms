CREATE TABLE `loyalty_balances` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`balance` int NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `loyalty_balances_app_id_user_id_pk` PRIMARY KEY(`app_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned,
	`points` int NOT NULL,
	`reason` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `loyalty_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `points` longtext;--> statement-breakpoint
ALTER TABLE `loyalty_balances` ADD CONSTRAINT `loyalty_balances_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_balances` ADD CONSTRAINT `loyalty_balances_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_entries` ADD CONSTRAINT `loyalty_entries_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_entries` ADD CONSTRAINT `loyalty_entries_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `loyalty_entries_user_idx` ON `loyalty_entries` (`app_id`,`user_id`,`id`);