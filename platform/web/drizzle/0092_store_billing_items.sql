CREATE TABLE `store_billing_items` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`item_id` varchar(64) NOT NULL,
	`title` varchar(200) NOT NULL,
	`price` varchar(20) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`period` varchar(8),
	`course_ids` longtext NOT NULL,
	`active` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_billing_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_billing_items_app_item_idx` UNIQUE(`app_id`,`kind`,`item_id`)
);
--> statement-breakpoint
ALTER TABLE `api_webhooks` ADD `data` longtext;--> statement-breakpoint
ALTER TABLE `store_purchases` ADD `granted_course_ids` longtext;--> statement-breakpoint
ALTER TABLE `store_billing_items` ADD CONSTRAINT `store_billing_items_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;