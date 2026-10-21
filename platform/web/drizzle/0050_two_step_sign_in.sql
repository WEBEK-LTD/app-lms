CREATE TABLE `user_recovery_codes` (
	`user_id` varchar(36) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `user_recovery_codes_user_id_code_hash_pk` PRIMARY KEY(`user_id`,`code_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id_hash` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `user_sessions_id_hash` PRIMARY KEY(`id_hash`)
);
--> statement-breakpoint
CREATE TABLE `user_two_factor` (
	`user_id` varchar(36) NOT NULL,
	`secret_encrypted` varchar(255) NOT NULL,
	`enabled_at` datetime(3),
	`last_step` bigint unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `user_two_factor_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `user_recovery_codes` ADD CONSTRAINT `user_recovery_codes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_two_factor` ADD CONSTRAINT `user_two_factor_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_sessions_user_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_sessions_expires_idx` ON `user_sessions` (`expires_at`);