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
CREATE TABLE `school_payslips` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`person_id` bigint unsigned NOT NULL,
	`month` varchar(7) NOT NULL,
	`person_name` varchar(120) NOT NULL,
	`role` varchar(8) NOT NULL,
	`job_title` varchar(80),
	`department` varchar(80),
	`currency` varchar(3) NOT NULL,
	`base_cents` bigint NOT NULL,
	`allowances` longtext NOT NULL,
	`sheet_lines` longtext NOT NULL,
	`attendance` longtext,
	`net_cents` bigint NOT NULL,
	`status` varchar(8) NOT NULL,
	`payments` longtext NOT NULL,
	`paid_cents` bigint NOT NULL,
	`note` varchar(500),
	`final_at` datetime(3),
	`final_by` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_payslips_id` PRIMARY KEY(`id`),
	CONSTRAINT `school_payslips_person_month_unique` UNIQUE(`app_id`,`person_id`,`month`)
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
CREATE TABLE `school_salaries` (
	`app_id` varchar(36) NOT NULL,
	`person_id` bigint unsigned NOT NULL,
	`monthly_cents` bigint NOT NULL,
	`currency` varchar(3) NOT NULL,
	`allowances` longtext NOT NULL,
	`note` varchar(500),
	`updated_by` varchar(191),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_salaries_app_id_person_id_pk` PRIMARY KEY(`app_id`,`person_id`)
);
--> statement-breakpoint
CREATE TABLE `school_salary_advances` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`person_id` bigint unsigned NOT NULL,
	`person_name` varchar(120) NOT NULL,
	`currency` varchar(3) NOT NULL,
	`amount_cents` bigint NOT NULL,
	`instalment_cents` bigint NOT NULL,
	`starts_month` varchar(7) NOT NULL,
	`given` longtext NOT NULL,
	`repayments` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_salary_advances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `school_salary_months` (
	`app_id` varchar(36) NOT NULL,
	`month` varchar(7) NOT NULL,
	`locked_at` datetime(3),
	`locked_by` varchar(191),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `school_salary_months_app_id_month_pk` PRIMARY KEY(`app_id`,`month`)
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
CREATE TABLE `uni_attendance` (
	`app_id` varchar(36) NOT NULL,
	`section_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`date` varchar(10) NOT NULL,
	`status` varchar(10) NOT NULL,
	`note` varchar(300),
	`taken_by` bigint unsigned,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_attendance_section_id_student_id_date_pk` PRIMARY KEY(`section_id`,`student_id`,`date`)
);
--> statement-breakpoint
CREATE TABLE `uni_courses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`department_id` bigint unsigned,
	`code` varchar(20) NOT NULL,
	`title` varchar(160) NOT NULL,
	`credits` double NOT NULL,
	`prerequisites` longtext NOT NULL,
	`description` text NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `uni_courses_app_code_unique` UNIQUE(`app_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `uni_departments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`faculty_id` bigint unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(20),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uni_enrolments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`term_id` bigint unsigned NOT NULL,
	`section_id` bigint unsigned NOT NULL,
	`course_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`status` varchar(10) NOT NULL,
	`added_by` varchar(8) NOT NULL,
	`added_at` datetime(3) NOT NULL,
	`dropped_at` datetime(3),
	`grade` varchar(4),
	`mark` double,
	`graded_at` datetime(3),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_enrolments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uni_enrolments_section_student_unique` UNIQUE(`section_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `uni_faculties` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(20),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_faculties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uni_programs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`department_id` bigint unsigned NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(20),
	`degree` varchar(40) NOT NULL,
	`credits_required` int NOT NULL,
	`years` int NOT NULL,
	`min_term_credits` int NOT NULL,
	`max_term_credits` int NOT NULL,
	`plan` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uni_registrations` (
	`app_id` varchar(36) NOT NULL,
	`term_id` bigint unsigned NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`status` varchar(10) NOT NULL,
	`note` varchar(500),
	`submitted_at` datetime(3),
	`decided_at` datetime(3),
	`decided_by` bigint unsigned,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_registrations_term_id_student_id_pk` PRIMARY KEY(`term_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `uni_sections` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`term_id` bigint unsigned NOT NULL,
	`course_id` bigint unsigned NOT NULL,
	`code` varchar(20) NOT NULL,
	`lecturer_id` bigint unsigned,
	`seats` int NOT NULL,
	`meetings` longtext NOT NULL,
	`results_published_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uni_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
CREATE TABLE `uni_students` (
	`app_id` varchar(36) NOT NULL,
	`student_id` bigint unsigned NOT NULL,
	`program_id` bigint unsigned,
	`advisor_id` bigint unsigned,
	`start_year` varchar(20),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_students_student_id` PRIMARY KEY(`student_id`)
);
--> statement-breakpoint
CREATE TABLE `uni_terms` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`academic_year` varchar(20) NOT NULL,
	`starts_on` varchar(10) NOT NULL,
	`ends_on` varchar(10) NOT NULL,
	`registration_opens` varchar(10) NOT NULL,
	`registration_closes` varchar(10) NOT NULL,
	`drop_until` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `uni_terms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `school_excuses` ADD CONSTRAINT `school_excuses_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_excuses` ADD CONSTRAINT `school_excuses_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_excuses` ADD CONSTRAINT `school_excuses_parent_id_school_people_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_payslips` ADD CONSTRAINT `school_payslips_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickup_notes` ADD CONSTRAINT `school_pickup_notes_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickup_notes` ADD CONSTRAINT `school_pickup_notes_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickups` ADD CONSTRAINT `school_pickups_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_pickups` ADD CONSTRAINT `school_pickups_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salaries` ADD CONSTRAINT `school_salaries_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salaries` ADD CONSTRAINT `school_salaries_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salary_advances` ADD CONSTRAINT `school_salary_advances_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salary_months` ADD CONSTRAINT `school_salary_months_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_slip_id_school_slips_id_fk` FOREIGN KEY (`slip_id`) REFERENCES `school_slips`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slip_answers` ADD CONSTRAINT `school_slip_answers_parent_id_school_people_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slips` ADD CONSTRAINT `school_slips_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_slips` ADD CONSTRAINT `school_slips_class_id_school_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `school_classes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_attendance` ADD CONSTRAINT `uni_attendance_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_attendance` ADD CONSTRAINT `uni_attendance_section_id_uni_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `uni_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_attendance` ADD CONSTRAINT `uni_attendance_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_courses` ADD CONSTRAINT `uni_courses_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_courses` ADD CONSTRAINT `uni_courses_department_id_uni_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `uni_departments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_departments` ADD CONSTRAINT `uni_departments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_departments` ADD CONSTRAINT `uni_departments_faculty_id_uni_faculties_id_fk` FOREIGN KEY (`faculty_id`) REFERENCES `uni_faculties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_enrolments` ADD CONSTRAINT `uni_enrolments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_enrolments` ADD CONSTRAINT `uni_enrolments_section_id_uni_sections_id_fk` FOREIGN KEY (`section_id`) REFERENCES `uni_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_enrolments` ADD CONSTRAINT `uni_enrolments_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_faculties` ADD CONSTRAINT `uni_faculties_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_programs` ADD CONSTRAINT `uni_programs_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_programs` ADD CONSTRAINT `uni_programs_department_id_uni_departments_id_fk` FOREIGN KEY (`department_id`) REFERENCES `uni_departments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_registrations` ADD CONSTRAINT `uni_registrations_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_registrations` ADD CONSTRAINT `uni_registrations_term_id_uni_terms_id_fk` FOREIGN KEY (`term_id`) REFERENCES `uni_terms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_registrations` ADD CONSTRAINT `uni_registrations_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_sections` ADD CONSTRAINT `uni_sections_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_sections` ADD CONSTRAINT `uni_sections_term_id_uni_terms_id_fk` FOREIGN KEY (`term_id`) REFERENCES `uni_terms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_sections` ADD CONSTRAINT `uni_sections_course_id_uni_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `uni_courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_sections` ADD CONSTRAINT `uni_sections_lecturer_id_school_people_id_fk` FOREIGN KEY (`lecturer_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_settings` ADD CONSTRAINT `uni_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_students` ADD CONSTRAINT `uni_students_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_students` ADD CONSTRAINT `uni_students_student_id_school_people_id_fk` FOREIGN KEY (`student_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_students` ADD CONSTRAINT `uni_students_program_id_uni_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `uni_programs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_students` ADD CONSTRAINT `uni_students_advisor_id_school_people_id_fk` FOREIGN KEY (`advisor_id`) REFERENCES `school_people`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `uni_terms` ADD CONSTRAINT `uni_terms_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_excuses_app_idx` ON `school_excuses` (`app_id`,`status`,`starts_on`);--> statement-breakpoint
CREATE INDEX `school_excuses_student_idx` ON `school_excuses` (`student_id`);--> statement-breakpoint
CREATE INDEX `school_payslips_month_idx` ON `school_payslips` (`app_id`,`month`);--> statement-breakpoint
CREATE INDEX `school_pickup_notes_app_date_idx` ON `school_pickup_notes` (`app_id`,`date`);--> statement-breakpoint
CREATE INDEX `school_salary_advances_person_idx` ON `school_salary_advances` (`app_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `school_slip_answers_student_idx` ON `school_slip_answers` (`app_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `school_slips_app_idx` ON `school_slips` (`app_id`,`due_on`);--> statement-breakpoint
CREATE INDEX `uni_attendance_student_idx` ON `uni_attendance` (`student_id`);--> statement-breakpoint
CREATE INDEX `uni_departments_app_idx` ON `uni_departments` (`app_id`,`name`);--> statement-breakpoint
CREATE INDEX `uni_departments_faculty_idx` ON `uni_departments` (`faculty_id`);--> statement-breakpoint
CREATE INDEX `uni_enrolments_student_idx` ON `uni_enrolments` (`app_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `uni_enrolments_term_idx` ON `uni_enrolments` (`app_id`,`term_id`);--> statement-breakpoint
CREATE INDEX `uni_faculties_app_idx` ON `uni_faculties` (`app_id`,`name`);--> statement-breakpoint
CREATE INDEX `uni_programs_app_idx` ON `uni_programs` (`app_id`,`name`);--> statement-breakpoint
CREATE INDEX `uni_programs_department_idx` ON `uni_programs` (`department_id`);--> statement-breakpoint
CREATE INDEX `uni_registrations_app_idx` ON `uni_registrations` (`app_id`,`term_id`,`status`);--> statement-breakpoint
CREATE INDEX `uni_registrations_student_idx` ON `uni_registrations` (`student_id`);--> statement-breakpoint
CREATE INDEX `uni_sections_term_idx` ON `uni_sections` (`app_id`,`term_id`);--> statement-breakpoint
CREATE INDEX `uni_sections_course_idx` ON `uni_sections` (`course_id`);--> statement-breakpoint
CREATE INDEX `uni_sections_lecturer_idx` ON `uni_sections` (`lecturer_id`);--> statement-breakpoint
CREATE INDEX `uni_students_app_idx` ON `uni_students` (`app_id`);--> statement-breakpoint
CREATE INDEX `uni_students_advisor_idx` ON `uni_students` (`advisor_id`);--> statement-breakpoint
CREATE INDEX `uni_terms_app_idx` ON `uni_terms` (`app_id`,`starts_on`);