-- Xiaomi GetApps (roadmap 42): the developer account email, the automatic publishing API private key (encrypted), Xiaomi's public certificate and the release notes sent with each update.
ALTER TABLE `apps` ADD `xiaomi_user_name` varchar(254);--> statement-breakpoint
ALTER TABLE `apps` ADD `xiaomi_password_encrypted` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `xiaomi_certificate` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `xiaomi_release_notes` varchar(500);