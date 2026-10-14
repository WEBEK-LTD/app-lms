CREATE TABLE `admin_audit_log` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`at` datetime(3) NOT NULL,
	`actor_id` varchar(36),
	`actor_email` varchar(191) NOT NULL,
	`action` varchar(64) NOT NULL,
	`target_type` varchar(32) NOT NULL,
	`target_id` varchar(64),
	`client_id` varchar(36),
	`summary` varchar(500) NOT NULL,
	`changes` longtext,
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_members` (
	`user_id` varchar(36) NOT NULL,
	`role` varchar(16) NOT NULL,
	`added_by` varchar(191) NOT NULL,
	`added_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `admin_members_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `admin_members` ADD CONSTRAINT `admin_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_audit_log_at_idx` ON `admin_audit_log` (`at`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_actor_idx` ON `admin_audit_log` (`actor_email`,`at`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_action_idx` ON `admin_audit_log` (`action`,`at`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_target_idx` ON `admin_audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `admin_audit_log_client_idx` ON `admin_audit_log` (`client_id`,`at`);