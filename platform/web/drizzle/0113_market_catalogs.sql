CREATE TABLE `market_aisles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned NOT NULL,
	`department_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `market_aisles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_departments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`image_asset_id` varchar(36),
	`position` int NOT NULL,
	CONSTRAINT `market_departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned NOT NULL,
	`department_id` bigint unsigned,
	`aisle_id` bigint unsigned,
	`name` varchar(160) NOT NULL,
	`description` varchar(1000),
	`brand` varchar(80),
	`sku` varchar(64),
	`barcode` varchar(64),
	`image_asset_id` varchar(36),
	`image_url` varchar(500),
	`price` bigint unsigned NOT NULL,
	`was_price` bigint unsigned,
	`unit` varchar(8) NOT NULL,
	`step` double NOT NULL,
	`max_quantity` double,
	`stock` int,
	`in_stock` boolean NOT NULL,
	`tags` longtext NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_products_vendor_sku_unique` UNIQUE(`app_id`,`vendor_id`,`sku`)
);
--> statement-breakpoint
ALTER TABLE `restaurant_staff` ADD `role` varchar(16) DEFAULT 'manager' NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `kind` varchar(16) DEFAULT 'restaurant' NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `delivery` longtext;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `commission_fixed` bigint unsigned;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `tax_rate_bp` int;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `paused` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `area` varchar(80);--> statement-breakpoint
ALTER TABLE `market_aisles` ADD CONSTRAINT `market_aisles_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_aisles` ADD CONSTRAINT `market_aisles_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_aisles` ADD CONSTRAINT `market_aisles_department_id_market_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `market_departments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_departments` ADD CONSTRAINT `market_departments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_departments` ADD CONSTRAINT `market_departments_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_products` ADD CONSTRAINT `market_products_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_products` ADD CONSTRAINT `market_products_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_products` ADD CONSTRAINT `market_products_department_id_market_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `market_departments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_products` ADD CONSTRAINT `market_products_aisle_id_market_aisles_id_fk` FOREIGN KEY (`aisle_id`) REFERENCES `market_aisles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `market_aisles_vendor_idx` ON `market_aisles` (`app_id`,`vendor_id`,`department_id`,`position`);--> statement-breakpoint
CREATE INDEX `market_departments_vendor_idx` ON `market_departments` (`app_id`,`vendor_id`,`position`);--> statement-breakpoint
CREATE INDEX `market_products_vendor_idx` ON `market_products` (`app_id`,`vendor_id`,`in_stock`,`position`);--> statement-breakpoint
CREATE INDEX `market_products_department_idx` ON `market_products` (`app_id`,`vendor_id`,`department_id`,`aisle_id`);--> statement-breakpoint
CREATE INDEX `market_products_barcode_idx` ON `market_products` (`app_id`,`vendor_id`,`barcode`);