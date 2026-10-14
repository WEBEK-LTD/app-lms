CREATE TABLE `booking_appointments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`service_id` int NOT NULL,
	`staff_id` int NOT NULL,
	`service_name` varchar(120) NOT NULL,
	`staff_name` varchar(120) NOT NULL,
	`customer_name` varchar(120) NOT NULL,
	`customer_phone` varchar(24) NOT NULL,
	`start_at` datetime(3) NOT NULL,
	`end_at` datetime(3) NOT NULL,
	`status` varchar(16) NOT NULL,
	`price_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`notes` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `booking_appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `booking_setup` longtext;--> statement-breakpoint
ALTER TABLE `booking_appointments` ADD CONSTRAINT `booking_appointments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_appointments` ADD CONSTRAINT `booking_appointments_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_appointments_app_start_idx` ON `booking_appointments` (`app_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `booking_appointments_user_idx` ON `booking_appointments` (`app_id`,`user_id`,`start_at`);