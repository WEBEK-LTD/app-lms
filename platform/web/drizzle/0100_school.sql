CREATE TABLE `school_announcements` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`audience` varchar(8) NOT NULL,
	`class_id` bigint unsigned,
	`student_id` bigint unsigned,
	`title` varchar(120) NOT NULL,
	`body` text NOT NULL,
	`teacher_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_assessments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`subject_id` bigint unsigned NOT NULL,
	`teacher_id` bigint unsigned,
	`kind` varchar(12) NOT NULL,
	`title` varchar(120) NOT NULL,
	`date` varchar(10) NOT NULL,
	`max_score` double NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_attendance` (
	`app_id` varchar(36) NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`date` varchar(10) NOT NULL,
	`status` varchar(8) NOT NULL,
	`note` varchar(300),
	`taken_by` bigint unsigned,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_attendance_student_id_date_pk` PRIMARY KEY(`student_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `school_classes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`grade` varchar(80),
	`homeroom_teacher_id` bigint unsigned,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_family` (
	`app_id` varchar(36) NOT NULL,
	`parent_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	CONSTRAINT `school_family_parent_id_student_id_pk` PRIMARY KEY(`parent_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `school_fees` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`title` varchar(120) NOT NULL,
	`amount_cents` bigint NOT NULL,
	`due_on` varchar(10),
	`status` varchar(10) NOT NULL,
	`paid_at` datetime(3),
	`paid_by` varchar(8),
	`order_id` bigint unsigned,
	`receipt_code` varchar(40),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_fees_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_fees_receipt_unique` UNIQUE(`receipt_code`)
);
--> statement-breakpoint
CREATE TABLE `school_homework` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`subject_id` bigint unsigned NOT NULL,
	`teacher_id` bigint unsigned,
	`title` varchar(200) NOT NULL,
	`text` text NOT NULL,
	`due_on` varchar(10) NOT NULL,
	`files` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_homework_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_people` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`role` varchar(10) NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(24),
	`email` varchar(191),
	`user_id` bigint unsigned,
	`class_id` bigint unsigned,
	`code` varchar(40),
	`photo_asset_id` varchar(36),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_people_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_people_role_phone_unique` UNIQUE(`app_id`,`role`,`phone`),
	CONSTRAINT `school_people_role_email_unique` UNIQUE(`app_id`,`role`,`email`)
);
--> statement-breakpoint
CREATE TABLE `school_periods` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`subject_id` bigint unsigned NOT NULL,
	`teacher_id` bigint unsigned,
	`weekday` tinyint NOT NULL,
	`start_minute` int NOT NULL,
	`end_minute` int NOT NULL,
	`room` varchar(40),
	CONSTRAINT `school_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_scores` (
	`app_id` varchar(36) NOT NULL,
	`assessment_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`score` double NOT NULL,
	`note` varchar(300),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_scores_assessment_id_student_id_pk` PRIMARY KEY(`assessment_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `school_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
CREATE TABLE `school_subjects` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_subjects_app_name_unique` UNIQUE(`app_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `school_submissions` (
	`app_id` varchar(36) NOT NULL,
	`homework_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`text` text NOT NULL,
	`file` longtext,
	`submitted_at` datetime(3),
	`late` boolean NOT NULL DEFAULT false,
	`mark` varchar(20),
	`feedback` varchar(1000),
	`marked_at` datetime(3),
	CONSTRAINT `school_submissions_homework_id_student_id_pk` PRIMARY KEY(`homework_id`,`student_id`)
);
--> statement-breakpoint
ALTER TABLE `school_announcements` ADD CONSTRAINT `school_announcements_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_assessments` ADD CONSTRAINT `school_assessments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_assessments` ADD CONSTRAINT `school_assessments_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_attendance` ADD CONSTRAINT `school_attendance_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_attendance` ADD CONSTRAINT `school_attendance_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_classes` ADD CONSTRAINT `school_classes_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_family` ADD CONSTRAINT `school_family_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_family` ADD CONSTRAINT `school_family_parent_id_school_people_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_family` ADD CONSTRAINT `school_family_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_fees` ADD CONSTRAINT `school_fees_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_fees` ADD CONSTRAINT `school_fees_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_homework` ADD CONSTRAINT `school_homework_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_homework` ADD CONSTRAINT `school_homework_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_people` ADD CONSTRAINT `school_people_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_people` ADD CONSTRAINT `school_people_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_people` ADD CONSTRAINT `school_people_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_periods` ADD CONSTRAINT `school_periods_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_periods` ADD CONSTRAINT `school_periods_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_periods` ADD CONSTRAINT `school_periods_subject_id_school_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `school_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_periods` ADD CONSTRAINT `school_periods_teacher_id_school_people_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_scores` ADD CONSTRAINT `school_scores_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_scores` ADD CONSTRAINT `school_scores_assessment_id_school_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `school_assessments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_scores` ADD CONSTRAINT `school_scores_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_settings` ADD CONSTRAINT `school_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_subjects` ADD CONSTRAINT `school_subjects_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_submissions` ADD CONSTRAINT `school_submissions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_submissions` ADD CONSTRAINT `school_submissions_homework_id_school_homework_id_fk` FOREIGN KEY (`homework_id`) REFERENCES `school_homework`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_submissions` ADD CONSTRAINT `school_submissions_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_announcements_app_idx` ON `school_announcements` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `school_assessments_class_idx` ON `school_assessments` (`class_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_assessments_teacher_idx` ON `school_assessments` (`app_id`,`teacher_id`);--> statement-breakpoint
CREATE INDEX `school_attendance_class_idx` ON `school_attendance` (`class_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_classes_app_idx` ON `school_classes` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `school_family_student_idx` ON `school_family` (`student_id`);--> statement-breakpoint
CREATE INDEX `school_fees_student_idx` ON `school_fees` (`app_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `school_homework_class_idx` ON `school_homework` (`class_id`,`due_on`);--> statement-breakpoint
CREATE INDEX `school_homework_teacher_idx` ON `school_homework` (`app_id`,`teacher_id`);--> statement-breakpoint
CREATE INDEX `school_people_class_idx` ON `school_people` (`app_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `school_periods_class_idx` ON `school_periods` (`class_id`,`weekday`);--> statement-breakpoint
CREATE INDEX `school_periods_teacher_idx` ON `school_periods` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `school_scores_student_idx` ON `school_scores` (`student_id`);--> statement-breakpoint
CREATE INDEX `school_submissions_student_idx` ON `school_submissions` (`student_id`);