CREATE TABLE `client_milestones` (
	`client_id` varchar(36) NOT NULL,
	`kind` varchar(24) NOT NULL,
	`ref` varchar(36) NOT NULL,
	`app_id` varchar(36),
	`at` datetime(3) NOT NULL,
	`source` longtext,
	CONSTRAINT `client_milestones_client_id_kind_ref_pk` PRIMARY KEY(`client_id`,`kind`,`ref`)
);
--> statement-breakpoint
ALTER TABLE `client_milestones` ADD CONSTRAINT `client_milestones_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_milestones_kind_at_idx` ON `client_milestones` (`kind`,`at`);