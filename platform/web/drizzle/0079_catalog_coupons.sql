CREATE TABLE `catalog_coupons` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`code` varchar(50) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`value` bigint unsigned NOT NULL,
	`min_order_cents` bigint unsigned,
	`ends_at` datetime(3),
	`max_uses` int,
	`used_count` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `catalog_coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_coupons_code_unique` UNIQUE(`app_id`,`code`)
);
--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `coupon_code` varchar(50);--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `discount_cents` bigint unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_coupons` ADD CONSTRAINT `catalog_coupons_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;