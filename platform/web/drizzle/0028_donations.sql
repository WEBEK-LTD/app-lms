-- Charity & donations apps (roadmap 29): campaigns, donations (counted towards a campaign only once paid) and how the app takes donations; a campaign update notification opens its campaign.
CREATE TABLE `campaigns` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`summary` varchar(300),
	`story` mediumtext NOT NULL,
	`image_asset_ids` longtext NOT NULL,
	`goal_cents` bigint unsigned,
	`preset_cents` longtext NOT NULL,
	`allow_custom_amount` boolean NOT NULL,
	`min_cents` bigint unsigned NOT NULL,
	`ends_at` datetime(3),
	`status` varchar(16) NOT NULL,
	`featured` boolean NOT NULL,
	`raised_cents` bigint unsigned NOT NULL DEFAULT 0,
	`donor_count` int NOT NULL DEFAULT 0,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donation_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `donation_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`campaign_id` bigint unsigned,
	`campaign_title` varchar(120) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`receipt_code` varchar(48) NOT NULL,
	`user_id` bigint unsigned,
	`amount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`recurring` varchar(16) NOT NULL,
	`anonymous` boolean NOT NULL,
	`message` varchar(280),
	`donor_name` varchar(80),
	`donor_email` varchar(191),
	`donor_phone` varchar(24),
	`status` varchar(16) NOT NULL,
	`payment_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	`paid_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `donations_id` PRIMARY KEY(`id`),
	CONSTRAINT `donations_token_unique` UNIQUE(`token_hash`),
	CONSTRAINT `donations_receipt_unique` UNIQUE(`receipt_code`)
);
--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `campaign_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donation_settings` ADD CONSTRAINT `donation_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donations` ADD CONSTRAINT `donations_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donations` ADD CONSTRAINT `donations_campaign_id_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donations` ADD CONSTRAINT `donations_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `campaigns_app_idx` ON `campaigns` (`app_id`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `donations_app_idx` ON `donations` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `donations_campaign_idx` ON `donations` (`campaign_id`,`donor_email`);--> statement-breakpoint
CREATE INDEX `donations_user_idx` ON `donations` (`app_id`,`user_id`);