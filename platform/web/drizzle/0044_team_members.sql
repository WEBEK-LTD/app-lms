CREATE TABLE `team_activity` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`app_id` varchar(36),
	`actor_id` varchar(36),
	`actor_name` varchar(120) NOT NULL,
	`actor_email` varchar(191) NOT NULL,
	`action` varchar(48) NOT NULL,
	`target_type` varchar(32) NOT NULL,
	`target_id` varchar(64),
	`summary` varchar(500) NOT NULL,
	`at` datetime(3) NOT NULL,
	CONSTRAINT `team_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_invitations` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`email` varchar(191) NOT NULL,
	`name` varchar(120) NOT NULL,
	`role` varchar(16) NOT NULL,
	`areas` longtext NOT NULL,
	`app_ids` longtext,
	`token_hash` varchar(64) NOT NULL,
	`lang` varchar(8) NOT NULL,
	`invited_by` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`accepted_at` datetime(3),
	`cancelled_at` datetime(3),
	`sent_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `team_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_invitations_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`client_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` varchar(16) NOT NULL,
	`areas` longtext NOT NULL,
	`app_ids` longtext,
	`added_by` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `team_members_client_id_user_id_pk` PRIMARY KEY(`client_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `team_activity` ADD CONSTRAINT `team_activity_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_activity` ADD CONSTRAINT `team_activity_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_invitations` ADD CONSTRAINT `team_invitations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_members` ADD CONSTRAINT `team_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `team_activity_client_idx` ON `team_activity` (`client_id`,`at`);--> statement-breakpoint
CREATE INDEX `team_activity_actor_idx` ON `team_activity` (`actor_id`);--> statement-breakpoint
CREATE INDEX `team_invitations_client_idx` ON `team_invitations` (`client_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `team_members` (`user_id`);