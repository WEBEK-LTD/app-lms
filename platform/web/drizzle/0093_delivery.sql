CREATE TABLE `couriers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`phone` varchar(24),
	`email` varchar(191),
	`vehicle` varchar(60),
	`active` boolean NOT NULL,
	`on_duty` boolean NOT NULL DEFAULT false,
	`lat` double,
	`lng` double,
	`located_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `couriers_id` PRIMARY KEY(`id`),
	CONSTRAINT `couriers_app_phone_unique` UNIQUE(`app_id`,`phone`),
	CONSTRAINT `couriers_app_email_unique` UNIQUE(`app_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `delivery_services` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(300),
	`image_asset_id` varchar(36),
	`extra_cents` bigint unsigned NOT NULL,
	`eta` varchar(60),
	`position` int NOT NULL,
	`active` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `delivery_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `delivery_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`sender_name` varchar(120) NOT NULL,
	`sender_phone` varchar(24),
	`service_id` bigint unsigned,
	`service_name` varchar(80),
	`pickup` longtext NOT NULL,
	`dropoff` longtext NOT NULL,
	`zone_id` varchar(32),
	`zone_name` varchar(80),
	`distance_km` double,
	`package_size` varchar(8) NOT NULL,
	`package_description` varchar(200),
	`recipient_name` varchar(80) NOT NULL,
	`recipient_phone` varchar(24) NOT NULL,
	`notes` varchar(300),
	`price_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`payment_method` varchar(8) NOT NULL,
	`payment_status` varchar(16) NOT NULL,
	`order_id` bigint unsigned,
	`status` varchar(20) NOT NULL,
	`courier_id` bigint unsigned,
	`courier_name` varchar(80),
	`timeline` longtext NOT NULL,
	`lang` varchar(8),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `shipments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `couriers` ADD CONSTRAINT `couriers_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_services` ADD CONSTRAINT `delivery_services_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_settings` ADD CONSTRAINT `delivery_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_service_id_delivery_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `delivery_services`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_courier_id_couriers_id_fk` FOREIGN KEY (`courier_id`) REFERENCES `couriers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `delivery_services_app_idx` ON `delivery_services` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `shipments_app_idx` ON `shipments` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `shipments_user_idx` ON `shipments` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `shipments_courier_idx` ON `shipments` (`app_id`,`courier_id`,`status`);