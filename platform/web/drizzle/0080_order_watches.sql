CREATE TABLE `hosted_order_watches` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`orders` longtext NOT NULL,
	`checked_at` datetime(3),
	`until_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_order_watches_app_id_user_id_pk` PRIMARY KEY(`app_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `hosted_order_watches` ADD CONSTRAINT `hosted_order_watches_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_order_watches` ADD CONSTRAINT `hosted_order_watches_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hosted_order_watches_due_idx` ON `hosted_order_watches` (`until_at`,`checked_at`);