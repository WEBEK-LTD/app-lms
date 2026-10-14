CREATE TABLE `announcement_dismissals` (
	`announcement_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`dismissed_at` datetime(3) NOT NULL,
	CONSTRAINT `announcement_dismissals_client_id_announcement_id_pk` PRIMARY KEY(`client_id`,`announcement_id`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`audience` longtext NOT NULL,
	`severity` varchar(16) NOT NULL,
	`link_url` varchar(500),
	`link_label` varchar(60),
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3),
	`emailed_at` datetime(3),
	`emailed_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`created_by` varchar(191) NOT NULL,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`payment_id` varchar(36) NOT NULL,
	`coupon_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`code` varchar(40) NOT NULL,
	`plan` varchar(16) NOT NULL,
	`full_cents` bigint unsigned NOT NULL,
	`discount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`redeemed_at` datetime(3),
	CONSTRAINT `coupon_redemptions_payment_id` PRIMARY KEY(`payment_id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` varchar(36) NOT NULL,
	`code` varchar(40) NOT NULL,
	`note` varchar(200) NOT NULL,
	`discount` longtext NOT NULL,
	`plans` longtext,
	`periods` longtext,
	`valid_from` datetime(3),
	`valid_until` datetime(3),
	`max_redemptions` int,
	`max_per_client` int,
	`first_payment_only` boolean NOT NULL,
	`active` boolean NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`created_by` varchar(191) NOT NULL,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`template_key` varchar(64) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` varchar(191) NOT NULL,
	CONSTRAINT `email_templates_template_key` PRIMARY KEY(`template_key`)
);
--> statement-breakpoint
CREATE TABLE `site_content` (
	`content_key` varchar(64) NOT NULL,
	`fields` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` varchar(191) NOT NULL,
	CONSTRAINT `site_content_content_key` PRIMARY KEY(`content_key`)
);
--> statement-breakpoint
ALTER TABLE `announcement_dismissals` ADD CONSTRAINT `announcement_dismissals_announcement_id_announcements_id_fk` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `announcement_dismissals` ADD CONSTRAINT `announcement_dismissals_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_payment_id_plan_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `plan_payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `announcements_starts_idx` ON `announcements` (`starts_at`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_coupon_idx` ON `coupon_redemptions` (`coupon_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_client_idx` ON `coupon_redemptions` (`client_id`,`coupon_id`);