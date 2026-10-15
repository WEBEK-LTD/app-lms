ALTER TABLE `catalog_orders` ADD `payment_provider` varchar(16);--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `provider_ref` varchar(191);--> statement-breakpoint
ALTER TABLE `donations` ADD `payment_provider` varchar(16);--> statement-breakpoint
ALTER TABLE `donations` ADD `provider_ref` varchar(191);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `payment_provider` varchar(16);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `provider_ref` varchar(191);