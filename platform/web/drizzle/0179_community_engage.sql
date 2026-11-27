CREATE TABLE `community_challenge_submissions` (
	`id` varchar(36) NOT NULL,
	`challenge_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`showcase_id` varchar(36),
	`url` varchar(500),
	`note` text NOT NULL,
	`votes` int NOT NULL DEFAULT 0,
	`place` int,
	`reward` longtext,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_challenge_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_challenge_entry` UNIQUE(`challenge_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `community_challenge_votes` (
	`submission_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_challenge_votes_pk` PRIMARY KEY(`submission_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `community_challenges` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`reward_points` int NOT NULL DEFAULT 0,
	`reward_badge` varchar(8),
	`cover_url` varchar(512),
	`starts_at` datetime(3) NOT NULL,
	`submit_until` datetime(3) NOT NULL,
	`vote_until` datetime(3) NOT NULL,
	`status` varchar(10) NOT NULL,
	`winners_at` datetime(3),
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_course_orders` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`member_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`amount_cents` int NOT NULL,
	`currency` varchar(3) NOT NULL,
	`provider` varchar(16) NOT NULL,
	`provider_ref` varchar(191),
	`token_hash` varchar(64) NOT NULL,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`paid_at` datetime(3),
	CONSTRAINT `community_course_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_course_orders_token` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `community_event_comments` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_event_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_event_rsvps` (
	`event_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_event_rsvps_pk` PRIMARY KEY(`event_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `community_events` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`group_id` varchar(36),
	`kind` varchar(10) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3) NOT NULL,
	`capacity` int,
	`time_zone` varchar(64) NOT NULL,
	`location` varchar(300),
	`join_url` varchar(500),
	`embed_url` varchar(500),
	`replay_url` varchar(500),
	`cover_url` varchar(512),
	`status` varchar(10) NOT NULL,
	`rsvp_count` int NOT NULL DEFAULT 0,
	`reminded_day_at` datetime(3),
	`reminded_hour_at` datetime(3),
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_points` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`member_id` varchar(36) NOT NULL,
	`reason` varchar(40) NOT NULL,
	`points` int NOT NULL,
	`ref` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_points_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_points_once` UNIQUE(`member_id`,`reason`,`ref`)
);
--> statement-breakpoint
CREATE TABLE `community_push_devices` (
	`session_id` varchar(36) NOT NULL,
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`member_id` varchar(36) NOT NULL,
	`token` varchar(4096) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	CONSTRAINT `community_push_devices_session_id` PRIMARY KEY(`session_id`)
);
--> statement-breakpoint
ALTER TABLE `community_moderation_items` MODIFY COLUMN `target_type` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `community_reports` MODIFY COLUMN `target_type` varchar(24) NOT NULL;--> statement-breakpoint
ALTER TABLE `community_violations` MODIFY COLUMN `target_type` varchar(24);--> statement-breakpoint
ALTER TABLE `community_challenge_submissions` ADD CONSTRAINT `community_challenge_entry_challenge_fk` FOREIGN KEY (`challenge_id`) REFERENCES `community_challenges`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_challenge_submissions` ADD CONSTRAINT `community_challenge_entry_member_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_challenge_votes` ADD CONSTRAINT `community_challenge_vote_entry_fk` FOREIGN KEY (`submission_id`) REFERENCES `community_challenge_submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_challenge_votes` ADD CONSTRAINT `community_challenge_vote_member_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_course_orders` ADD CONSTRAINT `community_course_orders_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_event_comments` ADD CONSTRAINT `community_event_comments_event_id_community_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `community_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_event_comments` ADD CONSTRAINT `community_event_comments_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_event_rsvps` ADD CONSTRAINT `community_event_rsvps_event_id_community_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `community_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_event_rsvps` ADD CONSTRAINT `community_event_rsvps_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_points` ADD CONSTRAINT `community_points_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_push_devices` ADD CONSTRAINT `community_push_devices_session_id_community_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `community_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_push_devices` ADD CONSTRAINT `community_push_devices_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_challenge_entries` ON `community_challenge_submissions` (`challenge_id`,`status`,`votes`);--> statement-breakpoint
CREATE INDEX `community_challenges_time` ON `community_challenges` (`tenant_id`,`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `community_course_orders_member` ON `community_course_orders` (`member_id`,`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `community_event_comments_event` ON `community_event_comments` (`event_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_event_rsvps_member` ON `community_event_rsvps` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_events_time` ON `community_events` (`tenant_id`,`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `community_events_group` ON `community_events` (`group_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `community_points_board` ON `community_points` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_points_day` ON `community_points` (`member_id`,`reason`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_push_devices_member` ON `community_push_devices` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_push_devices_token` ON `community_push_devices` (`token_hash`);;--> statement-breakpoint
-- 233 The points ledger starts with every point earned in phase 1 (area B's events), so the all-time board and the members' totals agree.
INSERT IGNORE INTO `community_points` (`id`, `tenant_id`, `member_id`, `reason`, `points`, `ref`, `created_at`) SELECT `id`, 'yallapp', `member_id`, `reason`, `points`, `ref`, `created_at` FROM `community_point_events`;