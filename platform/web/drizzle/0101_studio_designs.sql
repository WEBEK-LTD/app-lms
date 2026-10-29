CREATE TABLE `studio_designs` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`source` varchar(16) NOT NULL,
	`pages` int NOT NULL,
	`blob_key` varchar(191) NOT NULL,
	`size_bytes` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`created_by` varchar(191),
	CONSTRAINT `studio_designs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `studio_designs` ADD CONSTRAINT `studio_designs_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_designs_client_idx` ON `studio_designs` (`client_id`,`created_at`);