CREATE TABLE `app_deletions` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`open_app_id` varchar(36),
	`app_name` varchar(120) NOT NULL,
	`reason` varchar(16) NOT NULL,
	`deleted_by` varchar(191) NOT NULL,
	`deleted_at` datetime(3) NOT NULL,
	`purge_after` datetime(3) NOT NULL,
	`status` varchar(16) NOT NULL,
	`closed_at` datetime(3),
	`closed_by` varchar(191),
	`pending_builds` longtext NOT NULL,
	CONSTRAINT `app_deletions_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_deletions_open_unique` UNIQUE(`open_app_id`)
);
--> statement-breakpoint
CREATE TABLE `kept_billing_records` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`app_id` varchar(36),
	`receipt_number` varchar(16) NOT NULL,
	`buyer_name` varchar(120) NOT NULL,
	`buyer_email` varchar(191) NOT NULL,
	`buyer_whatsapp` varchar(32) NOT NULL,
	`buyer_country` varchar(2),
	`amount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` varchar(16) NOT NULL,
	`paid_at` datetime(3),
	`details` longtext NOT NULL,
	`receipt` longtext,
	`kept_at` datetime(3) NOT NULL,
	CONSTRAINT `kept_billing_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `deleted_at` datetime(3);--> statement-breakpoint
ALTER TABLE `apps` ADD `deleted_by` varchar(191);--> statement-breakpoint
CREATE INDEX `app_deletions_status_idx` ON `app_deletions` (`status`,`purge_after`);--> statement-breakpoint
CREATE INDEX `app_deletions_client_idx` ON `app_deletions` (`client_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `kept_billing_records_client_idx` ON `kept_billing_records` (`client_id`,`paid_at`);--> statement-breakpoint
CREATE INDEX `kept_billing_records_kept_idx` ON `kept_billing_records` (`kept_at`);--> statement-breakpoint
CREATE INDEX `apps_deleted_idx` ON `apps` (`deleted_at`);