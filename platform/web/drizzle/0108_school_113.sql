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
CREATE TABLE `school_book_copies` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`book_id` bigint unsigned NOT NULL,
	`code` varchar(40) NOT NULL,
	`note` varchar(120),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `school_book_copies_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_book_copies_code_unique` UNIQUE(`app_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `school_book_holds` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`book_id` bigint unsigned NOT NULL,
	`person_id` bigint unsigned NOT NULL,
	`status` varchar(10) NOT NULL,
	`copy_id` bigint unsigned,
	`ready_at` datetime(3),
	`expires_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_book_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_book_loans` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`book_id` bigint unsigned NOT NULL,
	`copy_id` bigint unsigned NOT NULL,
	`open_copy_id` bigint unsigned,
	`person_id` bigint unsigned NOT NULL,
	`lent_at` datetime(3) NOT NULL,
	`due_on` varchar(10) NOT NULL,
	`returned_at` datetime(3),
	`due_told_on` varchar(10),
	`overdue_told_on` varchar(10),
	CONSTRAINT `school_book_loans_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_book_loans_open_unique` UNIQUE(`open_copy_id`)
);
--> statement-breakpoint
CREATE TABLE `school_books` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`author` varchar(120) NOT NULL,
	`isbn` varchar(20),
	`cover_asset_id` varchar(36),
	`shelf` varchar(40),
	`category` varchar(60),
	`language` varchar(40),
	`description` text,
	`file` longtext,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_bus_marks` (
	`app_id` varchar(36) NOT NULL,
	`run_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`status` varchar(10) NOT NULL,
	`boarded_at` datetime(3),
	`off_at` datetime(3),
	`marked_by` bigint unsigned,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_bus_marks_run_id_student_id_pk` PRIMARY KEY(`run_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `school_bus_riders` (
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`trip` varchar(10) NOT NULL,
	`route_id` bigint unsigned NOT NULL,
	`stop_id` bigint unsigned NOT NULL,
	CONSTRAINT `school_bus_riders_student_id_trip_pk` PRIMARY KEY(`student_id`,`trip`)
);
--> statement-breakpoint
CREATE TABLE `school_bus_routes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`plate` varchar(20) NOT NULL,
	`capacity` int NOT NULL,
	`driver_id` bigint unsigned,
	`supervisor_id` bigint unsigned,
	`active` boolean NOT NULL DEFAULT true,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_bus_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_bus_runs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`route_id` bigint unsigned NOT NULL,
	`trip` varchar(10) NOT NULL,
	`date` varchar(10) NOT NULL,
	`status` varchar(10) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`ended_at` datetime(3),
	`started_by` bigint unsigned,
	`lat` double,
	`lng` double,
	`located_at` datetime(3),
	`passed_stop_ids` longtext NOT NULL,
	`told_stop_ids` longtext NOT NULL,
	CONSTRAINT `school_bus_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_bus_runs_trip_unique` UNIQUE(`route_id`,`date`,`trip`)
);
--> statement-breakpoint
CREATE TABLE `school_bus_stops` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`route_id` bigint unsigned NOT NULL,
	`name` varchar(80) NOT NULL,
	`lat` double NOT NULL,
	`lng` double NOT NULL,
	`morning_minute` int,
	`afternoon_minute` int,
	`position` int NOT NULL,
	CONSTRAINT `school_bus_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
ALTER TABLE `chat_conversations` ADD `school_teacher_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `school_person_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `teacher_wrote_at` datetime(3);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `closed_at` datetime(3);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `closed_by` varchar(120);--> statement-breakpoint
ALTER TABLE `school_people` ADD `job_title` varchar(80);--> statement-breakpoint
ALTER TABLE `school_people` ADD `department` varchar(80);--> statement-breakpoint
ALTER TABLE `school_people` ADD `work_hours` longtext;--> statement-breakpoint
ALTER TABLE `school_people` ADD `duties` varchar(1000);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_school_unique` UNIQUE(`app_id`,`school_teacher_id`,`school_person_id`);--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour` ADD CONSTRAINT `school_behaviour_category_id_school_behaviour_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `school_behaviour_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_behaviour_categories` ADD CONSTRAINT `school_behaviour_categories_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_copies` ADD CONSTRAINT `school_book_copies_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_copies` ADD CONSTRAINT `school_book_copies_book_id_school_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `school_books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_holds` ADD CONSTRAINT `school_book_holds_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_holds` ADD CONSTRAINT `school_book_holds_book_id_school_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `school_books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_holds` ADD CONSTRAINT `school_book_holds_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_holds` ADD CONSTRAINT `school_book_holds_copy_id_school_book_copies_id_fk` FOREIGN KEY (`copy_id`) REFERENCES `school_book_copies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_loans` ADD CONSTRAINT `school_book_loans_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_loans` ADD CONSTRAINT `school_book_loans_book_id_school_books_id_fk` FOREIGN KEY (`book_id`) REFERENCES `school_books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_loans` ADD CONSTRAINT `school_book_loans_copy_id_school_book_copies_id_fk` FOREIGN KEY (`copy_id`) REFERENCES `school_book_copies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_book_loans` ADD CONSTRAINT `school_book_loans_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_books` ADD CONSTRAINT `school_books_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_marks` ADD CONSTRAINT `school_bus_marks_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_marks` ADD CONSTRAINT `school_bus_marks_run_id_school_bus_runs_id_fk` FOREIGN KEY (`run_id`) REFERENCES `school_bus_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_marks` ADD CONSTRAINT `school_bus_marks_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_riders` ADD CONSTRAINT `school_bus_riders_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_riders` ADD CONSTRAINT `school_bus_riders_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_riders` ADD CONSTRAINT `school_bus_riders_route_id_school_bus_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `school_bus_routes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_riders` ADD CONSTRAINT `school_bus_riders_stop_id_school_bus_stops_id_fk` FOREIGN KEY (`stop_id`) REFERENCES `school_bus_stops`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_routes` ADD CONSTRAINT `school_bus_routes_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_routes` ADD CONSTRAINT `school_bus_routes_driver_id_school_people_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_routes` ADD CONSTRAINT `school_bus_routes_supervisor_id_school_people_id_fk` FOREIGN KEY (`supervisor_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_runs` ADD CONSTRAINT `school_bus_runs_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_runs` ADD CONSTRAINT `school_bus_runs_route_id_school_bus_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `school_bus_routes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_stops` ADD CONSTRAINT `school_bus_stops_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_bus_stops` ADD CONSTRAINT `school_bus_stops_route_id_school_bus_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `school_bus_routes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_checkins` ADD CONSTRAINT `school_checkins_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_checkins` ADD CONSTRAINT `school_checkins_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_events` ADD CONSTRAINT `school_events_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_events` ADD CONSTRAINT `school_events_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_exams` ADD CONSTRAINT `school_exams_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_exams` ADD CONSTRAINT `school_exams_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_exams` ADD CONSTRAINT `school_exams_subject_id_school_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `school_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_leave` ADD CONSTRAINT `school_leave_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_leave` ADD CONSTRAINT `school_leave_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_behaviour_student_idx` ON `school_behaviour` (`app_id`,`student_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `school_behaviour_class_idx` ON `school_behaviour` (`app_id`,`class_id`);--> statement-breakpoint
CREATE INDEX `school_behaviour_categories_app_idx` ON `school_behaviour_categories` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `school_book_copies_book_idx` ON `school_book_copies` (`book_id`);--> statement-breakpoint
CREATE INDEX `school_book_holds_book_idx` ON `school_book_holds` (`book_id`,`status`);--> statement-breakpoint
CREATE INDEX `school_book_holds_person_idx` ON `school_book_holds` (`app_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `school_book_loans_person_idx` ON `school_book_loans` (`app_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `school_book_loans_book_idx` ON `school_book_loans` (`book_id`);--> statement-breakpoint
CREATE INDEX `school_book_loans_due_idx` ON `school_book_loans` (`returned_at`,`due_on`);--> statement-breakpoint
CREATE INDEX `school_books_app_idx` ON `school_books` (`app_id`,`title`);--> statement-breakpoint
CREATE INDEX `school_bus_marks_student_idx` ON `school_bus_marks` (`student_id`);--> statement-breakpoint
CREATE INDEX `school_bus_riders_route_idx` ON `school_bus_riders` (`route_id`);--> statement-breakpoint
CREATE INDEX `school_bus_riders_stop_idx` ON `school_bus_riders` (`stop_id`);--> statement-breakpoint
CREATE INDEX `school_bus_routes_app_idx` ON `school_bus_routes` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `school_bus_routes_driver_idx` ON `school_bus_routes` (`driver_id`);--> statement-breakpoint
CREATE INDEX `school_bus_routes_supervisor_idx` ON `school_bus_routes` (`supervisor_id`);--> statement-breakpoint
CREATE INDEX `school_bus_runs_app_idx` ON `school_bus_runs` (`app_id`,`status`,`started_at`);--> statement-breakpoint
CREATE INDEX `school_bus_stops_route_idx` ON `school_bus_stops` (`route_id`,`position`);--> statement-breakpoint
CREATE INDEX `school_checkins_app_date_idx` ON `school_checkins` (`app_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_events_app_idx` ON `school_events` (`app_id`,`starts_on`);--> statement-breakpoint
CREATE INDEX `school_exams_app_idx` ON `school_exams` (`app_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_leave_app_idx` ON `school_leave` (`app_id`,`status`,`starts_on`);--> statement-breakpoint
CREATE INDEX `school_leave_person_idx` ON `school_leave` (`person_id`);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_school_teacher_id_school_people_id_fk` FOREIGN KEY (`school_teacher_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_school_person_id_school_people_id_fk` FOREIGN KEY (`school_person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chat_conversations_school_person_idx` ON `chat_conversations` (`app_id`,`school_person_id`);