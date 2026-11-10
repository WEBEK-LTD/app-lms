CREATE TABLE `demo_visits` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`demo` varchar(20) NOT NULL,
	`country` varchar(2),
	`at` datetime(3) NOT NULL,
	CONSTRAINT `demo_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `live_activity_entries` (
	`id` varchar(36) NOT NULL,
	`first_name` varchar(40) NOT NULL,
	`last_initial` varchar(4),
	`plan` varchar(16) NOT NULL,
	`city` varchar(60),
	`country` varchar(2),
	`agreed_at` datetime(3) NOT NULL,
	`client_id` varchar(36),
	`consent` boolean NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`created_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `live_activity_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_reviews` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`role` varchar(80),
	`city` varchar(60),
	`app_name` varchar(80),
	`plan` varchar(16),
	`client_id` varchar(36),
	`rating` tinyint NOT NULL,
	`lang` varchar(2) NOT NULL,
	`text` text NOT NULL,
	`translations` longtext NOT NULL,
	`photo` varchar(64),
	`source` varchar(16) NOT NULL DEFAULT 'direct',
	`source_url` varchar(500),
	`reviewed_at` datetime(3) NOT NULL,
	`consent` boolean NOT NULL,
	`hidden` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL,
	`created_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `site_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `show_on_site` boolean;--> statement-breakpoint
ALTER TABLE `live_activity_entries` ADD CONSTRAINT `live_activity_entries_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `site_reviews` ADD CONSTRAINT `site_reviews_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `demo_visits_at_idx` ON `demo_visits` (`at`);--> statement-breakpoint
CREATE INDEX `live_activity_entries_agreed_idx` ON `live_activity_entries` (`agreed_at`);--> statement-breakpoint
CREATE INDEX `site_reviews_position_idx` ON `site_reviews` (`position`);