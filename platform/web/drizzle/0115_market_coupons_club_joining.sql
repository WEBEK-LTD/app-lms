CREATE TABLE `market_application_forms` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`intro` varchar(2000),
	`kinds` longtext NOT NULL,
	`fields` longtext NOT NULL,
	`token` varchar(64) NOT NULL,
	`open` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_application_forms_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_application_forms_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `market_applications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`form_id` bigint unsigned NOT NULL,
	`status` varchar(12) NOT NULL,
	`business_name` varchar(120) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`email` varchar(191) NOT NULL,
	`answers` longtext NOT NULL,
	`file_asset_ids` longtext NOT NULL,
	`message` varchar(2000),
	`vendor_id` bigint unsigned,
	`decided_by` varchar(191),
	`decided_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_club_members` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`plan_id` bigint unsigned,
	`status` varchar(12) NOT NULL,
	`renews` boolean NOT NULL,
	`started_at` datetime(3),
	`paid_until` datetime(3),
	`payment_ref` varchar(120),
	`saved` bigint NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_club_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_club_members_user_unique` UNIQUE(`app_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `market_club_plans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` varchar(500),
	`period` varchar(8) NOT NULL,
	`price` bigint NOT NULL,
	`currency` varchar(3) NOT NULL,
	`free_delivery_over` bigint,
	`delivery_discount_percent` int,
	`perks` longtext NOT NULL,
	`active` boolean NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_club_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_coupon_uses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`coupon_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`discount` bigint NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `market_coupon_uses_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_coupon_uses_order_unique` UNIQUE(`coupon_id`,`order_id`)
);
--> statement-breakpoint
CREATE TABLE `market_coupons` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`code` varchar(40),
	`title` varchar(120) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`value` bigint NOT NULL,
	`max_discount` bigint,
	`min_order` bigint NOT NULL,
	`currency` varchar(3) NOT NULL,
	`paid_by` varchar(8) NOT NULL,
	`first_order_only` boolean NOT NULL,
	`vendor_ids` longtext NOT NULL,
	`vendor_kinds` longtext NOT NULL,
	`department_ids` longtext NOT NULL,
	`uses_limit` int,
	`per_user_limit` int,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`active` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `market_coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_coupons_app_code_unique` UNIQUE(`app_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `vendor_web_challenges` (
	`token_hash` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`email` varchar(191) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `vendor_web_challenges_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `vendor_web_sessions` (
	`id_hash` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`vendor_id` bigint unsigned NOT NULL,
	`staff_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	CONSTRAINT `vendor_web_sessions_id_hash` PRIMARY KEY(`id_hash`)
);
--> statement-breakpoint
ALTER TABLE `market_application_forms` ADD CONSTRAINT `market_application_forms_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_applications` ADD CONSTRAINT `market_applications_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_applications` ADD CONSTRAINT `market_applications_form_id_market_application_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `market_application_forms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_applications` ADD CONSTRAINT `market_applications_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_club_members` ADD CONSTRAINT `market_club_members_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_club_members` ADD CONSTRAINT `market_club_members_plan_id_market_club_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `market_club_plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_club_plans` ADD CONSTRAINT `market_club_plans_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_coupon_uses` ADD CONSTRAINT `market_coupon_uses_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_coupon_uses` ADD CONSTRAINT `market_coupon_uses_coupon_id_market_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `market_coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_coupons` ADD CONSTRAINT `market_coupons_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_web_challenges` ADD CONSTRAINT `vendor_web_challenges_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_web_sessions` ADD CONSTRAINT `vendor_web_sessions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_web_sessions` ADD CONSTRAINT `vendor_web_sessions_vendor_id_restaurants_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `restaurants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_web_sessions` ADD CONSTRAINT `vendor_web_sessions_staff_id_restaurant_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `restaurant_staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `market_application_forms_app_idx` ON `market_application_forms` (`app_id`);--> statement-breakpoint
CREATE INDEX `market_applications_app_idx` ON `market_applications` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `market_applications_form_idx` ON `market_applications` (`form_id`);--> statement-breakpoint
CREATE INDEX `market_applications_email_idx` ON `market_applications` (`app_id`,`email`);--> statement-breakpoint
CREATE INDEX `market_club_members_status_idx` ON `market_club_members` (`app_id`,`status`,`paid_until`);--> statement-breakpoint
CREATE INDEX `market_club_plans_app_idx` ON `market_club_plans` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `market_coupon_uses_user_idx` ON `market_coupon_uses` (`coupon_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `market_coupons_app_idx` ON `market_coupons` (`app_id`,`active`);--> statement-breakpoint
CREATE INDEX `vendor_web_challenges_expires_idx` ON `vendor_web_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `vendor_web_sessions_staff_idx` ON `vendor_web_sessions` (`app_id`,`staff_id`);--> statement-breakpoint
CREATE INDEX `vendor_web_sessions_expires_idx` ON `vendor_web_sessions` (`expires_at`);