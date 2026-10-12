CREATE TABLE `license_activations` (
	`license_id` varchar(36) NOT NULL,
	`site_url` varchar(255) NOT NULL,
	`site_url_raw` varchar(2048) NOT NULL,
	`plugin_version` varchar(32) NOT NULL,
	`wp_version` varchar(32),
	`lms` varchar(64),
	`activated_at` datetime(3) NOT NULL,
	`last_checked_at` datetime(3) NOT NULL,
	CONSTRAINT `license_activations_license_id` PRIMARY KEY(`license_id`)
);
--> statement-breakpoint
CREATE TABLE `apps` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`app_type` varchar(16) NOT NULL,
	`site_url` varchar(255),
	`app_name` varchar(60),
	`short_name` varchar(24),
	`icon_asset_id` varchar(36),
	`logo_asset_id` varchar(36),
	`primary_color` varchar(7) NOT NULL,
	`splash_color` varchar(7) NOT NULL,
	`template` varchar(16) NOT NULL,
	`font` varchar(64) NOT NULL,
	`android_package` varchar(150),
	`ios_bundle_id` varchar(155),
	`store_title` varchar(60),
	`short_description` varchar(160),
	`full_description` text,
	`support_email` varchar(191),
	`privacy_url` varchar(2048),
	`google_play_key_encrypted` text,
	`google_play_client_email` varchar(191),
	`asc_issuer_id` varchar(64),
	`asc_key_id` varchar(32),
	`asc_private_key_encrypted` text,
	`app_type_done_at` datetime(3),
	`website_done_at` datetime(3),
	`branding_done_at` datetime(3),
	`listing_done_at` datetime(3),
	`publishing_done_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `apps_id` PRIMARY KEY(`id`),
	CONSTRAINT `apps_client_unique` UNIQUE(`client_id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`blob_key` varchar(255) NOT NULL,
	`content_type` varchar(64) NOT NULL,
	`size` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `builds` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`number` int NOT NULL,
	`version_name` varchar(32) NOT NULL,
	`version_code` int NOT NULL,
	`status` varchar(16) NOT NULL,
	`stages` longtext NOT NULL,
	`config` longtext NOT NULL,
	`store_listing` longtext NOT NULL,
	`auto_publish` boolean NOT NULL,
	`artifacts` longtext NOT NULL,
	`message` text,
	`log_url` varchar(2048),
	`created_at` datetime(3) NOT NULL,
	`started_at` datetime(3),
	`finished_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `builds_id` PRIMARY KEY(`id`),
	CONSTRAINT `builds_client_number_unique` UNIQUE(`client_id`,`number`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`whatsapp` varchar(32) NOT NULL,
	`site_url` varchar(255) NOT NULL,
	`status` varchar(16) NOT NULL,
	`payment_note` text,
	`activated_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_user_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`key_hash` varchar(64) NOT NULL,
	`key_encrypted` text NOT NULL,
	`key_last4` varchar(4) NOT NULL,
	`plan` varchar(16) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `licenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `licenses_client_unique` UNIQUE(`client_id`),
	CONSTRAINT `licenses_key_hash_unique` UNIQUE(`key_hash`)
);
--> statement-breakpoint
CREATE TABLE `plugin_releases` (
	`id` varchar(36) NOT NULL,
	`version` varchar(32) NOT NULL,
	`changelog` text NOT NULL,
	`requires_wp` varchar(16) NOT NULL,
	`requires_php` varchar(16) NOT NULL,
	`tested_wp` varchar(16) NOT NULL,
	`blob_key` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`sha256` varchar(64) NOT NULL,
	`published` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `plugin_releases_id` PRIMARY KEY(`id`),
	CONSTRAINT `plugin_releases_version_unique` UNIQUE(`version`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`bucket` varchar(191) NOT NULL,
	`window_start` bigint NOT NULL,
	`hits` int NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `rate_limits_bucket` PRIMARY KEY(`bucket`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`token_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `password_reset_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255),
	`session_version` int NOT NULL DEFAULT 1,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`last_sign_in_at` datetime(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `license_activations` ADD CONSTRAINT `license_activations_license_id_licenses_id_fk` FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `apps` ADD CONSTRAINT `apps_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assets` ADD CONSTRAINT `assets_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `builds` ADD CONSTRAINT `builds_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `builds` ADD CONSTRAINT `builds_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assets_client_idx` ON `assets` (`client_id`);--> statement-breakpoint
CREATE INDEX `builds_status_idx` ON `builds` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `clients_status_idx` ON `clients` (`status`);--> statement-breakpoint
CREATE INDEX `reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);