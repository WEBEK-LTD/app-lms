CREATE TABLE `studio_market_ledger` (
	`id` varchar(36) NOT NULL,
	`designer_id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`plan` varchar(8) NOT NULL,
	`gross_cents` bigint unsigned NOT NULL,
	`designer_cents` bigint unsigned NOT NULL,
	`yallapp_cents` bigint unsigned NOT NULL,
	`earned_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_payout_details` (
	`designer_id` varchar(36) NOT NULL,
	`legal_name` varchar(120) NOT NULL,
	`country` varchar(2) NOT NULL,
	`id_type` varchar(16) NOT NULL,
	`id_number_encrypted` text NOT NULL,
	`id_document_asset_id` varchar(36),
	`holder_name` varchar(120) NOT NULL,
	`account_kind` varchar(8) NOT NULL,
	`account_encrypted` text NOT NULL,
	`swift` varchar(11) NOT NULL,
	`bank_code` varchar(34),
	`bank_name` varchar(120) NOT NULL,
	`bank_country` varchar(2) NOT NULL,
	`address` varchar(300) NOT NULL,
	`status` varchar(24) NOT NULL,
	`review_note` varchar(1000),
	`submitted_at` datetime(3) NOT NULL,
	`reviewed_at` datetime(3),
	`reviewed_by` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_payout_details_designer_id` PRIMARY KEY(`designer_id`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_payouts` (
	`id` varchar(36) NOT NULL,
	`designer_id` varchar(36) NOT NULL,
	`period` varchar(7) NOT NULL,
	`month_slot` varchar(48),
	`status` varchar(16) NOT NULL,
	`amount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`payee_name` varchar(120) NOT NULL,
	`payee_country` varchar(2) NOT NULL,
	`payee_address` varchar(300) NOT NULL,
	`account_kind` varchar(8) NOT NULL,
	`account_encrypted` text NOT NULL,
	`account_hint` varchar(48) NOT NULL,
	`swift` varchar(11) NOT NULL,
	`bank_code` varchar(34),
	`bank_name` varchar(120) NOT NULL,
	`bank_country` varchar(2) NOT NULL,
	`prepared_at` datetime(3) NOT NULL,
	`prepared_by` varchar(191) NOT NULL,
	`bank_reference` varchar(64),
	`sent_on` varchar(10),
	`sent_at` datetime(3),
	`sent_by` varchar(191),
	`emailed_at` datetime(3),
	`cancelled_at` datetime(3),
	`cancelled_by` varchar(191),
	`cancel_note` varchar(500),
	CONSTRAINT `studio_market_payouts_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_payouts_month_idx` UNIQUE(`month_slot`)
);
--> statement-breakpoint
ALTER TABLE `studio_market_payout_details` ADD CONSTRAINT `studio_market_payout_details_designer_fk` FOREIGN KEY (`designer_id`) REFERENCES `studio_market_designers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_market_ledger_designer_idx` ON `studio_market_ledger` (`designer_id`,`earned_at`);--> statement-breakpoint
CREATE INDEX `studio_market_payout_details_status_idx` ON `studio_market_payout_details` (`status`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `studio_market_payouts_designer_idx` ON `studio_market_payouts` (`designer_id`,`prepared_at`);--> statement-breakpoint
CREATE INDEX `studio_market_payouts_period_idx` ON `studio_market_payouts` (`period`,`status`);