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
ALTER TABLE `school_payslips` ADD CONSTRAINT `school_payslips_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salaries` ADD CONSTRAINT `school_salaries_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salaries` ADD CONSTRAINT `school_salaries_person_id_school_people_id_fk` FOREIGN KEY (`person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salary_advances` ADD CONSTRAINT `school_salary_advances_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `school_salary_months` ADD CONSTRAINT `school_salary_months_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `school_payslips_month_idx` ON `school_payslips` (`app_id`,`month`);--> statement-breakpoint
CREATE INDEX `school_salary_advances_person_idx` ON `school_salary_advances` (`app_id`,`person_id`);