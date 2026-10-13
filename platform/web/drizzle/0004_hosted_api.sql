CREATE TABLE `hosted_challenges` (
	`token_hash` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code_hash` varchar(64),
	`attempts` int NOT NULL,
	`review` boolean NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_challenges_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `hosted_devices` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`device_id` varchar(64) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`name` varchar(100) NOT NULL,
	`app_version` varchar(20) NOT NULL,
	`push_token` varchar(512),
	`push_preferences` longtext,
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `hosted_devices_unique` UNIQUE(`user_id`,`device_id`)
);
--> statement-breakpoint
CREATE TABLE `hosted_notifications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`title` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hosted_refresh_tokens` (
	`token_hash` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`device_row_id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_refresh_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `hosted_users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191),
	`city` varchar(120),
	`notifications_read_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `hosted_users_phone_unique` UNIQUE(`app_id`,`phone`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `hosted_settings` longtext;--> statement-breakpoint
ALTER TABLE `apps` ADD `firebase_service_account_encrypted` text;--> statement-breakpoint
ALTER TABLE `hosted_challenges` ADD CONSTRAINT `hosted_challenges_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_devices` ADD CONSTRAINT `hosted_devices_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_devices` ADD CONSTRAINT `hosted_devices_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD CONSTRAINT `hosted_notifications_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD CONSTRAINT `hosted_notifications_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_refresh_tokens` ADD CONSTRAINT `hosted_refresh_tokens_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_refresh_tokens` ADD CONSTRAINT `hosted_refresh_tokens_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_refresh_tokens` ADD CONSTRAINT `hosted_refresh_tokens_device_row_id_hosted_devices_id_fk` FOREIGN KEY (`device_row_id`) REFERENCES `hosted_devices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_users` ADD CONSTRAINT `hosted_users_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `hosted_challenges_expires_idx` ON `hosted_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `hosted_devices_app_idx` ON `hosted_devices` (`app_id`);--> statement-breakpoint
CREATE INDEX `hosted_notifications_app_idx` ON `hosted_notifications` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `hosted_refresh_tokens_device_idx` ON `hosted_refresh_tokens` (`device_row_id`);