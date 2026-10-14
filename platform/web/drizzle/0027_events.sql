-- Events & tickets apps (roadmap 28): events, their ticket types, tickets (codes, holders, check-in) and settings; a hosted notification can name the event it is about.
CREATE TABLE `event_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `event_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
CREATE TABLE `event_ticket_types` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`event_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`price_cents` bigint unsigned NOT NULL,
	`capacity` int,
	`sale_ends_at` datetime(3),
	`max_per_order` int NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `event_ticket_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_tickets` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`event_id` bigint unsigned NOT NULL,
	`ticket_type_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`order_id` bigint unsigned,
	`code` varchar(16) NOT NULL,
	`holder_name` varchar(80) NOT NULL,
	`price_cents` bigint unsigned NOT NULL,
	`status` varchar(16) NOT NULL,
	`hold_until` datetime(3),
	`used_at` datetime(3),
	`cancelled_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `event_tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_tickets_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` mediumtext NOT NULL,
	`category` varchar(60),
	`image_asset_ids` longtext NOT NULL,
	`start_at` datetime(3) NOT NULL,
	`end_at` datetime(3) NOT NULL,
	`venue_name` varchar(150),
	`venue_address` varchar(250),
	`latitude` double,
	`longitude` double,
	`online_url` varchar(500),
	`organiser` varchar(120),
	`capacity` int,
	`status` varchar(16) NOT NULL,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `event_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `event_settings` ADD CONSTRAINT `event_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_ticket_types` ADD CONSTRAINT `event_ticket_types_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_ticket_types` ADD CONSTRAINT `event_ticket_types_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_tickets` ADD CONSTRAINT `event_tickets_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_tickets` ADD CONSTRAINT `event_tickets_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_tickets` ADD CONSTRAINT `event_tickets_ticket_type_id_event_ticket_types_id_fk` FOREIGN KEY (`ticket_type_id`) REFERENCES `event_ticket_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_tickets` ADD CONSTRAINT `event_tickets_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_tickets` ADD CONSTRAINT `event_tickets_order_id_catalog_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `catalog_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `event_ticket_types_event_idx` ON `event_ticket_types` (`event_id`,`position`);--> statement-breakpoint
CREATE INDEX `event_tickets_event_idx` ON `event_tickets` (`event_id`,`ticket_type_id`,`status`);--> statement-breakpoint
CREATE INDEX `event_tickets_user_idx` ON `event_tickets` (`app_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_tickets_order_idx` ON `event_tickets` (`order_id`);--> statement-breakpoint
CREATE INDEX `events_app_idx` ON `events` (`app_id`,`status`,`start_at`);