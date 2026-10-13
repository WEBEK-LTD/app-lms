CREATE TABLE `course_enrollments` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_id` int NOT NULL,
	`source` varchar(16) NOT NULL,
	`enrolled_at` datetime(3) NOT NULL,
	CONSTRAINT `course_enrollments_app_id_user_id_course_id_pk` PRIMARY KEY(`app_id`,`user_id`,`course_id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_id` int NOT NULL,
	`lesson_id` int NOT NULL,
	`position_seconds` int NOT NULL,
	`completed_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `lesson_progress_app_id_user_id_lesson_id_pk` PRIMARY KEY(`app_id`,`user_id`,`lesson_id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `course_setup` longtext;--> statement-breakpoint
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD CONSTRAINT `lesson_progress_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_enrollments_course_idx` ON `course_enrollments` (`app_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `lesson_progress_course_idx` ON `lesson_progress` (`app_id`,`user_id`,`course_id`);