ALTER TABLE `catalog_products` ADD `weight_grams` int;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `addon` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `addon_for` longtext;