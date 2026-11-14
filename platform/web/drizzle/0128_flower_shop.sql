CREATE TABLE `store_deliveries` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`delivery_date` varchar(10),
	`slot_id` varchar(16),
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `store_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_flash_sales` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(80) NOT NULL,
	`data` longtext NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3) NOT NULL,
	`unit_limit` int,
	`sold` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_flash_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_gift_occasions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`occasion_key` varchar(24),
	`position` int NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_gift_occasions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_coupons` ADD `starts_at` datetime(3);--> statement-breakpoint
ALTER TABLE `catalog_coupons` ADD `in_app` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `delivery` longtext;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `delivery_date` varchar(10);--> statement-breakpoint
ALTER TABLE `store_deliveries` ADD CONSTRAINT `store_deliveries_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_deliveries` ADD CONSTRAINT `store_deliveries_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_flash_sales` ADD CONSTRAINT `store_flash_sales_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_gift_occasions` ADD CONSTRAINT `store_gift_occasions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `store_deliveries_day_idx` ON `store_deliveries` (`app_id`,`delivery_date`);--> statement-breakpoint
CREATE INDEX `store_deliveries_created_idx` ON `store_deliveries` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `store_flash_sales_app_idx` ON `store_flash_sales` (`app_id`,`ends_at`);--> statement-breakpoint
CREATE INDEX `store_gift_occasions_app_idx` ON `store_gift_occasions` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `catalog_orders_delivery_idx` ON `catalog_orders` (`app_id`,`delivery_date`);