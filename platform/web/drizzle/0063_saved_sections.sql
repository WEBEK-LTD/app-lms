CREATE TABLE `saved_sections` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`name` varchar(60) NOT NULL,
	`blocks` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`created_by` varchar(191),
	CONSTRAINT `saved_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `saved_sections` ADD CONSTRAINT `saved_sections_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `saved_sections_client_idx` ON `saved_sections` (`client_id`,`created_at`);