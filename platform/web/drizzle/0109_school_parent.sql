CREATE TABLE `school_excuses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`parent_id` bigint unsigned,
	`starts_on` varchar(10) NOT NULL,
	`ends_on` varchar(10) NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`file` longtext,
	`status` varchar(10) NOT NULL,
	`answer` varchar(1000),
	`answered_by` varchar(191),
	`answered_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_excuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_pickup_notes` (
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`date` varchar(10) NOT NULL,
	`name` varchar(120) NOT NULL,
	`relation` varchar(60),
	`phone` varchar(30),
	`note` varchar(300),
	`written_by` varchar(191),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_pickup_notes_student_id_date_pk` PRIMARY KEY(`student_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `school_pickups` (
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`people` longtext NOT NULL,
	`updated_by` varchar(191),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_pickups_student_id` PRIMARY KEY(`student_id`)
);
--> statement-breakpoint
CREATE TABLE `school_slip_answers` (
	`app_id` varchar(36) NOT NULL,
	`slip_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`answer` varchar(3) NOT NULL,
	`signed_name` varchar(120) NOT NULL,
	`parent_id` bigint unsigned,
	`answered_at` datetime(3) NOT NULL,
	CONSTRAINT `school_slip_answers_slip_id_student_id_pk` PRIMARY KEY(`slip_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `school_slips` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`details` varchar(2000),
	`due_on` varchar(10) NOT NULL,
	`fee_note` varchar(200),
	`audience` varchar(8) NOT NULL,
	`grade` varchar(80),
	`class_id` bigint unsigned,
	`reminded_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_slips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `school_excuses` ADD CONSTRAINT `school_excuses_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_excuses` ADD CONSTRAINT `school_excuses_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_excuses` ADD CONSTRAINT `school_excuses_parent_id_school_people_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickup_notes` ADD CONSTRAINT `school_pickup_notes_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickup_notes` ADD CONSTRAINT `school_pickup_notes_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickups` ADD CONSTRAINT `school_pickups_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickups` ADD CONSTRAINT `school_pickups_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_slip_id_school_slips_id_fk` FOREIGN KEY (`slip_id`) REFERENCES `school_slips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_parent_id_school_people_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slips` ADD CONSTRAINT `school_slips_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slips` ADD CONSTRAINT `school_slips_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_excuses_app_idx` ON `school_excuses` (`app_id`,`status`,`starts_on`);--> statement-breakpoint
CREATE INDEX `school_excuses_student_idx` ON `school_excuses` (`student_id`);--> statement-breakpoint
CREATE INDEX `school_pickup_notes_app_date_idx` ON `school_pickup_notes` (`app_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_slip_answers_student_idx` ON `school_slip_answers` (`app_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `school_slips_app_idx` ON `school_slips` (`app_id`,`due_on`);