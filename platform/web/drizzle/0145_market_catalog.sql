CREATE TABLE `market_catalog_changes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned NOT NULL,
	`entity` varchar(12) NOT NULL,
	`entity_id` bigint unsigned NOT NULL,
	`action` varchar(8) NOT NULL,
	`before` longtext,
	`after` longtext,
	`fields` longtext NOT NULL,
	`by` varchar(8) NOT NULL,
	`by_name` varchar(120),
	`created_at` datetime(3) NOT NULL,
	`undone_at` datetime(3),
	CONSTRAINT `market_catalog_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_stock_moves` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned,
	`line_id` int,
	`reason` varchar(12) NOT NULL,
	`delta` int NOT NULL,
	`before` int,
	`after` int,
	`by` varchar(10) NOT NULL,
	`by_name` varchar(120),
	`undo_of` bigint unsigned,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `market_stock_moves_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_stock_moves_order_unique` UNIQUE(`order_id`,`line_id`,`product_id`,`reason`)
);
--> statement-breakpoint
ALTER TABLE `market_products` ADD `names` longtext;--> statement-breakpoint
ALTER TABLE `market_products` ADD `min_quantity` double;--> statement-breakpoint
ALTER TABLE `market_products` ADD `search_name` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `market_catalog_changes` ADD CONSTRAINT `market_catalog_changes_app_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_catalog_changes` ADD CONSTRAINT `market_catalog_changes_vendor_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_stock_moves` ADD CONSTRAINT `market_stock_moves_app_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_stock_moves` ADD CONSTRAINT `market_stock_moves_vendor_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_stock_moves` ADD CONSTRAINT `market_stock_moves_product_fk` FOREIGN KEY (`product_id`) REFERENCES `market_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `market_catalog_changes_vendor_idx` ON `market_catalog_changes` (`app_id`,`vendor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_stock_moves_product_idx` ON `market_stock_moves` (`app_id`,`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_stock_moves_vendor_idx` ON `market_stock_moves` (`app_id`,`vendor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_products_search_idx` ON `market_products` (`app_id`,`vendor_id`,`search_name`);