ALTER TABLE `catalog_orders` ADD `commission_cents` bigint unsigned;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `item_transaction_ids` longtext;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `payout_approved_at` datetime(3);