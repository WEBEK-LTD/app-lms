CREATE TABLE `auto_notices` (
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`ref` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`sent_at` datetime(3) NOT NULL,
	CONSTRAINT `auto_notices_app_id_kind_ref_user_id_pk` PRIMARY KEY(`app_id`,`kind`,`ref`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `hosted_carts` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`items` int NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`reminded_at` datetime(3),
	CONSTRAINT `hosted_carts_app_id_user_id_pk` PRIMARY KEY(`app_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `data` longtext;--> statement-breakpoint
ALTER TABLE `auto_notices` ADD CONSTRAINT `auto_notices_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auto_notices` ADD CONSTRAINT `auto_notices_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_carts` ADD CONSTRAINT `hosted_carts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_carts` ADD CONSTRAINT `hosted_carts_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auto_notices_sent_idx` ON `auto_notices` (`sent_at`);--> statement-breakpoint
CREATE INDEX `hosted_carts_left_idx` ON `hosted_carts` (`updated_at`);