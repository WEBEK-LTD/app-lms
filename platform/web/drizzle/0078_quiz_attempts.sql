CREATE TABLE `quiz_attempts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`course_id` int NOT NULL,
	`quiz_id` int NOT NULL,
	`answers` longtext,
	`score_percent` int,
	`passed` boolean,
	`started_at` datetime(3) NOT NULL,
	`submitted_at` datetime(3),
	CONSTRAINT `quiz_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `quiz_attempts_user_idx` ON `quiz_attempts` (`app_id`,`user_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `quiz_attempts_quiz_idx` ON `quiz_attempts` (`app_id`,`quiz_id`);