CREATE TABLE `studio_market_licence_periods` (
	`id` varchar(36) NOT NULL,
	`licence_id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`plan` varchar(8) NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_licence_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_orders` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`designer_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`licence_id` varchar(36),
	`plan` varchar(8) NOT NULL,
	`app_id` varchar(36),
	`gross_cents` bigint unsigned NOT NULL,
	`designer_cents` bigint unsigned NOT NULL,
	`yallapp_cents` bigint unsigned NOT NULL,
	`amount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`egp_per_usd` double,
	`status` varchar(8) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`payment_provider` varchar(16) NOT NULL,
	`provider_ref` varchar(191),
	`payment_id` varchar(191),
	`consent_at` datetime(3) NOT NULL,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`applied_at` datetime(3),
	`apply_error` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`paid_at` datetime(3),
	CONSTRAINT `studio_market_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_orders_token_idx` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD `after_end` varchar(8);--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD `reminded_early_for` datetime(3);--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD `reminded_last_for` datetime(3);--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD `ended_at` datetime(3);--> statement-breakpoint
ALTER TABLE `studio_market_licence_periods` ADD CONSTRAINT `studio_market_periods_licence_fk` FOREIGN KEY (`licence_id`) REFERENCES `studio_market_licences`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_market_periods_licence_idx` ON `studio_market_licence_periods` (`licence_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `studio_market_orders_client_idx` ON `studio_market_orders` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_orders_designer_idx` ON `studio_market_orders` (`designer_id`,`status`,`paid_at`);--> statement-breakpoint
CREATE INDEX `studio_market_orders_template_idx` ON `studio_market_orders` (`template_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_orders_licence_idx` ON `studio_market_orders` (`licence_id`);--> statement-breakpoint
CREATE INDEX `studio_market_licences_ends_idx` ON `studio_market_licences` (`status`,`ends_at`);