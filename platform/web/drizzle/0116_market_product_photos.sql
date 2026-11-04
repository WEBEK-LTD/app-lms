ALTER TABLE `market_products` ADD `gallery_asset_ids` longtext;--> statement-breakpoint
ALTER TABLE `market_products` ADD `photo_error` varchar(160);--> statement-breakpoint
CREATE INDEX `market_products_photo_wait_idx` ON `market_products` (`image_asset_id`,`photo_error`);