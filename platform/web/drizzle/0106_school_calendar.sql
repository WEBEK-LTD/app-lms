CREATE TABLE `school_behaviour` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`class_id` bigint unsigned,
	`category_id` bigint unsigned,
	`category_name` varchar(60) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`points` int NOT NULL,
	`note` varchar(500),
	`teacher_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_behaviour_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_behaviour_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(60) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`points` int NOT NULL,
	`position` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_behaviour_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`title` varchar(120) NOT NULL,
	`notes` varchar(1000),
	`starts_on` varchar(10) NOT NULL,
	`ends_on` varchar(10) NOT NULL,
	`start_minute` int,
	`end_minute` int,
	`place` varchar(120),
	`audience` varchar(8) NOT NULL,
	`grade` varchar(80),
	`class_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_exams` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`class_id` bigint unsigned,
	`grade` varchar(80),
	`subject_id` bigint unsigned NOT NULL,
	`date` varchar(10) NOT NULL,
	`start_minute` int NOT NULL,
	`duration_minutes` int NOT NULL,
	`room` varchar(40),
	`notes` varchar(2000),
	`published` boolean NOT NULL DEFAULT false,
	`published_at` datetime(3),
	`reminded_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_category_id_school_behaviour_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `school_behaviour_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour_categories` ADD CONSTRAINT `school_behaviour_categories_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_events` ADD CONSTRAINT `school_events_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_events` ADD CONSTRAINT `school_events_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_exams` ADD CONSTRAINT `school_exams_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_exams` ADD CONSTRAINT `school_exams_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_exams` ADD CONSTRAINT `school_exams_subject_id_school_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `school_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_behaviour_student_idx` ON `school_behaviour` (`app_id`,`student_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `school_behaviour_class_idx` ON `school_behaviour` (`app_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `school_behaviour_categories_app_idx` ON `school_behaviour_categories` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `school_events_app_idx` ON `school_events` (`app_id`,`starts_on`);--> statement-breakpoint
CREATE INDEX `school_exams_app_idx` ON `school_exams` (`app_id`,`date`);