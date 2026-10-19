-- Analytics for app owners (roadmap 44): raw usage events kept 40 days (no IP, no search text) and daily totals kept until the app is deleted.
CREATE TABLE `analytics_daily` (
	`app_id` varchar(36) NOT NULL,
	`day` varchar(10) NOT NULL,
	`metric` varchar(16) NOT NULL,
	`key` varchar(100) NOT NULL,
	`label` varchar(120),
	`value` bigint NOT NULL,
	CONSTRAINT `analytics_daily_app_id_day_metric_key_pk` PRIMARY KEY(`app_id`,`day`,`metric`,`key`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`install_id` varchar(36) NOT NULL,
	`type` varchar(16) NOT NULL,
	`at` datetime(3) NOT NULL,
	`day` varchar(10) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`app_version` varchar(32) NOT NULL,
	`os_version` varchar(32),
	`language` varchar(3),
	`country` varchar(2),
	`first_open` boolean NOT NULL,
	`screen` varchar(40),
	`item_kind` varchar(16),
	`item_id` varchar(64),
	`title` varchar(120),
	`amount_cents` bigint unsigned,
	`currency` varchar(3),
	`notification_id` varchar(64),
	`push_type` varchar(32),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analytics_daily` ADD CONSTRAINT `analytics_daily_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `analytics_events_app_day_idx` ON `analytics_events` (`app_id`,`day`,`install_id`);--> statement-breakpoint
CREATE INDEX `analytics_events_day_idx` ON `analytics_events` (`day`);