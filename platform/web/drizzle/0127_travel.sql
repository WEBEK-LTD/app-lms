CREATE TABLE `travel_alerts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_bookings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned,
	`reference` varchar(16) NOT NULL,
	`status` varchar(20) NOT NULL,
	`hotel_id` bigint unsigned,
	`room_id` bigint unsigned,
	`check_in` varchar(10),
	`check_out` varchar(10),
	`out_flight_id` bigint unsigned,
	`in_flight_id` bigint unsigned,
	`hold_until` datetime(3),
	`sample` boolean NOT NULL DEFAULT false,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `travel_bookings_reference_idx` UNIQUE(`app_id`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `travel_flights` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`departs` varchar(16) NOT NULL,
	`active` boolean NOT NULL,
	`sample` boolean NOT NULL DEFAULT false,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_flights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_hotels` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`active` boolean NOT NULL,
	`sample` boolean NOT NULL DEFAULT false,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_hotels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_reviews` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`hotel_id` bigint unsigned NOT NULL,
	`booking_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned,
	`hidden` boolean NOT NULL DEFAULT false,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `travel_reviews_booking_idx` UNIQUE(`app_id`,`booking_id`)
);
--> statement-breakpoint
CREATE TABLE `travel_rooms` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`hotel_id` bigint unsigned NOT NULL,
	`position` int NOT NULL,
	`active` boolean NOT NULL,
	`sample` boolean NOT NULL DEFAULT false,
	`data` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travel_saved` (
	`app_id` varchar(36) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`hotel_id` bigint unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_saved_app_id_user_id_hotel_id_pk` PRIMARY KEY(`app_id`,`user_id`,`hotel_id`)
);
--> statement-breakpoint
CREATE TABLE `travel_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `travel_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
ALTER TABLE `travel_alerts` ADD CONSTRAINT `travel_alerts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_alerts` ADD CONSTRAINT `travel_alerts_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_bookings` ADD CONSTRAINT `travel_bookings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_bookings` ADD CONSTRAINT `travel_bookings_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_flights` ADD CONSTRAINT `travel_flights_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_hotels` ADD CONSTRAINT `travel_hotels_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_reviews` ADD CONSTRAINT `travel_reviews_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_reviews` ADD CONSTRAINT `travel_reviews_hotel_id_travel_hotels_id_fk` FOREIGN KEY (`hotel_id`) REFERENCES `travel_hotels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_reviews` ADD CONSTRAINT `travel_reviews_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_rooms` ADD CONSTRAINT `travel_rooms_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_rooms` ADD CONSTRAINT `travel_rooms_hotel_id_travel_hotels_id_fk` FOREIGN KEY (`hotel_id`) REFERENCES `travel_hotels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_saved` ADD CONSTRAINT `travel_saved_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_saved` ADD CONSTRAINT `travel_saved_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_saved` ADD CONSTRAINT `travel_saved_hotel_id_travel_hotels_id_fk` FOREIGN KEY (`hotel_id`) REFERENCES `travel_hotels`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `travel_settings` ADD CONSTRAINT `travel_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `travel_alerts_user_idx` ON `travel_alerts` (`app_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `travel_bookings_user_idx` ON `travel_bookings` (`app_id`,`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `travel_bookings_room_idx` ON `travel_bookings` (`app_id`,`room_id`,`check_in`);--> statement-breakpoint
CREATE INDEX `travel_bookings_out_idx` ON `travel_bookings` (`app_id`,`out_flight_id`);--> statement-breakpoint
CREATE INDEX `travel_bookings_in_idx` ON `travel_bookings` (`app_id`,`in_flight_id`);--> statement-breakpoint
CREATE INDEX `travel_flights_app_idx` ON `travel_flights` (`app_id`,`departs`);--> statement-breakpoint
CREATE INDEX `travel_hotels_app_idx` ON `travel_hotels` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `travel_reviews_hotel_idx` ON `travel_reviews` (`app_id`,`hotel_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `travel_rooms_hotel_idx` ON `travel_rooms` (`app_id`,`hotel_id`,`position`);