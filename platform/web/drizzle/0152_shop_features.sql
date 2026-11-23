CREATE TABLE `product_reviews` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`rating` int NOT NULL,
	`text` text NOT NULL,
	`photo_ids` longtext NOT NULL,
	`author_name` varchar(60) NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`reply_text` text,
	`reply_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `product_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_reviews_customer_unique` UNIQUE(`app_id`,`product_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_wishlist` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `shop_wishlist_app_id_user_id_product_id_pk` PRIMARY KEY(`app_id`,`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `stock_alerts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`variation_id` bigint unsigned NOT NULL DEFAULT 0,
	`user_id` bigint unsigned NOT NULL,
	`product_name` varchar(160) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`notified_at` datetime(3),
	CONSTRAINT `stock_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_alerts_customer_unique` UNIQUE(`app_id`,`product_id`,`variation_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `translations` longtext;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `brand` varchar(80);--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_wishlist` ADD CONSTRAINT `shop_wishlist_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shop_wishlist` ADD CONSTRAINT `shop_wishlist_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_alerts` ADD CONSTRAINT `stock_alerts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_alerts` ADD CONSTRAINT `stock_alerts_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_reviews_app_idx` ON `product_reviews` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `shop_wishlist_product_idx` ON `shop_wishlist` (`app_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `stock_alerts_waiting_idx` ON `stock_alerts` (`app_id`,`notified_at`);