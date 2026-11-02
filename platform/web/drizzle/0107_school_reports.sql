CREATE TABLE `school_report_templates` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`name` varchar(120) NOT NULL,
	`fields` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_report_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_reports` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`template_id` bigint unsigned,
	`template_name` varchar(120) NOT NULL,
	`fields` longtext NOT NULL,
	`answers` longtext NOT NULL,
	`teacher_id` bigint unsigned,
	`teacher_name` varchar(120) NOT NULL,
	`student_id` bigint unsigned,
	`class_id` bigint unsigned,
	`subject_id` bigint unsigned,
	`period_from` varchar(10),
	`period_to` varchar(10),
	`status` varchar(10) NOT NULL,
	`comments` longtext NOT NULL,
	`sent_at` datetime(3),
	`read_at` datetime(3),
	`reviewed_at` datetime(3),
	`shared_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_syllabus_topics` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`unit_id` bigint unsigned NOT NULL,
	`title` varchar(200) NOT NULL,
	`starts_on` varchar(10) NOT NULL,
	`ends_on` varchar(10) NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_syllabus_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_syllabus_units` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`subject_id` bigint unsigned NOT NULL,
	`grade` varchar(80) NOT NULL,
	`title` varchar(200) NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_syllabus_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_topic_progress` (
	`app_id` varchar(36) NOT NULL,
	`class_id` bigint unsigned NOT NULL,
	`topic_id` bigint unsigned NOT NULL,
	`covered_on` varchar(10) NOT NULL,
	`note` varchar(500),
	`teacher_id` bigint unsigned,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_topic_progress_class_id_topic_id_pk` PRIMARY KEY(`class_id`,`topic_id`)
);
--> statement-breakpoint
ALTER TABLE `school_report_templates` ADD CONSTRAINT `school_report_templates_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_reports` ADD CONSTRAINT `school_reports_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_reports` ADD CONSTRAINT `school_reports_template_id_school_report_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `school_report_templates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_reports` ADD CONSTRAINT `school_reports_teacher_id_school_people_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_reports` ADD CONSTRAINT `school_reports_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_reports` ADD CONSTRAINT `school_reports_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_reports` ADD CONSTRAINT `school_reports_subject_id_school_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `school_subjects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_syllabus_topics` ADD CONSTRAINT `school_syllabus_topics_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_syllabus_topics` ADD CONSTRAINT `school_syllabus_topics_unit_id_school_syllabus_units_id_fk` FOREIGN KEY (`unit_id`) REFERENCES `school_syllabus_units`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_syllabus_units` ADD CONSTRAINT `school_syllabus_units_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_syllabus_units` ADD CONSTRAINT `school_syllabus_units_subject_id_school_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `school_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_topic_progress` ADD CONSTRAINT `school_topic_progress_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_topic_progress` ADD CONSTRAINT `school_topic_progress_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_topic_progress` ADD CONSTRAINT `school_topic_progress_topic_id_school_syllabus_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `school_syllabus_topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_topic_progress` ADD CONSTRAINT `school_topic_progress_teacher_id_school_people_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_report_templates_app_idx` ON `school_report_templates` (`app_id`,`kind`);--> statement-breakpoint
CREATE INDEX `school_reports_app_idx` ON `school_reports` (`app_id`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `school_reports_teacher_idx` ON `school_reports` (`app_id`,`teacher_id`);--> statement-breakpoint
CREATE INDEX `school_reports_student_idx` ON `school_reports` (`student_id`);--> statement-breakpoint
CREATE INDEX `school_syllabus_topics_unit_idx` ON `school_syllabus_topics` (`unit_id`,`position`);--> statement-breakpoint
CREATE INDEX `school_syllabus_units_subject_idx` ON `school_syllabus_units` (`app_id`,`subject_id`,`grade`,`position`);--> statement-breakpoint
CREATE INDEX `school_topic_progress_topic_idx` ON `school_topic_progress` (`topic_id`);