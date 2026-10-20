CREATE TABLE `owner_devices` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`app_version` varchar(20),
	`language` varchar(8),
	`refresh_hash` varchar(64) NOT NULL,
	`refresh_expires_at` datetime(3) NOT NULL,
	`session_version` int NOT NULL,
	`push_token` varchar(512),
	`push_provider` varchar(4) NOT NULL DEFAULT 'fcm',
	`push_preferences` longtext,
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	CONSTRAINT `owner_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_devices_refresh_unique` UNIQUE(`refresh_hash`)
);
--> statement-breakpoint
ALTER TABLE `owner_devices` ADD CONSTRAINT `owner_devices_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owner_devices` ADD CONSTRAINT `owner_devices_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `owner_devices_user_idx` ON `owner_devices` (`user_id`,`last_seen_at`);--> statement-breakpoint
CREATE INDEX `owner_devices_push_idx` ON `owner_devices` (`push_token`);--> statement-breakpoint
CREATE INDEX `owner_devices_expires_idx` ON `owner_devices` (`refresh_expires_at`);