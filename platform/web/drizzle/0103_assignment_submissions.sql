CREATE TABLE `assignment_submissions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_id` int NOT NULL,
	`assignment_id` int NOT NULL,
	`text` text NOT NULL,
	`file` longtext,
	`status` varchar(16) NOT NULL,
	`score` int,
	`feedback` text,
	`submitted_at` datetime(3) NOT NULL,
	`graded_at` datetime(3),
	`graded_by` varchar(120),
	CONSTRAINT `assignment_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignment_submissions_unique` UNIQUE(`app_id`,`assignment_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignment_submissions_course_idx` ON `assignment_submissions` (`app_id`,`course_id`,`status`);--> statement-breakpoint
CREATE INDEX `assignment_submissions_user_idx` ON `assignment_submissions` (`app_id`,`user_id`,`course_id`);