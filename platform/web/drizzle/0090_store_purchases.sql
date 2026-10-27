CREATE TABLE `billing_sessions` (
	`token_hash` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`email` varchar(191),
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `billing_sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `store_purchases` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`store_key` varchar(128) NOT NULL,
	`purchase_token` text,
	`product_id` varchar(100) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`course_id` int,
	`plan_id` varchar(64),
	`account_source` varchar(16) NOT NULL,
	`account_id` varchar(64) NOT NULL,
	`transaction_id` varchar(128),
	`status` varchar(16) NOT NULL,
	`expires_at` datetime(3),
	`acknowledged` boolean NOT NULL,
	`delivered` boolean NOT NULL,
	`reason` varchar(16),
	`test` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_purchases_key_idx` UNIQUE(`app_id`,`platform`,`store_key`)
);
--> statement-breakpoint
ALTER TABLE `billing_sessions` ADD CONSTRAINT `billing_sessions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `store_purchases` ADD CONSTRAINT `store_purchases_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `billing_sessions_expires_idx` ON `billing_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `store_purchases_account_idx` ON `store_purchases` (`app_id`,`account_source`,`account_id`);--> statement-breakpoint
CREATE INDEX `store_purchases_due_idx` ON `store_purchases` (`delivered`,`updated_at`);