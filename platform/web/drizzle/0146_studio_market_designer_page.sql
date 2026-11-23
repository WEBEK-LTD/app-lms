CREATE TABLE `studio_market_ratings` (
	`id` varchar(36) NOT NULL,
	`template_id` varchar(36) NOT NULL,
	`designer_id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`stars` int NOT NULL,
	`comment` varchar(1000),
	`author_name` varchar(80) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`reply` varchar(1000),
	`replied_at` datetime(3),
	`hidden_at` datetime(3),
	`hidden_by` varchar(191),
	`hidden_reason` varchar(400),
	CONSTRAINT `studio_market_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `studio_market_ratings_once_idx` UNIQUE(`template_id`,`client_id`)
);
--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `photo_asset_id` varchar(36);--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `profile_review` varchar(16) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `profile_note` varchar(1000);--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `profile_reviewed_at` datetime(3);--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `show_country` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `links` longtext DEFAULT ('[]') NOT NULL;--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `show_links` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `page_locked_at` datetime(3);--> statement-breakpoint
ALTER TABLE `studio_market_designers` ADD `page_locked_reason` varchar(400);--> statement-breakpoint
ALTER TABLE `studio_market_ratings` ADD CONSTRAINT `studio_market_ratings_template_fk` FOREIGN KEY (`template_id`) REFERENCES `studio_market_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_ratings` ADD CONSTRAINT `studio_market_ratings_designer_fk` FOREIGN KEY (`designer_id`) REFERENCES `studio_market_designers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `studio_market_ratings` ADD CONSTRAINT `studio_market_ratings_client_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `studio_market_ratings_designer_idx` ON `studio_market_ratings` (`designer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_ratings_template_idx` ON `studio_market_ratings` (`template_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `studio_market_designers_review_idx` ON `studio_market_designers` (`profile_review`,`updated_at`);--> statement-breakpoint
UPDATE `studio_market_designers` SET `profile_review` = 'pending' WHERE `profile_review` = 'none' AND `bio` IS NOT NULL AND `bio` <> '';