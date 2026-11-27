ALTER TABLE `community_members` DROP INDEX `community_members_email_unique`;--> statement-breakpoint
ALTER TABLE `community_members` DROP INDEX `community_members_username_unique`;--> statement-breakpoint
ALTER TABLE `community_members` DROP INDEX `community_members_yallapp_unique`;--> statement-breakpoint
ALTER TABLE `community_questions` DROP INDEX `community_questions_slug_unique`;--> statement-breakpoint
ALTER TABLE `community_sections` DROP INDEX `community_sections_slug_unique`;--> statement-breakpoint
ALTER TABLE `community_tags` DROP INDEX `community_tags_slug_unique`;--> statement-breakpoint
ALTER TABLE `community_tutorials` DROP INDEX `community_tutorials_slug_unique`;--> statement-breakpoint
DROP INDEX `community_audit_created` ON `community_audit_log`;--> statement-breakpoint
DROP INDEX `community_members_points` ON `community_members`;--> statement-breakpoint
DROP INDEX `community_moderation_status` ON `community_moderation_items`;--> statement-breakpoint
DROP INDEX `community_reports_status` ON `community_reports`;--> statement-breakpoint
DROP INDEX `community_verification_status` ON `community_verification_requests`;--> statement-breakpoint
ALTER TABLE `community_identities` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `community_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `community_audit_log` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_identities` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_members` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_moderation_items` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_questions` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_reports` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_sections` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_settings` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_tags` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_tutorials` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_verification_requests` ADD `tenant_id` varchar(64) DEFAULT 'yallapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `community_identities` ADD PRIMARY KEY(`tenant_id`,`provider`,`subject`);--> statement-breakpoint
ALTER TABLE `community_settings` ADD PRIMARY KEY(`tenant_id`,`key`);--> statement-breakpoint
ALTER TABLE `community_members` ADD CONSTRAINT `community_members_email_unique` UNIQUE(`tenant_id`,`email`);--> statement-breakpoint
ALTER TABLE `community_members` ADD CONSTRAINT `community_members_username_unique` UNIQUE(`tenant_id`,`username`);--> statement-breakpoint
ALTER TABLE `community_members` ADD CONSTRAINT `community_members_yallapp_unique` UNIQUE(`tenant_id`,`yallapp_user_id`);--> statement-breakpoint
ALTER TABLE `community_questions` ADD CONSTRAINT `community_questions_slug_unique` UNIQUE(`tenant_id`,`slug`);--> statement-breakpoint
ALTER TABLE `community_sections` ADD CONSTRAINT `community_sections_slug_unique` UNIQUE(`tenant_id`,`kind`,`slug`);--> statement-breakpoint
ALTER TABLE `community_tags` ADD CONSTRAINT `community_tags_slug_unique` UNIQUE(`tenant_id`,`slug`);--> statement-breakpoint
ALTER TABLE `community_tutorials` ADD CONSTRAINT `community_tutorials_slug_unique` UNIQUE(`tenant_id`,`slug`);--> statement-breakpoint
CREATE INDEX `community_audit_created` ON `community_audit_log` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_members_points` ON `community_members` (`tenant_id`,`points`);--> statement-breakpoint
CREATE INDEX `community_moderation_status` ON `community_moderation_items` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_reports_status` ON `community_reports` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_verification_status` ON `community_verification_requests` (`tenant_id`,`status`,`created_at`);