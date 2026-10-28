CREATE TABLE `studio_templates` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`name` varchar(60) NOT NULL,
	`page` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`created_by` varchar(191),
	CONSTRAINT `studio_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `studio_templates` ADD CONSTRAINT `studio_templates_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_templates_client_idx` ON `studio_templates` (`client_id`,`created_at`);