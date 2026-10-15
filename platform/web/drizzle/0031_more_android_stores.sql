-- Samsung Galaxy Store and Huawei AppGallery (roadmap 35, 36): the stores' keys and Huawei Push Kit on apps, the push service of each hosted device token, and the extra stores of a publishing request.
ALTER TABLE `apps` ADD `galaxy_content_id` varchar(20);--> statement-breakpoint
ALTER TABLE `apps` ADD `galaxy_service_account_id` varchar(64);--> statement-breakpoint
ALTER TABLE `apps` ADD `galaxy_key_encrypted` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `huawei_app_id` varchar(20);--> statement-breakpoint
ALTER TABLE `apps` ADD `huawei_client_id` varchar(64);--> statement-breakpoint
ALTER TABLE `apps` ADD `huawei_client_secret_encrypted` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `huawei_agconnect_asset_id` varchar(36);--> statement-breakpoint
ALTER TABLE `apps` ADD `huawei_push_secret_encrypted` text;--> statement-breakpoint
ALTER TABLE `hosted_devices` ADD `push_provider` varchar(4) DEFAULT 'fcm' NOT NULL;--> statement-breakpoint
ALTER TABLE `publishing_requests` ADD `more_stores` longtext;