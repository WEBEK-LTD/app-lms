CREATE TABLE `market_complaints` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`vendor_id` bigint unsigned,
	`user_id` bigint unsigned,
	`reason` varchar(20) NOT NULL,
	`text` varchar(2000) NOT NULL,
	`line_ids` longtext NOT NULL,
	`photo_asset_ids` longtext NOT NULL,
	`status` varchar(24) NOT NULL,
	`assignee` varchar(191),
	`shared_with_vendor` boolean NOT NULL,
	`messages` longtext NOT NULL,
	`notes` longtext NOT NULL,
	`decision` longtext,
	`answered_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned,
	`vendor_name` varchar(80) NOT NULL,
	`vendor_kind` varchar(16) NOT NULL,
	`user_id` bigint unsigned,
	`customer_name` varchar(80) NOT NULL,
	`customer_phone` varchar(24) NOT NULL,
	`fulfilment` varchar(12) NOT NULL,
	`delivery_by` varchar(8),
	`scheduled_for` datetime(3),
	`lines` longtext NOT NULL,
	`money` longtext NOT NULL,
	`total` bigint NOT NULL,
	`currency` varchar(3) NOT NULL,
	`payment_method` varchar(12) NOT NULL,
	`payment_status` varchar(16) NOT NULL,
	`payment_ref` varchar(120),
	`coupon_code` varchar(40),
	`status` varchar(20) NOT NULL,
	`dropoff` longtext,
	`distance_km` double,
	`notes` varchar(300),
	`pickup_code` varchar(4),
	`prep_minutes` int,
	`ready_at` datetime(3),
	`rejection` longtext,
	`shipment_id` bigint unsigned,
	`rating` longtext,
	`timeline` longtext NOT NULL,
	`completed_at` datetime(3),
	`lang` varchar(8),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallet_entries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`kind` varchar(12) NOT NULL,
	`amount` bigint NOT NULL,
	`label` varchar(160) NOT NULL,
	`order_id` bigint unsigned,
	`complaint_id` bigint unsigned,
	`entry_key` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `wallet_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallet_entries_app_key_unique` UNIQUE(`app_id`,`entry_key`)
);
--> statement-breakpoint
ALTER TABLE `market_complaints` ADD CONSTRAINT `market_complaints_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_complaints` ADD CONSTRAINT `market_complaints_order_id_market_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `market_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_complaints` ADD CONSTRAINT `market_complaints_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_orders` ADD CONSTRAINT `market_orders_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_orders` ADD CONSTRAINT `market_orders_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_entries` ADD CONSTRAINT `wallet_entries_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `market_complaints_app_idx` ON `market_complaints` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_complaints_user_idx` ON `market_complaints` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_complaints_vendor_idx` ON `market_complaints` (`app_id`,`vendor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_complaints_order_idx` ON `market_complaints` (`app_id`,`order_id`);--> statement-breakpoint
CREATE INDEX `market_orders_app_idx` ON `market_orders` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_orders_user_idx` ON `market_orders` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_orders_vendor_idx` ON `market_orders` (`app_id`,`vendor_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_orders_completed_idx` ON `market_orders` (`app_id`,`vendor_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `wallet_entries_user_idx` ON `wallet_entries` (`app_id`,`user_id`,`created_at`);