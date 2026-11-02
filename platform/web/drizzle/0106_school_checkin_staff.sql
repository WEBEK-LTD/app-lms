CREATE TABLE `school_checkins` (
	`app_id` varchar(36) NOT NULL,
	`person_id` bigint unsigned NOT NULL,
	`role` varchar(10) NOT NULL,
	`date` varchar(10) NOT NULL,
	`in_at` datetime(3),
	`in_method` varchar(10),
	`out_at` datetime(3),
	`out_method` varchar(10),
	`late` boolean NOT NULL DEFAULT false,
	`left_early` boolean NOT NULL DEFAULT false,
	`mark` varchar(8),
	`corrections` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_checkins_person_id_date_pk` PRIMARY KEY(`person_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `school_leave` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`person_id` bigint unsigned NOT NULL,
	`kind` varchar(8) NOT NULL,
	`starts_on` varchar(10) NOT NULL,
	`ends_on` varchar(10) NOT NULL,
	`note` varchar(1000),
	`file` longtext,
	`status` varchar(10) NOT NULL,
	`answer` varchar(1000),
	`answered_by` varchar(191),
	`answered_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_leave_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `school_people` ADD `job_title` varchar(80);--> statement-breakpoint
ALTER TABLE `school_people` ADD `department` varchar(80);--> statement-breakpoint
ALTER TABLE `school_people` ADD `work_hours` longtext;--> statement-breakpoint
ALTER TABLE `school_people` ADD `duties` varchar(1000);--> statement-breakpoint
ALTER TABLE `school_checkins` ADD CONSTRAINT `school_checkins_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_checkins` ADD CONSTRAINT `school_checkins_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_leave` ADD CONSTRAINT `school_leave_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_leave` ADD CONSTRAINT `school_leave_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_checkins_app_date_idx` ON `school_checkins` (`app_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_leave_app_idx` ON `school_leave` (`app_id`,`status`,`starts_on`);--> statement-breakpoint
CREATE INDEX `school_leave_person_idx` ON `school_leave` (`person_id`);