-- Yallapp sets up notifications (roadmap 136): the platform's own OpenID Connect issuer keys (Workload Identity Federation with Google, no JSON key), Yallapp's pool of Firebase projects (added by the team or created by the platform, step by step), each app's apps registered in one of them, and the app's choice (push_setup null: the client's own Firebase, as before).
CREATE TABLE `app_firebase_apps` (
	`app_id` varchar(36) NOT NULL,
	`variant` varchar(10) NOT NULL,
	`platform` varchar(8) NOT NULL,
	`firebase_project_id` varchar(64) NOT NULL,
	`identifier` varchar(160) NOT NULL,
	`firebase_app_id` varchar(100),
	`operation` varchar(255),
	`status` varchar(10) NOT NULL,
	`error` varchar(500),
	`apns_configured_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `app_firebase_apps_app_id_variant_platform_pk` PRIMARY KEY(`app_id`,`variant`,`platform`)
);
--> statement-breakpoint
CREATE TABLE `firebase_projects` (
	`project_id` varchar(64) NOT NULL,
	`project_number` varchar(24) NOT NULL,
	`api_key_id` varchar(64) NOT NULL,
	`max_apps` int NOT NULL DEFAULT 28,
	`status` varchar(8) NOT NULL,
	`created_by` varchar(8) NOT NULL DEFAULT 'team',
	`creation` longtext,
	`checked_at` datetime(3),
	`check_problem` varchar(500),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `firebase_projects_project_id` PRIMARY KEY(`project_id`)
);
--> statement-breakpoint
CREATE TABLE `platform_signing_keys` (
	`kid` varchar(64) NOT NULL,
	`purpose` varchar(16) NOT NULL,
	`alg` varchar(10) NOT NULL,
	`public_jwk` longtext NOT NULL,
	`private_key_encrypted` text,
	`created_at` datetime(3) NOT NULL,
	`retired_at` datetime(3),
	CONSTRAINT `platform_signing_keys_kid` PRIMARY KEY(`kid`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `push_setup` varchar(8);--> statement-breakpoint
ALTER TABLE `apps` ADD `firebase_project_id` varchar(64);--> statement-breakpoint
ALTER TABLE `app_firebase_apps` ADD CONSTRAINT `app_firebase_apps_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_firebase_apps_project_idx` ON `app_firebase_apps` (`firebase_project_id`);--> statement-breakpoint
CREATE INDEX `app_firebase_apps_status_idx` ON `app_firebase_apps` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `platform_signing_keys_purpose_idx` ON `platform_signing_keys` (`purpose`,`created_at`);