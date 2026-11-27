CREATE TABLE `community_certificates` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`code` varchar(20) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`member_name` varchar(120) NOT NULL,
	`course_title` varchar(160) NOT NULL,
	`issued_at` datetime(3) NOT NULL,
	CONSTRAINT `community_certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_certificates_code` UNIQUE(`code`),
	CONSTRAINT `community_certificates_member` UNIQUE(`member_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `community_course_access` (
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`member_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`source` varchar(8) NOT NULL,
	`ref` varchar(120),
	`granted_at` datetime(3) NOT NULL,
	CONSTRAINT `community_course_access_member_id_course_id_pk` PRIMARY KEY(`member_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `community_courses` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`slug` varchar(140) NOT NULL,
	`title` varchar(160) NOT NULL,
	`summary` text NOT NULL,
	`cover_url` varchar(512),
	`level` varchar(14) NOT NULL,
	`language` varchar(2) NOT NULL,
	`status` varchar(10) NOT NULL,
	`free` boolean NOT NULL DEFAULT false,
	`price_minor` int,
	`currency` varchar(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`published_at` datetime(3),
	CONSTRAINT `community_courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_courses_slug` UNIQUE(`tenant_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_lesson_progress` (
	`member_id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`completed_at` datetime(3),
	`quiz_score` int,
	`attempts` int NOT NULL DEFAULT 0,
	CONSTRAINT `community_lesson_progress_member_id_lesson_id_pk` PRIMARY KEY(`member_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `community_lessons` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`body` text NOT NULL,
	`video_url` varchar(512),
	`duration_seconds` int NOT NULL,
	`preview` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_quiz_questions` (
	`id` varchar(36) NOT NULL,
	`lesson_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`prompt` text NOT NULL,
	`options` longtext NOT NULL,
	`answer` int NOT NULL,
	CONSTRAINT `community_quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `community_certificates` ADD CONSTRAINT `community_certificates_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_certificates` ADD CONSTRAINT `community_certificates_course_id_community_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `community_courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_course_access` ADD CONSTRAINT `community_course_access_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_course_access` ADD CONSTRAINT `community_course_access_course_id_community_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `community_courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_lesson_progress` ADD CONSTRAINT `community_lesson_progress_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_lesson_progress` ADD CONSTRAINT `community_lesson_progress_lesson_id_community_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `community_lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_lessons` ADD CONSTRAINT `community_lessons_course_id_community_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `community_courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_quiz_questions` ADD CONSTRAINT `community_quiz_questions_lesson_id_community_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `community_lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_courses_list` ON `community_courses` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_lesson_progress_course` ON `community_lesson_progress` (`member_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `community_lessons_course` ON `community_lessons` (`course_id`,`position`);--> statement-breakpoint
CREATE INDEX `community_quiz_questions_lesson` ON `community_quiz_questions` (`lesson_id`,`position`);