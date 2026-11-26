CREATE TABLE `community_yallapp_signins` (
	`request_hash` varchar(64) NOT NULL,
	`redirect_uri` varchar(200) NOT NULL,
	`code_challenge` varchar(64) NOT NULL,
	`client_state` varchar(128) NOT NULL,
	`yallapp_user_id` varchar(36),
	`code_hash` varchar(64),
	`expires_at` datetime(3) NOT NULL,
	`approved_at` datetime(3),
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_yallapp_signins_request_hash` PRIMARY KEY(`request_hash`),
	CONSTRAINT `community_yallapp_signins_code` UNIQUE(`code_hash`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `email_verified_at` datetime(3);--> statement-breakpoint
ALTER TABLE `community_members` ADD `yallapp_link_via` varchar(10);--> statement-breakpoint
ALTER TABLE `community_members` ADD `link_suggestion_dismissed_at` datetime(3);--> statement-breakpoint
CREATE INDEX `community_yallapp_signins_time` ON `community_yallapp_signins` (`expires_at`);--> statement-breakpoint
-- Links made before 0158 were all the full flow (yallapp.com.tr/link-community). No Yallapp email is taken as confirmed: that waits for its owner.
UPDATE `community_members` SET `yallapp_link_via` = 'link' WHERE `yallapp_user_id` IS NOT NULL AND `yallapp_link_via` IS NULL;
