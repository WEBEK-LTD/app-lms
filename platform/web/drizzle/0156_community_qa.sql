CREATE TABLE `community_bookmarks` (
	`member_id` varchar(36) NOT NULL,
	`target_type` varchar(12) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_bookmarks_member_id_target_type_target_id_pk` PRIMARY KEY(`member_id`,`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `community_point_events` (
	`id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`reason` varchar(24) NOT NULL,
	`points` int NOT NULL,
	`ref` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_point_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_replies` (
	`id` varchar(36) NOT NULL,
	`answer_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` varchar(1000) NOT NULL,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_section_follows` (
	`member_id` varchar(36) NOT NULL,
	`section_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_section_follows_member_id_section_id_pk` PRIMARY KEY(`member_id`,`section_id`)
);
--> statement-breakpoint
ALTER TABLE `community_answers` ADD `reply_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `community_questions` ADD `slug` varchar(160) NOT NULL;--> statement-breakpoint
ALTER TABLE `community_tutorials` ADD `duration_seconds` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `community_tutorials` ADD `view_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `community_questions` ADD CONSTRAINT `community_questions_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `community_bookmarks` ADD CONSTRAINT `community_bookmarks_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_point_events` ADD CONSTRAINT `community_point_events_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_replies` ADD CONSTRAINT `community_replies_answer_id_community_answers_id_fk` FOREIGN KEY (`answer_id`) REFERENCES `community_answers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_replies` ADD CONSTRAINT `community_replies_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_section_follows` ADD CONSTRAINT `community_section_follows_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_section_follows` ADD CONSTRAINT `community_section_follows_section_id_community_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `community_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_bookmarks_member` ON `community_bookmarks` (`member_id`,`target_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_point_events_member` ON `community_point_events` (`member_id`,`reason`,`ref`);--> statement-breakpoint
CREATE INDEX `community_point_events_time` ON `community_point_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `community_replies_answer` ON `community_replies` (`answer_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_replies_author` ON `community_replies` (`author_id`);