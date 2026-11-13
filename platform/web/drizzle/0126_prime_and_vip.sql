CREATE TABLE `account_manager_calls` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`manager_id` varchar(36) NOT NULL,
	`requested_by` varchar(36),
	`requester_name` varchar(120) NOT NULL,
	`date` varchar(10) NOT NULL,
	`time` varchar(5) NOT NULL,
	`note` text,
	`status` varchar(16) NOT NULL,
	`slot` varchar(64),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `account_manager_calls_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_manager_calls_slot_unique` UNIQUE(`slot`)
);
--> statement-breakpoint
CREATE TABLE `prime_alerts` (
	`user_id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`alerts` longtext NOT NULL,
	`brief_on` boolean NOT NULL,
	`brief_time` varchar(5) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `prime_alerts_user_id_app_id_pk` PRIMARY KEY(`user_id`,`app_id`)
);
--> statement-breakpoint
CREATE TABLE `prime_sends` (
	`send_key` varchar(191) NOT NULL,
	`sent_at` datetime(3) NOT NULL,
	CONSTRAINT `prime_sends_send_key` PRIMARY KEY(`send_key`)
);
--> statement-breakpoint
CREATE TABLE `staff_profiles` (
	`user_id` varchar(36) NOT NULL,
	`photo` varchar(64),
	`whatsapp` varchar(32),
	`phone` varchar(32),
	`hours` longtext,
	`account_manager` boolean NOT NULL DEFAULT false,
	`updated_by` varchar(191) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `staff_profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `account_manager_id` varchar(36);--> statement-breakpoint
ALTER TABLE `account_manager_calls` ADD CONSTRAINT `account_manager_calls_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_manager_calls` ADD CONSTRAINT `account_manager_calls_manager_id_users_id_fk` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_manager_calls` ADD CONSTRAINT `account_manager_calls_requested_by_users_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prime_alerts` ADD CONSTRAINT `prime_alerts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prime_alerts` ADD CONSTRAINT `prime_alerts_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prime_alerts` ADD CONSTRAINT `prime_alerts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_profiles` ADD CONSTRAINT `staff_profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_manager_calls_client_idx` ON `account_manager_calls` (`client_id`,`date`);--> statement-breakpoint
CREATE INDEX `account_manager_calls_manager_idx` ON `account_manager_calls` (`manager_id`,`date`);--> statement-breakpoint
CREATE INDEX `prime_alerts_app_idx` ON `prime_alerts` (`app_id`);--> statement-breakpoint
CREATE INDEX `prime_sends_at_idx` ON `prime_sends` (`sent_at`);--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_account_manager_id_users_id_fk` FOREIGN KEY (`account_manager_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;