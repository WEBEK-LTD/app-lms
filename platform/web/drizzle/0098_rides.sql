CREATE TABLE `rides` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`rider_name` varchar(120) NOT NULL,
	`rider_phone` varchar(24),
	`vehicle_type_id` bigint unsigned,
	`vehicle_type_name` varchar(60) NOT NULL,
	`vehicle_type_icon` varchar(60) NOT NULL,
	`fares` longtext NOT NULL,
	`fare_mode` varchar(8) NOT NULL,
	`pickup` longtext NOT NULL,
	`dropoff` longtext NOT NULL,
	`scheduled_at` datetime(3),
	`estimate_km` double NOT NULL,
	`estimate_minutes` int NOT NULL,
	`quoted_cents` bigint unsigned NOT NULL,
	`promo_code` varchar(40),
	`discount_cents` bigint unsigned NOT NULL,
	`previous_fee_cents` bigint unsigned NOT NULL,
	`previous_fee_ride_id` bigint unsigned,
	`final_cents` bigint unsigned,
	`meter_km` double NOT NULL,
	`ride_minutes` int,
	`wait_minutes` int,
	`commission_bp` int,
	`commission_cents` bigint unsigned,
	`currency` varchar(3) NOT NULL,
	`payment_method` varchar(8) NOT NULL,
	`payment_status` varchar(16) NOT NULL,
	`order_id` bigint unsigned,
	`status` varchar(20) NOT NULL,
	`pin` varchar(4),
	`notes` varchar(300),
	`driver_id` bigint unsigned,
	`driver_name` varchar(80),
	`offered_to` bigint unsigned,
	`offer_expires_at` datetime(3),
	`declined_by` longtext NOT NULL,
	`searching_since` datetime(3),
	`cancellation` longtext,
	`fee_carried_to` bigint unsigned,
	`share_token` varchar(40),
	`rating` longtext,
	`timeline` longtext NOT NULL,
	`lang` varchar(8),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`),
	CONSTRAINT `rides_share_unique` UNIQUE(`share_token`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_types` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(60) NOT NULL,
	`description` varchar(200),
	`icon` varchar(60) NOT NULL,
	`image_asset_id` varchar(36),
	`seats` int NOT NULL,
	`base_cents` bigint unsigned NOT NULL,
	`per_km_cents` bigint unsigned NOT NULL,
	`per_minute_cents` bigint unsigned NOT NULL,
	`min_cents` bigint unsigned NOT NULL,
	`wait_per_minute_cents` bigint unsigned NOT NULL,
	`position` int NOT NULL,
	`active` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `vehicle_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `couriers` ADD `driver` longtext;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_vehicle_type_id_vehicle_types_id_fk` FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_driver_id_couriers_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `couriers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_types` ADD CONSTRAINT `vehicle_types_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `rides_app_idx` ON `rides` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `rides_user_idx` ON `rides` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `rides_driver_idx` ON `rides` (`app_id`,`driver_id`,`status`);--> statement-breakpoint
CREATE INDEX `rides_offer_idx` ON `rides` (`app_id`,`offered_to`);--> statement-breakpoint
CREATE INDEX `vehicle_types_app_idx` ON `vehicle_types` (`app_id`,`position`);