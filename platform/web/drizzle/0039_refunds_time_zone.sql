-- Refunds from the dashboard and analytics in the owner's time zone (roadmap 47): the refunds made (amount, reason, who, the provider's references, the commission given back, what was taken back), what was refunded of each order and donation, refunded tickets, and the app's time zone.
CREATE TABLE `payment_refunds` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`target_id` bigint unsigned NOT NULL,
	`amount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`reason` varchar(32) NOT NULL,
	`note` varchar(300),
	`provider` varchar(16) NOT NULL,
	`method` varchar(8) NOT NULL,
	`parts` longtext NOT NULL,
	`provider_ref` varchar(191),
	`commission_cents` bigint unsigned,
	`revoked` longtext NOT NULL,
	`by_user_id` varchar(36),
	`by_email` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `payment_refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `time_zone` varchar(64);--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `refunded_cents` bigint unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `donations` ADD `refunded_cents` bigint unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_tickets` ADD `refunded_at` datetime(3);--> statement-breakpoint
ALTER TABLE `payment_refunds` ADD CONSTRAINT `payment_refunds_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_refunds_target_idx` ON `payment_refunds` (`app_id`,`kind`,`target_id`);