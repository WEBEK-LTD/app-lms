CREATE TABLE `app_addons` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`addon_id` varchar(40) NOT NULL,
	`kind` varchar(12) NOT NULL,
	`name` varchar(191) NOT NULL,
	`limit_key` varchar(48),
	`amount` double,
	`feature` varchar(32),
	`billing` varchar(12) NOT NULL,
	`active_until` datetime(3),
	`status` varchar(12) NOT NULL,
	`payment_id` varchar(36),
	`granted_by` varchar(191),
	`task_status` varchar(12),
	`task_note` text,
	`reminded_for` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `app_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coupons` ADD `addons` longtext;--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `addon` longtext;--> statement-breakpoint
ALTER TABLE `app_addons` ADD CONSTRAINT `app_addons_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_addons` ADD CONSTRAINT `app_addons_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_addons_app_idx` ON `app_addons` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `app_addons_client_idx` ON `app_addons` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `app_addons_until_idx` ON `app_addons` (`active_until`);--> statement-breakpoint
CREATE INDEX `app_addons_task_idx` ON `app_addons` (`task_status`,`created_at`);