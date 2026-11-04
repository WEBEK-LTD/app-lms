CREATE TABLE `mail_runs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3) NOT NULL,
	`sent` int NOT NULL,
	`failed` int NOT NULL,
	`attempted` int NOT NULL,
	CONSTRAINT `mail_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mail_runs` ADD CONSTRAINT `mail_runs_campaign_id_mail_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `mail_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mail_runs_campaign_idx` ON `mail_runs` (`campaign_id`,`started_at`);