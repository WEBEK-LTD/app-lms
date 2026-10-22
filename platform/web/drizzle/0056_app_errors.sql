CREATE TABLE `app_errors` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`app_id` varchar(36),
	`app_key` varchar(36) NOT NULL,
	`source` varchar(16) NOT NULL,
	`code` varchar(64) NOT NULL,
	`message` varchar(500) NOT NULL,
	`count` int NOT NULL,
	`first_at` datetime(3) NOT NULL,
	`last_at` datetime(3) NOT NULL,
	CONSTRAINT `app_errors_id` PRIMARY KEY(`id`),
	CONSTRAINT `app_errors_unique` UNIQUE(`client_id`,`app_key`,`source`,`code`)
);
--> statement-breakpoint
ALTER TABLE `app_errors` ADD CONSTRAINT `app_errors_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_errors` ADD CONSTRAINT `app_errors_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_errors_last_idx` ON `app_errors` (`last_at`);