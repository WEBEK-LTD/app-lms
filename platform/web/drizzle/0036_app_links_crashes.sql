-- Links that open the app and crash reports (roadmap 46): the Play signing and upload key fingerprints, the Apple Team ID and the last link check on the app, the owner's rating prompt and crash report switches, and the crash groups with the app runs per day.
CREATE TABLE `crash_issues` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`title` varchar(300) NOT NULL,
	`stack` text NOT NULL,
	`library` varchar(60),
	`screen` varchar(80),
	`fatal` boolean NOT NULL,
	`platforms` longtext NOT NULL,
	`versions` longtext NOT NULL,
	`last_os` varchar(60),
	`count` int NOT NULL,
	`status` varchar(10) NOT NULL,
	`first_seen_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`resolved_at` datetime(3),
	CONSTRAINT `crash_issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `crash_issues_app_fingerprint_unique` UNIQUE(`app_id`,`fingerprint`)
);
--> statement-breakpoint
CREATE TABLE `crash_sessions` (
	`app_id` varchar(36) NOT NULL,
	`day` varchar(10) NOT NULL,
	`sessions` int NOT NULL,
	`crashed` int NOT NULL,
	CONSTRAINT `crash_sessions_app_id_day_pk` PRIMARY KEY(`app_id`,`day`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `play_signing_sha256` varchar(95);--> statement-breakpoint
ALTER TABLE `apps` ADD `android_upload_sha256` varchar(95);--> statement-breakpoint
ALTER TABLE `apps` ADD `apple_team_id` varchar(10);--> statement-breakpoint
ALTER TABLE `apps` ADD `links_check` longtext;--> statement-breakpoint
ALTER TABLE `apps` ADD `review_prompt` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `crash_reports` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `crash_issues` ADD CONSTRAINT `crash_issues_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `crash_sessions` ADD CONSTRAINT `crash_sessions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `crash_issues_last_seen_idx` ON `crash_issues` (`last_seen_at`);