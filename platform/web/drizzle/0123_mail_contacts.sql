CREATE TABLE `mail_contacts` (
	`id` varchar(36) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`company` varchar(160),
	`lang` varchar(4) NOT NULL,
	`country` varchar(2),
	`tags` longtext NOT NULL,
	`source` varchar(12) NOT NULL,
	`source_note` varchar(200),
	`added_by` varchar(191) NOT NULL,
	`added_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`unsubscribed_at` datetime(3),
	CONSTRAINT `mail_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `mail_contacts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `mail_recipients` ADD `contact_id` varchar(36);--> statement-breakpoint
CREATE INDEX `mail_contacts_added_idx` ON `mail_contacts` (`added_at`);