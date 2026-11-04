CREATE TABLE `mail_campaigns` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`status` varchar(16) NOT NULL,
	`archived` boolean NOT NULL DEFAULT false,
	`audience` longtext NOT NULL,
	`segment_id` varchar(36),
	`from_name` varchar(120),
	`reply_to` varchar(191),
	`contents` longtext NOT NULL,
	`default_lang` varchar(4) NOT NULL,
	`track` boolean NOT NULL DEFAULT true,
	`per_minute` int NOT NULL DEFAULT 60,
	`scheduled_at` datetime(3),
	`time_zone` varchar(64),
	`recipients` int NOT NULL DEFAULT 0,
	`created_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`started_at` datetime(3),
	`finished_at` datetime(3),
	CONSTRAINT `mail_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mail_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`email` varchar(191) NOT NULL,
	`kind` varchar(12) NOT NULL,
	`url` varchar(1024),
	`at` datetime(3) NOT NULL,
	CONSTRAINT `mail_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mail_recipients` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`campaign_id` varchar(36) NOT NULL,
	`email` varchar(191) NOT NULL,
	`user_id` varchar(36),
	`client_id` varchar(36),
	`name` varchar(120) NOT NULL,
	`lang` varchar(4) NOT NULL,
	`status` varchar(12) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`error` varchar(300),
	`next_attempt_at` datetime(3),
	`claim` varchar(36),
	`lease_until` datetime(3),
	`sent_at` datetime(3),
	`team` boolean NOT NULL DEFAULT false,
	CONSTRAINT `mail_recipients_id` PRIMARY KEY(`id`),
	CONSTRAINT `mail_recipients_campaign_email_unique` UNIQUE(`campaign_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `mail_segments` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`audience` longtext NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `mail_segments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mail_suppressions` (
	`email` varchar(191) NOT NULL,
	`reason` varchar(16) NOT NULL,
	`campaign_id` varchar(36),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `mail_suppressions_email` PRIMARY KEY(`email`)
);
--> statement-breakpoint
CREATE TABLE `mail_templates` (
	`id` varchar(36) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(40) NOT NULL,
	`contents` longtext NOT NULL,
	`created_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `mail_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mail_events` ADD CONSTRAINT `mail_events_campaign_id_mail_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `mail_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mail_recipients` ADD CONSTRAINT `mail_recipients_campaign_id_mail_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `mail_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mail_campaigns_status_idx` ON `mail_campaigns` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `mail_events_campaign_idx` ON `mail_events` (`campaign_id`,`kind`);--> statement-breakpoint
CREATE INDEX `mail_recipients_queue_idx` ON `mail_recipients` (`campaign_id`,`status`,`id`);--> statement-breakpoint
CREATE INDEX `mail_recipients_sent_idx` ON `mail_recipients` (`campaign_id`,`sent_at`);--> statement-breakpoint
CREATE INDEX `mail_recipients_claim_idx` ON `mail_recipients` (`claim`);