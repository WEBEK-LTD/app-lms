CREATE TABLE `studio_market_discounts` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`designer_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`code` varchar(24),
	`off_type` varchar(8) NOT NULL,
	`off_value` int NOT NULL,
	`plans` longtext,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`usage_limit` int,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_discounts_code_idx` UNIQUE(`template_id`,`code`)
);
--> statement-breakpoint
ALTER TABLE `studio_market_orders` ADD `discount_id` varchar(36);--> statement-breakpoint
ALTER TABLE `studio_market_orders` ADD `discount_kind` varchar(8);--> statement-breakpoint
ALTER TABLE `studio_market_orders` ADD `discount_code` varchar(24);--> statement-breakpoint
ALTER TABLE `studio_market_orders` ADD `list_cents` bigint unsigned;--> statement-breakpoint
ALTER TABLE `studio_market_orders` ADD `discount_cents` bigint unsigned;--> statement-breakpoint
ALTER TABLE `studio_market_discounts` ADD CONSTRAINT `studio_market_discounts_template_fk` FOREIGN KEY (`template_id`) REFERENCES `studio_market_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_market_discounts_template_idx` ON `studio_market_discounts` (`template_id`,`kind`,`ends_at`);--> statement-breakpoint
CREATE INDEX `studio_market_discounts_designer_idx` ON `studio_market_discounts` (`designer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_orders_discount_idx` ON `studio_market_orders` (`discount_id`,`status`,`created_at`);