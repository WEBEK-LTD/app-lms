CREATE TABLE `learning_time` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`day` varchar(10) NOT NULL,
	`course_id` int NOT NULL,
	`seconds` int NOT NULL,
	CONSTRAINT `learning_time_app_id_user_id_day_course_id_pk` PRIMARY KEY(`app_id`,`user_id`,`day`,`course_id`)
);
--> statement-breakpoint
ALTER TABLE `learning_time` ADD CONSTRAINT `learning_time_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_time` ADD CONSTRAINT `learning_time_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;