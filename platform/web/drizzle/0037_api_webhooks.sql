-- Account deletion reaches the client's API (roadmap 49, 34.8): the signed notices (account.deleted) sent to apps' own APIs, with their tries; kept 30 days.
CREATE TABLE `api_webhooks` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`event` varchar(32) NOT NULL,
	`subject` varchar(64) NOT NULL,
	`status` varchar(10) NOT NULL,
	`attempts` int NOT NULL,
	`next_attempt_at` datetime(3),
	`last_attempt_at` datetime(3),
	`last_status` int,
	`last_error` varchar(200),
	`created_at` datetime(3) NOT NULL,
	`delivered_at` datetime(3),
	CONSTRAINT `api_webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `api_webhooks` ADD CONSTRAINT `api_webhooks_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `api_webhooks_due_idx` ON `api_webhooks` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `api_webhooks_app_idx` ON `api_webhooks` (`app_id`,`created_at`);