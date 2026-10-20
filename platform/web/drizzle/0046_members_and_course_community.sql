CREATE TABLE `course_answers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`question_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`text` text NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `course_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_questions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`text` text NOT NULL,
	`status` varchar(16) NOT NULL,
	`answer_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `course_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_reviews` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`course_id` int NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`rating` int NOT NULL,
	`text` text NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`reply_text` text,
	`reply_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `course_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_reviews_student_unique` UNIQUE(`app_id`,`course_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `member_check_ins` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`membership_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`day` varchar(10) NOT NULL,
	`at` datetime(3) NOT NULL,
	`by_name` varchar(120) NOT NULL,
	CONSTRAINT `member_check_ins_id` PRIMARY KEY(`id`),
	CONSTRAINT `member_check_ins_day_unique` UNIQUE(`app_id`,`user_id`,`day`)
);
--> statement-breakpoint
ALTER TABLE `course_answers` ADD CONSTRAINT `course_answers_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_answers` ADD CONSTRAINT `course_answers_question_id_course_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `course_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_answers` ADD CONSTRAINT `course_answers_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_questions` ADD CONSTRAINT `course_questions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_questions` ADD CONSTRAINT `course_questions_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_reviews` ADD CONSTRAINT `course_reviews_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `course_reviews` ADD CONSTRAINT `course_reviews_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_check_ins` ADD CONSTRAINT `member_check_ins_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_check_ins` ADD CONSTRAINT `member_check_ins_membership_id_memberships_id_fk` FOREIGN KEY (`membership_id`) REFERENCES `memberships`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `member_check_ins` ADD CONSTRAINT `member_check_ins_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_answers_question_idx` ON `course_answers` (`question_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `course_questions_course_idx` ON `course_questions` (`app_id`,`course_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `course_questions_app_idx` ON `course_questions` (`app_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `course_reviews_app_idx` ON `course_reviews` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `member_check_ins_app_idx` ON `member_check_ins` (`app_id`,`at`);