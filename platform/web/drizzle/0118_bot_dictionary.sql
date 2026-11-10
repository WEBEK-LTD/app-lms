CREATE TABLE IF NOT EXISTS `bot_phrases` (
	`id` varchar(36) NOT NULL,
	`intent` varchar(40) NOT NULL,
	`lang` varchar(12) NOT NULL,
	`text` varchar(80) NOT NULL,
	`normalized` varchar(160) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`created_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `bot_phrases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bot_unmatched` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`step` varchar(12) NOT NULL,
	`text` varchar(200) NOT NULL,
	`normalized` varchar(200) NOT NULL,
	`dash_lang` varchar(2) NOT NULL,
	`dialect` varchar(12),
	`chosen_intent` varchar(40),
	`status` varchar(8) NOT NULL,
	`mapped_intent` varchar(40),
	`created_at` datetime(3) NOT NULL,
	`resolved_at` datetime(3),
	`resolved_by` varchar(191),
	CONSTRAINT `bot_unmatched_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `bot_phrases_intent_idx` ON `bot_phrases` (`intent`);--> statement-breakpoint
CREATE INDEX `bot_unmatched_open_idx` ON `bot_unmatched` (`status`,`step`,`normalized`);--> statement-breakpoint
CREATE INDEX `bot_unmatched_created_idx` ON `bot_unmatched` (`created_at`);