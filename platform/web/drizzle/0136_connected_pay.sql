CREATE TABLE `store_platform_orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`platform` varchar(24) NOT NULL,
	`status` varchar(24) NOT NULL,
	`platform_order_id` varchar(64),
	`platform_order_number` varchar(64),
	`attempts` int NOT NULL DEFAULT 0,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_platform_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_platform_orders_order_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
ALTER TABLE `store_platform_orders` ADD CONSTRAINT `store_platform_orders_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_platform_orders` ADD CONSTRAINT `store_platform_orders_order_id_catalog_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `catalog_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `store_platform_orders_app_idx` ON `store_platform_orders` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `store_platform_orders_status_idx` ON `store_platform_orders` (`status`,`updated_at`);