CREATE TABLE `teacher_follows` (
	`app_id` varchar(36) NOT NULL,
	`teacher_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `teacher_follows_teacher_id_user_id_pk` PRIMARY KEY(`teacher_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_reviews` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`teacher_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`rating` int NOT NULL,
	`text` text NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `teacher_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `teacher_reviews_student_unique` UNIQUE(`teacher_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`phone` varchar(24),
	`email` varchar(191),
	`user_id` bigint unsigned,
	`photo_asset_id` varchar(36),
	`bio` text NOT NULL,
	`subjects` longtext NOT NULL,
	`status` varchar(12) NOT NULL,
	`share_bp` int NOT NULL,
	`featured` boolean NOT NULL DEFAULT false,
	`note` varchar(500),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teachers_app_phone_unique` UNIQUE(`app_id`,`phone`),
	CONSTRAINT `teachers_app_email_unique` UNIQUE(`app_id`,`email`)
);
--> statement-breakpoint
ALTER TABLE `teacher_follows` ADD CONSTRAINT `teacher_follows_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_follows` ADD CONSTRAINT `teacher_follows_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_follows` ADD CONSTRAINT `teacher_follows_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_reviews` ADD CONSTRAINT `teacher_reviews_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_reviews` ADD CONSTRAINT `teacher_reviews_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_reviews` ADD CONSTRAINT `teacher_reviews_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `teacher_follows_user_idx` ON `teacher_follows` (`app_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `teacher_reviews_app_idx` ON `teacher_reviews` (`app_id`,`created_at`);