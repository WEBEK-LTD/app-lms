ALTER TABLE `catalog_orders` ADD `provider_checked_at` datetime(3);--> statement-breakpoint
ALTER TABLE `donations` ADD `provider_checked_at` datetime(3);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `provider_checked_at` datetime(3);--> statement-breakpoint
CREATE INDEX `catalog_orders_pending_idx` ON `catalog_orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `donations_pending_idx` ON `donations` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `plan_payments_pending_idx` ON `plan_payments` (`status`,`created_at`);