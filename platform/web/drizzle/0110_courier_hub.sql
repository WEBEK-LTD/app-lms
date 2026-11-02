CREATE TABLE `courier_accounts` (
	`id` varchar(36) NOT NULL,
	`phone` varchar(24),
	`email` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`last_sign_in_at` datetime(3) NOT NULL,
	CONSTRAINT `courier_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `courier_accounts_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `courier_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `courier_challenges` (
	`token_hash` varchar(64) NOT NULL,
	`phone` varchar(24),
	`email` varchar(191),
	`code_hash` varchar(64),
	`attempts` int NOT NULL,
	`review` boolean NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `courier_challenges_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `courier_devices` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(36) NOT NULL,
	`device_id` varchar(64) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`name` varchar(100) NOT NULL,
	`app_version` varchar(20) NOT NULL,
	`refresh_hash` varchar(64) NOT NULL,
	`refresh_expires_at` datetime(3) NOT NULL,
	`push_token` varchar(512),
	`push_provider` varchar(4) NOT NULL DEFAULT 'fcm',
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	CONSTRAINT `courier_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `courier_devices_refresh_unique` UNIQUE(`refresh_hash`)
);
--> statement-breakpoint
ALTER TABLE `couriers` ADD `hub_signed_in_at` datetime(3);--> statement-breakpoint
ALTER TABLE `hosted_devices` ADD `courier_device_id` varchar(36);--> statement-breakpoint
ALTER TABLE `courier_devices` ADD CONSTRAINT `courier_devices_account_id_courier_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `courier_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `courier_challenges_expires_idx` ON `courier_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `courier_devices_account_idx` ON `courier_devices` (`account_id`,`last_seen_at`);--> statement-breakpoint
CREATE INDEX `courier_devices_push_idx` ON `courier_devices` (`push_token`);--> statement-breakpoint
ALTER TABLE `hosted_devices` ADD CONSTRAINT `hosted_devices_courier_device_id_courier_devices_id_fk` FOREIGN KEY (`courier_device_id`) REFERENCES `courier_devices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `couriers_phone_idx` ON `couriers` (`phone`);--> statement-breakpoint
CREATE INDEX `couriers_email_idx` ON `couriers` (`email`);--> statement-breakpoint
CREATE INDEX `hosted_devices_courier_idx` ON `hosted_devices` (`courier_device_id`);