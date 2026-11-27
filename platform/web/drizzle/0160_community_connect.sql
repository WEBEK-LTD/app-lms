CREATE TABLE `community_conversation_members` (
	`conversation_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`joined_at` datetime(3) NOT NULL,
	`left_at` datetime(3),
	`hidden_at` datetime(3),
	`last_read_message_id` varchar(36),
	`last_read_at` datetime(3),
	`muted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `community_conversation_members_conversation_id_member_id_pk` PRIMARY KEY(`conversation_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `community_conversations` (
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`title` varchar(80),
	`created_by` varchar(36) NOT NULL,
	`direct_key` varchar(80),
	`hire_request_id` varchar(36),
	`last_message_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_conversations_direct` UNIQUE(`tenant_id`,`direct_key`)
);
--> statement-breakpoint
CREATE TABLE `community_group_members` (
	`group_id` varchar(36) NOT NULL,
	`member_id` varchar(36) NOT NULL,
	`role` varchar(10) NOT NULL,
	`status` varchar(10) NOT NULL,
	`joined_at` datetime(3) NOT NULL,
	CONSTRAINT `community_group_members_group_id_member_id_pk` PRIMARY KEY(`group_id`,`member_id`)
);
--> statement-breakpoint
CREATE TABLE `community_groups` (
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`id` varchar(36) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`visibility` varchar(8) NOT NULL,
	`cover_url` varchar(512),
	`owner_id` varchar(36) NOT NULL,
	`status` varchar(8) NOT NULL,
	`member_count` int NOT NULL DEFAULT 1,
	`post_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`last_active_at` datetime(3) NOT NULL,
	CONSTRAINT `community_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_groups_slug` UNIQUE(`tenant_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `community_hire_requests` (
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`pro_id` varchar(36) NOT NULL,
	`service` varchar(120),
	`message` text NOT NULL,
	`status` varchar(10) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_hire_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_job_applications` (
	`id` varchar(36) NOT NULL,
	`job_id` varchar(36) NOT NULL,
	`applicant_id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`links` longtext NOT NULL,
	`status` varchar(12) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_job_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_job_applications_once` UNIQUE(`job_id`,`applicant_id`)
);
--> statement-breakpoint
CREATE TABLE `community_jobs` (
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`id` varchar(36) NOT NULL,
	`poster_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`type` varchar(12) NOT NULL,
	`remote` boolean NOT NULL DEFAULT true,
	`location` varchar(120) NOT NULL DEFAULT '',
	`skills` longtext NOT NULL,
	`budget` varchar(80) NOT NULL DEFAULT '',
	`status` varchar(8) NOT NULL,
	`application_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`photos` longtext NOT NULL,
	`reply_to_id` varchar(36),
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_pro_reviews` (
	`request_id` varchar(36) NOT NULL,
	`pro_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`rating` int NOT NULL,
	`text` text NOT NULL,
	`status` varchar(10) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_pro_reviews_request_id` PRIMARY KEY(`request_id`)
);
--> statement-breakpoint
CREATE TABLE `community_pros` (
	`tenant_id` varchar(64) NOT NULL DEFAULT 'yallapp',
	`member_id` varchar(36) NOT NULL,
	`headline` varchar(120) NOT NULL,
	`about` text NOT NULL,
	`services` longtext NOT NULL,
	`skills` longtext NOT NULL,
	`availability` varchar(12) NOT NULL,
	`showcase_ids` longtext NOT NULL,
	`open` boolean NOT NULL DEFAULT true,
	`rating_sum` int NOT NULL DEFAULT 0,
	`review_count` int NOT NULL DEFAULT 0,
	`done_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_pros_member_id` PRIMARY KEY(`member_id`)
);
--> statement-breakpoint
ALTER TABLE `community_conversation_members` ADD CONSTRAINT `community_conversation_members_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_conversation_members` ADD CONSTRAINT `community_conversation_members_conversation_fk` FOREIGN KEY (`conversation_id`) REFERENCES `community_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_group_members` ADD CONSTRAINT `community_group_members_group_id_community_groups_id_fk` FOREIGN KEY (`group_id`) REFERENCES `community_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_group_members` ADD CONSTRAINT `community_group_members_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_groups` ADD CONSTRAINT `community_groups_owner_id_community_members_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_hire_requests` ADD CONSTRAINT `community_hire_requests_client_id_community_members_id_fk` FOREIGN KEY (`client_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_hire_requests` ADD CONSTRAINT `community_hire_requests_pro_id_community_members_id_fk` FOREIGN KEY (`pro_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_job_applications` ADD CONSTRAINT `community_job_applications_job_id_community_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `community_jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_job_applications` ADD CONSTRAINT `community_job_applications_applicant_id_community_members_id_fk` FOREIGN KEY (`applicant_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_jobs` ADD CONSTRAINT `community_jobs_poster_id_community_members_id_fk` FOREIGN KEY (`poster_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_messages` ADD CONSTRAINT `community_messages_conversation_id_community_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `community_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_messages` ADD CONSTRAINT `community_messages_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_pro_reviews` ADD CONSTRAINT `community_pro_reviews_request_id_community_hire_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `community_hire_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_pro_reviews` ADD CONSTRAINT `community_pro_reviews_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_pros` ADD CONSTRAINT `community_pros_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_conversation_members_member` ON `community_conversation_members` (`member_id`);--> statement-breakpoint
CREATE INDEX `community_group_members_member` ON `community_group_members` (`member_id`,`status`);--> statement-breakpoint
CREATE INDEX `community_groups_active` ON `community_groups` (`tenant_id`,`status`,`last_active_at`);--> statement-breakpoint
CREATE INDEX `community_hire_requests_client` ON `community_hire_requests` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_hire_requests_pro` ON `community_hire_requests` (`pro_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_job_applications_applicant` ON `community_job_applications` (`applicant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_jobs_open` ON `community_jobs` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_jobs_poster` ON `community_jobs` (`poster_id`);--> statement-breakpoint
CREATE INDEX `community_messages_time` ON `community_messages` (`conversation_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `community_pro_reviews_pro` ON `community_pro_reviews` (`pro_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_pros_open` ON `community_pros` (`tenant_id`,`open`,`updated_at`);