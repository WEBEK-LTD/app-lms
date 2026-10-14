CREATE TABLE `catalog_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `catalog_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catalog_orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`user_id` bigint unsigned,
	`status` varchar(16) NOT NULL,
	`lines` longtext NOT NULL,
	`subtotal_cents` bigint unsigned NOT NULL,
	`shipping_cents` bigint unsigned NOT NULL,
	`total_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`customer` longtext,
	`payment_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	`paid_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `catalog_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_orders_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `catalog_products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`price_cents` bigint unsigned NOT NULL,
	`sale_price_cents` bigint unsigned,
	`category_ids` longtext NOT NULL,
	`image_asset_ids` longtext NOT NULL,
	`stock` int,
	`digital` boolean NOT NULL,
	`featured` boolean NOT NULL,
	`active` boolean NOT NULL,
	`sku` varchar(64),
	`sales_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `catalog_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `catalog_settings` longtext;--> statement-breakpoint
ALTER TABLE `catalog_categories` ADD CONSTRAINT `catalog_categories_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD CONSTRAINT `catalog_orders_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD CONSTRAINT `catalog_orders_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD CONSTRAINT `catalog_products_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `catalog_categories_app_idx` ON `catalog_categories` (`app_id`);--> statement-breakpoint
CREATE INDEX `catalog_orders_app_idx` ON `catalog_orders` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `catalog_orders_user_idx` ON `catalog_orders` (`app_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `catalog_products_app_idx` ON `catalog_products` (`app_id`,`created_at`);