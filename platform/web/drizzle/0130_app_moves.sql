CREATE TABLE `app_move_requests` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`from_client_id` varchar(36) NOT NULL,
	`to_client_id` varchar(36) NOT NULL,
	`move_data` boolean NOT NULL,
	`move_subscription` boolean NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`status` varchar(12) NOT NULL,
	`open_app_id` varchar(36),
	`requested_by` varchar(36) NOT NULL,
	`requested_by_email` varchar(191) NOT NULL,
	`requested_by_name` varchar(120) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`closed_at` datetime(3),
	`closed_by` varchar(191),
	`result_app_id` varchar(36),
	`note` varchar(255),
	CONSTRAINT `app_move_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_move_requests_open_unique` UNIQUE(`open_app_id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `moved_at` datetime(3);--> statement-breakpoint
ALTER TABLE `apps` ADD `moved_to_client_id` varchar(36);--> statement-breakpoint
ALTER TABLE `app_move_requests` ADD CONSTRAINT `app_move_requests_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_move_requests` ADD CONSTRAINT `app_move_requests_from_client_id_clients_id_fk` FOREIGN KEY (`from_client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_move_requests` ADD CONSTRAINT `app_move_requests_to_client_id_clients_id_fk` FOREIGN KEY (`to_client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_move_requests_from_idx` ON `app_move_requests` (`from_client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `app_move_requests_to_idx` ON `app_move_requests` (`to_client_id`,`created_at`);