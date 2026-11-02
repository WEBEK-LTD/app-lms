CREATE TABLE `lesson_bookmarks` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_id` int NOT NULL,
	`lesson_id` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `lesson_bookmarks_app_id_user_id_lesson_id_pk` PRIMARY KEY(`app_id`,`user_id`,`lesson_id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_notes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_id` int NOT NULL,
	`lesson_id` int NOT NULL,
	`text` text NOT NULL,
	`position_seconds` int,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `lesson_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD `attempt` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD `rubric` longtext;--> statement-breakpoint
ALTER TABLE `course_questions` ADD `lesson_id` int;--> statement-breakpoint
ALTER TABLE `course_questions` ADD `pinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_bookmarks` ADD CONSTRAINT `lesson_bookmarks_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_bookmarks` ADD CONSTRAINT `lesson_bookmarks_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_notes` ADD CONSTRAINT `lesson_notes_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_notes` ADD CONSTRAINT `lesson_notes_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lesson_bookmarks_course_idx` ON `lesson_bookmarks` (`app_id`,`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `lesson_notes_user_idx` ON `lesson_notes` (`app_id`,`user_id`,`course_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `course_questions_lesson_idx` ON `course_questions` (`app_id`,`course_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `lesson_progress_course_all_idx` ON `lesson_progress` (`app_id`,`course_id`);