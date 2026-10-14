-- Gyms and fitness (roadmap 27): classes made from the weekly timetable (one row per class, its spots counted in booked_count and never above capacity), customers' spots in them, and memberships (unlimited or with credits, for a period or a pack).
CREATE TABLE `class_bookings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`session_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`membership_id` bigint unsigned,
	`customer_name` varchar(120) NOT NULL,
	`customer_phone` varchar(24),
	`customer_email` varchar(191),
	`status` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `class_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_bookings_session_user_unique` UNIQUE(`session_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `class_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`template_id` int,
	`service_id` int NOT NULL,
	`staff_id` int NOT NULL,
	`service_name` varchar(120) NOT NULL,
	`staff_name` varchar(120) NOT NULL,
	`start_at` datetime(3) NOT NULL,
	`end_at` datetime(3) NOT NULL,
	`capacity` int NOT NULL,
	`booked_count` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `class_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_sessions_template_start_unique` UNIQUE(`app_id`,`template_id`,`start_at`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`plan_id` int NOT NULL,
	`plan_name` varchar(120) NOT NULL,
	`period` varchar(16) NOT NULL,
	`credits_left` int,
	`status` varchar(16) NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3),
	`order_id` bigint unsigned,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberships_order_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
ALTER TABLE `class_bookings` ADD CONSTRAINT `class_bookings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_bookings` ADD CONSTRAINT `class_bookings_session_id_class_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `class_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_bookings` ADD CONSTRAINT `class_bookings_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_sessions` ADD CONSTRAINT `class_sessions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `class_bookings_user_idx` ON `class_bookings` (`app_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `class_sessions_app_start_idx` ON `class_sessions` (`app_id`,`start_at`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `memberships` (`app_id`,`user_id`);