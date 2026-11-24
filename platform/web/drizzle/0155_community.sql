CREATE TABLE `community_answers` (
	`id` varchar(36) NOT NULL,
	`question_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`official` boolean NOT NULL DEFAULT false,
	`status` varchar(10) NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_audit_log` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(40) NOT NULL,
	`member_id` varchar(36),
	`target_type` varchar(24),
	`target_id` varchar(36),
	`reason` text,
	`details` longtext,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_badges` (
	`id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`badge` varchar(8) NOT NULL,
	`source` varchar(8) NOT NULL,
	`details` longtext,
	`granted_by` varchar(36),
	`reason` text,
	`expires_at` datetime(3),
	`granted_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`revoked_by` varchar(36),
	`revoke_reason` text,
	CONSTRAINT `community_badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_blocks` (
	`blocker_id` varchar(36) NOT NULL,
	`blocked_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_blocks_blocker_id_blocked_id_pk` PRIMARY KEY(`blocker_id`,`blocked_id`)
);
--> statement-breakpoint
CREATE TABLE `community_email_tokens` (
	`token_hash` varchar(64) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`purpose` varchar(16) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_email_tokens_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `community_follows` (
	`follower_id` varchar(36) NOT NULL,
	`followee_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_follows_follower_id_followee_id_pk` PRIMARY KEY(`follower_id`,`followee_id`)
);
--> statement-breakpoint
CREATE TABLE `community_friendships` (
	`id` varchar(36) NOT NULL,
	`requester_id` varchar(36) NOT NULL,
	`addressee_id` varchar(36) NOT NULL,
	`pair_key` varchar(80) NOT NULL,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`responded_at` datetime(3),
	CONSTRAINT `community_friendships_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_friendships_pair_unique` UNIQUE(`pair_key`)
);
--> statement-breakpoint
CREATE TABLE `community_identities` (
	`member_id` varchar(36) NOT NULL,
	`provider` varchar(8) NOT NULL,
	`subject` varchar(191) NOT NULL,
	`email` varchar(191),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_identities_provider_subject_pk` PRIMARY KEY(`provider`,`subject`)
);
--> statement-breakpoint
CREATE TABLE `community_link_requests` (
	`state_hash` varchar(64) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`confirmed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_link_requests_state_hash` PRIMARY KEY(`state_hash`)
);
--> statement-breakpoint
CREATE TABLE `community_members` (
	`id` varchar(36) NOT NULL,
	`email` varchar(191),
	`email_verified` boolean NOT NULL DEFAULT false,
	`password_hash` varchar(255),
	`display_name` varchar(80) NOT NULL,
	`username` varchar(30) NOT NULL,
	`bio` text NOT NULL,
	`skills` longtext NOT NULL,
	`avatar_url` varchar(512),
	`headline` varchar(80) NOT NULL DEFAULT '',
	`links` longtext NOT NULL,
	`language` varchar(8) NOT NULL,
	`theme` varchar(8) NOT NULL DEFAULT 'system',
	`role` varchar(8) NOT NULL DEFAULT 'member',
	`status` varchar(12) NOT NULL DEFAULT 'active',
	`points` int NOT NULL DEFAULT 0,
	`approved_posts` int NOT NULL DEFAULT 0,
	`yallapp_user_id` varchar(36),
	`linked_at` datetime(3),
	`session_version` int NOT NULL DEFAULT 1,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`last_active_at` datetime(3) NOT NULL,
	CONSTRAINT `community_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_members_email_unique` UNIQUE(`email`),
	CONSTRAINT `community_members_username_unique` UNIQUE(`username`),
	CONSTRAINT `community_members_yallapp_unique` UNIQUE(`yallapp_user_id`)
);
--> statement-breakpoint
CREATE TABLE `community_moderation_items` (
	`id` varchar(36) NOT NULL,
	`target_type` varchar(12) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`author_id` varchar(36),
	`cause` varchar(16) NOT NULL,
	`status` varchar(10) NOT NULL,
	`note` text,
	`handled_by` varchar(36),
	`handled_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_moderation_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_moderation_target` UNIQUE(`target_type`,`target_id`,`cause`)
);
--> statement-breakpoint
CREATE TABLE `community_notification_prefs` (
	`member_id` varchar(36) NOT NULL,
	`email` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_notification_prefs_member_id` PRIMARY KEY(`member_id`)
);
--> statement-breakpoint
CREATE TABLE `community_notifications` (
	`id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`kind` varchar(40) NOT NULL,
	`actor_id` varchar(36),
	`target_type` varchar(24),
	`target_id` varchar(36),
	`data` longtext,
	`read_at` datetime(3),
	`emailed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_question_tags` (
	`question_id` varchar(36) NOT NULL,
	`tag_id` varchar(36) NOT NULL,
	CONSTRAINT `community_question_tags_question_id_tag_id_pk` PRIMARY KEY(`question_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `community_questions` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`section_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text NOT NULL,
	`language` varchar(8) NOT NULL,
	`tags` longtext NOT NULL,
	`status` varchar(10) NOT NULL,
	`accepted_answer_id` varchar(36),
	`score` int NOT NULL DEFAULT 0,
	`answer_count` int NOT NULL DEFAULT 0,
	`view_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`last_activity_at` datetime(3) NOT NULL,
	CONSTRAINT `community_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_reports` (
	`id` varchar(36) NOT NULL,
	`reporter_id` varchar(36) NOT NULL,
	`target_type` varchar(12) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`reason` varchar(16) NOT NULL,
	`note` text NOT NULL,
	`status` varchar(10) NOT NULL DEFAULT 'open',
	`handled_by` varchar(36),
	`handled_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_reports_once` UNIQUE(`reporter_id`,`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `community_sections` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(60) NOT NULL,
	`kind` varchar(10) NOT NULL,
	`names` longtext NOT NULL,
	`icon` varchar(60) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_sections_slug_unique` UNIQUE(`kind`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_sessions` (
	`id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`refresh_hash` varchar(64) NOT NULL,
	`refresh_expires_at` datetime(3) NOT NULL,
	`access_hash` varchar(64) NOT NULL,
	`access_expires_at` datetime(3) NOT NULL,
	`session_version` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	CONSTRAINT `community_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_sessions_refresh_unique` UNIQUE(`refresh_hash`),
	CONSTRAINT `community_sessions_access_unique` UNIQUE(`access_hash`)
);
--> statement-breakpoint
CREATE TABLE `community_settings` (
	`key` varchar(60) NOT NULL,
	`value` longtext NOT NULL,
	`updated_by` varchar(36),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `community_tags` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(40) NOT NULL,
	`name` varchar(40) NOT NULL,
	`use_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_tutorials` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`section_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`level` varchar(12) NOT NULL,
	`language` varchar(8) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`title` varchar(200) NOT NULL,
	`summary` varchar(400) NOT NULL,
	`body` text NOT NULL,
	`video_url` varchar(512),
	`cover_url` varchar(512),
	`duration_minutes` int,
	`tags` longtext NOT NULL,
	`official` boolean NOT NULL DEFAULT true,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`published_at` datetime(3),
	CONSTRAINT `community_tutorials_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_tutorials_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_verification_requests` (
	`id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`full_name` varchar(120) NOT NULL,
	`id_proof_key` varchar(255) NOT NULL,
	`portfolio_links` longtext NOT NULL,
	`apps` longtext NOT NULL,
	`status` varchar(10) NOT NULL,
	`reason` text,
	`reviewed_by` varchar(36),
	`reviewed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_verification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_violations` (
	`id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`kind` varchar(24) NOT NULL,
	`target_type` varchar(12),
	`target_id` varchar(36),
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_votes` (
	`member_id` varchar(36) NOT NULL,
	`target_type` varchar(12) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`value` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_votes_member_id_target_type_target_id_pk` PRIMARY KEY(`member_id`,`target_type`,`target_id`)
);
--> statement-breakpoint
ALTER TABLE `community_answers` ADD CONSTRAINT `community_answers_question_id_community_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_answers` ADD CONSTRAINT `community_answers_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_badges` ADD CONSTRAINT `community_badges_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_blocks` ADD CONSTRAINT `community_blocks_blocker_id_community_members_id_fk` FOREIGN KEY (`blocker_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_blocks` ADD CONSTRAINT `community_blocks_blocked_id_community_members_id_fk` FOREIGN KEY (`blocked_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_email_tokens` ADD CONSTRAINT `community_email_tokens_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_follows` ADD CONSTRAINT `community_follows_follower_id_community_members_id_fk` FOREIGN KEY (`follower_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_follows` ADD CONSTRAINT `community_follows_followee_id_community_members_id_fk` FOREIGN KEY (`followee_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_friendships` ADD CONSTRAINT `community_friendships_requester_id_community_members_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_friendships` ADD CONSTRAINT `community_friendships_addressee_id_community_members_id_fk` FOREIGN KEY (`addressee_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_identities` ADD CONSTRAINT `community_identities_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_link_requests` ADD CONSTRAINT `community_link_requests_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_notification_prefs` ADD CONSTRAINT `community_notification_prefs_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_notifications` ADD CONSTRAINT `community_notifications_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_question_tags` ADD CONSTRAINT `community_question_tags_question_id_community_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_question_tags` ADD CONSTRAINT `community_question_tags_tag_id_community_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `community_tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_questions` ADD CONSTRAINT `community_questions_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_questions` ADD CONSTRAINT `community_questions_section_id_community_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `community_sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_reports` ADD CONSTRAINT `community_reports_reporter_id_community_members_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_sessions` ADD CONSTRAINT `community_sessions_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_tutorials` ADD CONSTRAINT `community_tutorials_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_tutorials` ADD CONSTRAINT `community_tutorials_section_id_community_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `community_sections`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_verification_requests` ADD CONSTRAINT `community_verification_member_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_violations` ADD CONSTRAINT `community_violations_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_votes` ADD CONSTRAINT `community_votes_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_answers_question` ON `community_answers` (`question_id`,`status`);--> statement-breakpoint
CREATE INDEX `community_answers_author` ON `community_answers` (`author_id`);--> statement-breakpoint
CREATE INDEX `community_audit_created` ON `community_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `community_audit_member` ON `community_audit_log` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_badges_member` ON `community_badges` (`member_id`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `community_badges_badge` ON `community_badges` (`badge`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `community_blocks_blocked` ON `community_blocks` (`blocked_id`);--> statement-breakpoint
CREATE INDEX `community_email_tokens_member` ON `community_email_tokens` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_follows_followee` ON `community_follows` (`followee_id`);--> statement-breakpoint
CREATE INDEX `community_friendships_requester` ON `community_friendships` (`requester_id`);--> statement-breakpoint
CREATE INDEX `community_friendships_addressee` ON `community_friendships` (`addressee_id`);--> statement-breakpoint
CREATE INDEX `community_identities_member` ON `community_identities` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_link_requests_member` ON `community_link_requests` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_members_points` ON `community_members` (`points`);--> statement-breakpoint
CREATE INDEX `community_moderation_status` ON `community_moderation_items` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_notifications_member` ON `community_notifications` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_notifications_unread` ON `community_notifications` (`member_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `community_question_tags_tag` ON `community_question_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `community_questions_section` ON `community_questions` (`section_id`,`status`,`last_activity_at`);--> statement-breakpoint
CREATE INDEX `community_questions_author` ON `community_questions` (`author_id`);--> statement-breakpoint
CREATE INDEX `community_questions_status` ON `community_questions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_reports_status` ON `community_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_reports_target` ON `community_reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `community_sessions_member` ON `community_sessions` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_tutorials_section` ON `community_tutorials` (`section_id`,`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `community_tutorials_author` ON `community_tutorials` (`author_id`);--> statement-breakpoint
CREATE INDEX `community_verification_member` ON `community_verification_requests` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_verification_status` ON `community_verification_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_violations_member` ON `community_violations` (`member_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_votes_target` ON `community_votes` (`target_type`,`target_id`);