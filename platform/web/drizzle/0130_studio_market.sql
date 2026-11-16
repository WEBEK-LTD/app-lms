CREATE TABLE `studio_market_applications` (
	`id` varchar(36) NOT NULL,
	`licence_id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`version_id` varchar(36) NOT NULL,
	`previous_key` varchar(191) NOT NULL,
	`replaced_id` varchar(36),
	`applied_at` datetime(3) NOT NULL,
	`ended_at` datetime(3),
	`end_reason` varchar(16),
	`applied_by` varchar(191),
	CONSTRAINT `studio_market_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_designers` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`name` varchar(60) NOT NULL,
	`slug` varchar(60) NOT NULL,
	`country` varchar(2) NOT NULL,
	`bio` varchar(400),
	`status` varchar(16) NOT NULL,
	`terms_accepted_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_designers_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_designers_client_idx` UNIQUE(`client_id`),
	CONSTRAINT `studio_market_designers_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_licences` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`plan` varchar(8) NOT NULL,
	`status` varchar(16) NOT NULL,
	`app_id` varchar(36),
	`version_id` varchar(36),
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3),
	`moved_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_licences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_reviews` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`version_id` varchar(36),
	`decision` varchar(24) NOT NULL,
	`notes` text,
	`team_note` text,
	`checks` longtext NOT NULL,
	`reviewer_email` varchar(191) NOT NULL,
	`reviewer_name` varchar(120),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_templates` (
	`id` varchar(36) NOT NULL,
	`designer_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`source_app_id` varchar(36),
	`slug` varchar(80) NOT NULL,
	`status` varchar(24) NOT NULL,
	`texts` longtext NOT NULL,
	`kinds` longtext NOT NULL,
	`tags` longtext NOT NULL,
	`free` boolean NOT NULL DEFAULT true,
	`plans` longtext NOT NULL,
	`after_end` varchar(8) NOT NULL,
	`screens` longtext NOT NULL,
	`rights_confirmed_at` datetime(3),
	`note_to_team` varchar(1000),
	`current_version_id` varchar(36),
	`review_version_id` varchar(36),
	`submitted_at` datetime(3),
	`published_at` datetime(3),
	`views` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `studio_market_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_templates_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `studio_market_versions` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`number` int NOT NULL,
	`blob_key` varchar(191) NOT NULL,
	`size_bytes` int NOT NULL,
	`pages` int NOT NULL,
	`elements` int NOT NULL,
	`languages` longtext NOT NULL,
	`cover` longtext,
	`created_at` datetime(3) NOT NULL,
	`created_by` varchar(191),
	CONSTRAINT `studio_market_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_versions_number_idx` UNIQUE(`template_id`,`number`)
);
--> statement-breakpoint
ALTER TABLE `studio_market_applications` ADD CONSTRAINT `studio_market_applications_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_applications` ADD CONSTRAINT `studio_market_applications_licence_fk` FOREIGN KEY (`licence_id`) REFERENCES `studio_market_licences`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD CONSTRAINT `studio_market_designers_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD CONSTRAINT `studio_market_licences_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD CONSTRAINT `studio_market_licences_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_licences` ADD CONSTRAINT `studio_market_licences_template_fk` FOREIGN KEY (`template_id`) REFERENCES `studio_market_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_reviews` ADD CONSTRAINT `studio_market_reviews_template_fk` FOREIGN KEY (`template_id`) REFERENCES `studio_market_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_templates` ADD CONSTRAINT `studio_market_templates_source_app_id_apps_id_fk` FOREIGN KEY (`source_app_id`) REFERENCES `apps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_templates` ADD CONSTRAINT `studio_market_templates_designer_fk` FOREIGN KEY (`designer_id`) REFERENCES `studio_market_designers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_versions` ADD CONSTRAINT `studio_market_versions_template_fk` FOREIGN KEY (`template_id`) REFERENCES `studio_market_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_market_applications_app_idx` ON `studio_market_applications` (`app_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `studio_market_applications_licence_idx` ON `studio_market_applications` (`licence_id`,`applied_at`);--> statement-breakpoint
CREATE INDEX `studio_market_licences_client_idx` ON `studio_market_licences` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_licences_template_idx` ON `studio_market_licences` (`template_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_licences_app_idx` ON `studio_market_licences` (`app_id`);--> statement-breakpoint
CREATE INDEX `studio_market_reviews_template_idx` ON `studio_market_reviews` (`template_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_templates_designer_idx` ON `studio_market_templates` (`designer_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `studio_market_templates_status_idx` ON `studio_market_templates` (`status`,`submitted_at`);