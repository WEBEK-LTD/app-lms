CREATE TABLE `store_purchase_events` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`purchase_id` varchar(36) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`product_id` varchar(100) NOT NULL,
	`amount_cents` int,
	`currency` varchar(3),
	`test` boolean NOT NULL,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `store_purchase_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `store_purchase_events` ADD CONSTRAINT `store_purchase_events_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_purchase_events` ADD CONSTRAINT `store_purchase_events_purchase_id_store_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `store_purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `store_purchase_events_app_idx` ON `store_purchase_events` (`app_id`,`at`);