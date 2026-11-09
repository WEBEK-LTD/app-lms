ALTER TABLE `market_coupons` ADD `product_ids` longtext;--> statement-breakpoint
ALTER TABLE `market_coupons` ADD `created_by_vendor_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `market_coupons` ADD `owner_paused` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `market_coupons_vendor_idx` ON `market_coupons` (`app_id`,`created_by_vendor_id`);