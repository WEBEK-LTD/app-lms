CREATE TABLE `hosted_user_passwords` (
	`user_id` bigint unsigned NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `hosted_user_passwords_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `hosted_users` ADD `username` varchar(40);--> statement-breakpoint
ALTER TABLE `hosted_users` ADD CONSTRAINT `hosted_users_username_unique` UNIQUE(`app_id`,`username`);--> statement-breakpoint
ALTER TABLE `hosted_user_passwords` ADD CONSTRAINT `hosted_user_passwords_user_id_hosted_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `hosted_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hosted_user_passwords` ADD CONSTRAINT `hosted_user_passwords_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;