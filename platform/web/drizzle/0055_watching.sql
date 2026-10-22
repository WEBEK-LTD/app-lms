CREATE TABLE `job_runs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`job` varchar(16) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	`ok` boolean,
	`summary` text,
	`error` varchar(500),
	CONSTRAINT `job_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_alerts` (
	`id` varchar(36) NOT NULL,
	`kind` varchar(24) NOT NULL,
	`key` varchar(120) NOT NULL,
	`title` varchar(200) NOT NULL,
	`detail` text NOT NULL,
	`link` varchar(300),
	`count` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`resolved_at` datetime(3),
	`resolved_by` varchar(254),
	`emailed_at` datetime(3),
	`open_key` varchar(120),
	CONSTRAINT `team_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_alerts_open_key_unique` UNIQUE(`open_key`)
);
--> statement-breakpoint
CREATE INDEX `job_runs_job_started_idx` ON `job_runs` (`job`,`started_at`);--> statement-breakpoint
CREATE INDEX `team_alerts_resolved_idx` ON `team_alerts` (`resolved_at`,`last_seen_at`);