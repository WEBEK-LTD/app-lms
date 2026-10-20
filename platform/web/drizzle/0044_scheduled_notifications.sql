CREATE TABLE `scheduled_notifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`send_at` datetime(3) NOT NULL,
	`status` varchar(16) NOT NULL,
	`created_by` varchar(36),
	`claimed_at` datetime(3),
	`sent_at` datetime(3),
	`notification_id` bigint unsigned,
	`result` varchar(500),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `scheduled_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `pushed_at` datetime(3);--> statement-breakpoint
UPDATE `announcements` SET `pushed_at` = `created_at` WHERE `starts_at` <= CURRENT_TIMESTAMP(3) AND `pushed_at` IS NULL;--> statement-breakpoint
ALTER TABLE `scheduled_notifications` ADD CONSTRAINT `scheduled_notifications_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `scheduled_notifications_due_idx` ON `scheduled_notifications` (`status`,`send_at`);--> statement-breakpoint
CREATE INDEX `scheduled_notifications_app_idx` ON `scheduled_notifications` (`app_id`,`status`,`send_at`);--> statement-breakpoint
CREATE INDEX `catalog_orders_paid_idx` ON `catalog_orders` (`app_id`,`paid_at`);--> statement-breakpoint
CREATE INDEX `donations_paid_idx` ON `donations` (`app_id`,`paid_at`);--> statement-breakpoint
CREATE INDEX `event_tickets_created_idx` ON `event_tickets` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `event_tickets_used_idx` ON `event_tickets` (`app_id`,`used_at`);--> statement-breakpoint
CREATE INDEX `hosted_users_created_idx` ON `hosted_users` (`app_id`,`created_at`);