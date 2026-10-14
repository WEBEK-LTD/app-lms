-- Plans, limits and owner notices (roadmap 13.1 to 13.4). The plans become Starter, Growth, Pro and Business. The old Starter (Android and iOS, published by the client) is the new Growth, so its licenses, payments, coupons, announcements, switches and price edits move to growth; Pro stays Pro. Every data statement only changes rows still on the old value, so running this file again (after a stop halfway) changes nothing twice.
CREATE TABLE `owner_notices` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(32) NOT NULL,
	`dedupe_key` varchar(100) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`link_url` varchar(500),
	`link_label` varchar(60),
	`tone` varchar(8) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`emailed_at` datetime(3),
	`dismissed_at` datetime(3),
	`resolved_at` datetime(3),
	CONSTRAINT `owner_notices_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_notices_app_key_unique` UNIQUE(`app_id`,`dedupe_key`)
);
--> statement-breakpoint
ALTER TABLE `licenses` ADD `next_plan` varchar(16);--> statement-breakpoint
ALTER TABLE `licenses` ADD `next_plan_at` datetime(3);--> statement-breakpoint
ALTER TABLE `owner_notices` ADD CONSTRAINT `owner_notices_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owner_notices` ADD CONSTRAINT `owner_notices_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `owner_notices_client_idx` ON `owner_notices` (`client_id`,`created_at`);--> statement-breakpoint
UPDATE `licenses` SET `plan` = 'growth' WHERE `plan` = 'starter';--> statement-breakpoint
UPDATE `plan_payments` SET `plan` = 'growth' WHERE `plan` = 'starter';--> statement-breakpoint
UPDATE `coupon_redemptions` SET `plan` = 'growth' WHERE `plan` = 'starter';--> statement-breakpoint
UPDATE `coupons` SET `plans` = REPLACE(`plans`, '"starter"', '"growth"') WHERE `plans` LIKE '%"starter"%';--> statement-breakpoint
UPDATE `announcements` SET `audience` = REPLACE(`audience`, '"starter"', '"growth"') WHERE `audience` LIKE '%"starter"%';--> statement-breakpoint
-- The plan edits and the per-plan switches are kept by plan: the old Starter's move to growth. Old plan edits keep only their price (src/lib/plans.ts, plansWith).
UPDATE `platform_settings` SET `value` = REPLACE(`value`, '"starter":', '"growth":') WHERE `setting_key` IN ('plans', 'switches') AND `value` LIKE '%"starter":%';
