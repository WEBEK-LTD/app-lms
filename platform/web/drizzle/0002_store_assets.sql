ALTER TABLE `apps` ADD `phone_screenshot_ids` longtext DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `iphone_screenshot_ids` longtext DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `firebase_android_asset_id` varchar(36);--> statement-breakpoint
ALTER TABLE `apps` ADD `firebase_ios_asset_id` varchar(36);