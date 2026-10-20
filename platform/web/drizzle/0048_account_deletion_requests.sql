CREATE TABLE `account_deletion_requests` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`open_client_id` varchar(36),
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`lang` varchar(8) NOT NULL,
	`reason` text,
	`status` varchar(16) NOT NULL,
	`requested_at` datetime(3) NOT NULL,
	`closed_at` datetime(3),
	`closed_by` varchar(191),
	`team_note` text,
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `account_deletion_requests_open_unique` UNIQUE(`open_client_id`)
);
--> statement-breakpoint
CREATE INDEX `account_deletion_requests_status_idx` ON `account_deletion_requests` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `account_deletion_requests_client_idx` ON `account_deletion_requests` (`client_id`,`requested_at`);