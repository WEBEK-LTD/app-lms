CREATE TABLE `food_orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`restaurant_id` bigint unsigned,
	`restaurant_name` varchar(80) NOT NULL,
	`user_id` bigint unsigned,
	`customer_name` varchar(120) NOT NULL,
	`customer_phone` varchar(24) NOT NULL,
	`order_lines` longtext NOT NULL,
	`subtotal_cents` bigint unsigned NOT NULL,
	`delivery_fee_cents` bigint unsigned NOT NULL,
	`total_cents` bigint unsigned NOT NULL,
	`commission_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`payment_method` varchar(8) NOT NULL,
	`payment_status` varchar(16) NOT NULL,
	`order_id` bigint unsigned,
	`status` varchar(20) NOT NULL,
	`dropoff` longtext NOT NULL,
	`zone_id` varchar(32),
	`distance_km` double,
	`notes` varchar(300),
	`ready_at` datetime(3),
	`rejection` longtext,
	`shipment_id` bigint unsigned,
	`rating` longtext,
	`timeline` longtext NOT NULL,
	`lang` varchar(8),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `food_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_staff` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`restaurant_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`phone` varchar(24),
	`email` varchar(191),
	`active` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `restaurant_staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `restaurant_staff_app_phone_unique` UNIQUE(`app_id`,`phone`),
	CONSTRAINT `restaurant_staff_app_email_unique` UNIQUE(`app_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(500),
	`logo_asset_id` varchar(36),
	`cover_asset_id` varchar(36),
	`cuisines` longtext NOT NULL,
	`address` longtext NOT NULL,
	`phone` varchar(24),
	`hours` longtext NOT NULL,
	`prep_minutes` int NOT NULL,
	`min_order_cents` bigint unsigned NOT NULL,
	`max_km` double,
	`commission_bp` int NOT NULL,
	`active` boolean NOT NULL,
	`busy_until` datetime(3),
	`rating_sum` int NOT NULL DEFAULT 0,
	`rating_count` int NOT NULL DEFAULT 0,
	`position` int NOT NULL,
	`menu` longtext NOT NULL,
	`dish_names` text NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `restaurants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `shipments` ADD `food_order_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `food_orders` ADD CONSTRAINT `food_orders_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `food_orders` ADD CONSTRAINT `food_orders_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `food_orders` ADD CONSTRAINT `food_orders_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_staff` ADD CONSTRAINT `restaurant_staff_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurant_staff` ADD CONSTRAINT `restaurant_staff_restaurant_id_restaurants_id_fk` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `food_orders_app_idx` ON `food_orders` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `food_orders_user_idx` ON `food_orders` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `food_orders_restaurant_idx` ON `food_orders` (`app_id`,`restaurant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `restaurants_app_idx` ON `restaurants` (`app_id`,`position`);