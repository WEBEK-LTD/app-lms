CREATE TABLE `listing_favorites` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`listing_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `listing_favorites_app_id_user_id_listing_id_pk` PRIMARY KEY(`app_id`,`user_id`,`listing_id`)
);
--> statement-breakpoint
CREATE TABLE `listing_inquiries` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`listing_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`status` varchar(8) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `listing_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_inquiry_messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`inquiry_id` bigint unsigned NOT NULL,
	`sender` varchar(8) NOT NULL,
	`text` text NOT NULL,
	`read_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `listing_inquiry_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `listing_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`reference` varchar(40),
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`purpose` varchar(8) NOT NULL,
	`type` varchar(24) NOT NULL,
	`price_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`price_period` varchar(8),
	`negotiable` boolean NOT NULL,
	`city` varchar(80) NOT NULL,
	`district` varchar(80),
	`address` varchar(200),
	`latitude` double,
	`longitude` double,
	`area` double,
	`bedrooms` int,
	`bathrooms` int,
	`floor` int,
	`year_built` int,
	`furnished` boolean,
	`features` longtext NOT NULL,
	`image_asset_ids` longtext NOT NULL,
	`video_url` varchar(500),
	`featured` boolean NOT NULL,
	`status` varchar(16) NOT NULL,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `listing_favorites` ADD CONSTRAINT `listing_favorites_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_favorites` ADD CONSTRAINT `listing_favorites_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_favorites` ADD CONSTRAINT `listing_favorites_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_inquiries` ADD CONSTRAINT `listing_inquiries_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_inquiries` ADD CONSTRAINT `listing_inquiries_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_inquiries` ADD CONSTRAINT `listing_inquiries_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_inquiry_messages` ADD CONSTRAINT `listing_inquiry_messages_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_inquiry_messages` ADD CONSTRAINT `listing_inquiry_messages_inquiry_id_listing_inquiries_id_fk` FOREIGN KEY (`inquiry_id`) REFERENCES `listing_inquiries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_settings` ADD CONSTRAINT `listing_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `listing_favorites_user_idx` ON `listing_favorites` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `listing_inquiries_app_idx` ON `listing_inquiries` (`app_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `listing_inquiries_user_idx` ON `listing_inquiries` (`app_id`,`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `listing_inquiry_messages_inquiry_idx` ON `listing_inquiry_messages` (`inquiry_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `listings_app_idx` ON `listings` (`app_id`,`status`,`created_at`);