-- We publish for you (roadmap 14.1): who publishes each app, the publishing requests with their checklist and store statuses, and the history of status changes.
CREATE TABLE `publishing_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`store` varchar(8) NOT NULL,
	`status` varchar(16) NOT NULL,
	`note` text,
	`actor_email` varchar(191) NOT NULL,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `publishing_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publishing_requests` (
	`app_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`mode` varchar(8) NOT NULL,
	`firebase_by` varchar(8) NOT NULL,
	`checklist` longtext NOT NULL,
	`listing` longtext NOT NULL,
	`android_status` varchar(16) NOT NULL,
	`android_note` text,
	`android_store_url` varchar(2048),
	`android_updated_at` datetime(3),
	`ios_status` varchar(16) NOT NULL,
	`ios_note` text,
	`ios_store_url` varchar(2048),
	`ios_updated_at` datetime(3),
	`team_notes` text,
	`requested_at` datetime(3),
	`ready_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `publishing_requests_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `publishing_mode` varchar(8);--> statement-breakpoint
ALTER TABLE `publishing_events` ADD CONSTRAINT `publishing_events_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `publishing_requests` ADD CONSTRAINT `publishing_requests_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `publishing_requests` ADD CONSTRAINT `publishing_requests_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `publishing_events_app_idx` ON `publishing_events` (`app_id`,`at`);--> statement-breakpoint
CREATE INDEX `publishing_requests_queue_idx` ON `publishing_requests` (`mode`,`requested_at`);