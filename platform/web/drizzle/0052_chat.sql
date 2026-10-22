CREATE TABLE `chat_blocks` (
	`member_id` varchar(36) NOT NULL,
	`blocked_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_blocks_member_id_blocked_id_pk` PRIMARY KEY(`member_id`,`blocked_id`)
);
--> statement-breakpoint
CREATE TABLE `chat_conversations` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`member_id` varchar(36),
	`course_key` varchar(60),
	`title` varchar(200),
	`image_url` varchar(500),
	`last_message_id` bigint unsigned,
	`last_message_at` datetime(3),
	`business_read_id` bigint unsigned,
	`keep_until` datetime(3),
	`notice_for` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_conversations_direct_unique` UNIQUE(`app_id`,`member_id`),
	CONSTRAINT `chat_conversations_group_unique` UNIQUE(`app_id`,`course_key`)
);
--> statement-breakpoint
CREATE TABLE `chat_members` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`source` varchar(12) NOT NULL,
	`external_id` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	`image_url` varchar(500),
	`blocked_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_members_person_unique` UNIQUE(`app_id`,`source`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`sender_kind` varchar(8) NOT NULL,
	`member_id` varchar(36),
	`team_user_id` varchar(36),
	`team_name` varchar(120),
	`client_id` varchar(64),
	`text` text,
	`media_id` varchar(36),
	`duration_seconds` int,
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_messages_client_unique` UNIQUE(`conversation_id`,`client_id`)
);
--> statement-breakpoint
CREATE TABLE `chat_participants` (
	`conversation_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`read_id` bigint unsigned,
	`joined_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_participants_conversation_id_member_id_pk` PRIMARY KEY(`conversation_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `chat_reports` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`message_id` bigint unsigned NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`reporter_id` varchar(36) NOT NULL,
	`reason` varchar(16) NOT NULL,
	`note` varchar(500),
	`status` varchar(8) NOT NULL,
	`outcome` varchar(12),
	`closed_by` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`closed_at` datetime(3),
	CONSTRAINT `chat_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_reports_once_unique` UNIQUE(`message_id`,`reporter_id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`token_hash` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_sessions_token_hash` PRIMARY KEY(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `chat_uploads` (
	`media_id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`duration_seconds` int,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `chat_uploads_media_id` PRIMARY KEY(`media_id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `chat_settings` longtext;--> statement-breakpoint
ALTER TABLE `media_files` ADD `source` varchar(8) DEFAULT 'library' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_blocks` ADD CONSTRAINT `chat_blocks_member_id_chat_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_blocks` ADD CONSTRAINT `chat_blocks_blocked_id_chat_members_id_fk` FOREIGN KEY (`blocked_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_member_id_chat_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_members` ADD CONSTRAINT `chat_members_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_conversation_id_chat_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_member_id_chat_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_conversation_id_chat_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `chat_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_member_id_chat_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_reports` ADD CONSTRAINT `chat_reports_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_reports` ADD CONSTRAINT `chat_reports_message_id_chat_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `chat_messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_reports` ADD CONSTRAINT `chat_reports_reporter_id_chat_members_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_sessions` ADD CONSTRAINT `chat_sessions_member_id_chat_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_uploads` ADD CONSTRAINT `chat_uploads_media_id_media_files_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media_files`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_uploads` ADD CONSTRAINT `chat_uploads_member_id_chat_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `chat_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chat_conversations_recent_idx` ON `chat_conversations` (`app_id`,`last_message_at`);--> statement-breakpoint
CREATE INDEX `chat_messages_conversation_idx` ON `chat_messages` (`conversation_id`,`id`);--> statement-breakpoint
CREATE INDEX `chat_messages_created_idx` ON `chat_messages` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_messages_media_idx` ON `chat_messages` (`media_id`);--> statement-breakpoint
CREATE INDEX `chat_participants_member_idx` ON `chat_participants` (`member_id`);--> statement-breakpoint
CREATE INDEX `chat_reports_app_idx` ON `chat_reports` (`app_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `chat_sessions_expiry_idx` ON `chat_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `chat_uploads_member_idx` ON `chat_uploads` (`member_id`);