CREATE TABLE `campaign_sends` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`campaign_id` bigint unsigned NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`notification_id` bigint unsigned NOT NULL,
	`sent_at` datetime(3) NOT NULL,
	`recipients` int NOT NULL,
	`pushed` int NOT NULL,
	`failed` int NOT NULL,
	CONSTRAINT `campaign_sends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notice_recipients` (
	`notification_id` bigint unsigned NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	CONSTRAINT `notice_recipients_notification_id_user_id_pk` PRIMARY KEY(`notification_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `notification_campaigns` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`image_url` varchar(500),
	`link` varchar(500),
	`audience` longtext NOT NULL,
	`repeats` varchar(8) NOT NULL,
	`send_at` datetime(3),
	`weekday` tinyint,
	`local_time` varchar(5),
	`status` varchar(16) NOT NULL,
	`claimed_at` datetime(3),
	`last_sent_at` datetime(3),
	`result` varchar(500),
	`created_by` varchar(255),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `notification_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `link` varchar(500);--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `image_url` varchar(500);--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `targeted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign_sends` ADD CONSTRAINT `campaign_sends_campaign_id_notification_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `notification_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_sends` ADD CONSTRAINT `campaign_sends_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notice_recipients` ADD CONSTRAINT `notice_recipients_notification_id_hosted_notifications_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `hosted_notifications`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notice_recipients` ADD CONSTRAINT `notice_recipients_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notice_recipients` ADD CONSTRAINT `notice_recipients_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_campaigns` ADD CONSTRAINT `notification_campaigns_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `campaign_sends_campaign_idx` ON `campaign_sends` (`app_id`,`campaign_id`,`sent_at`);--> statement-breakpoint
CREATE INDEX `notice_recipients_user_idx` ON `notice_recipients` (`app_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `notification_campaigns_due_idx` ON `notification_campaigns` (`status`,`send_at`);--> statement-breakpoint
CREATE INDEX `notification_campaigns_app_idx` ON `notification_campaigns` (`app_id`,`created_at`);