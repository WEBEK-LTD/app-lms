-- Yallapp sign-in for apps on their own API (roadmap 34): the ES256 keys that sign each app's access tokens. The private key is encrypted and dropped when a newer key replaces it; the public key stays published a day longer.
CREATE TABLE `app_auth_keys` (
	`kid` varchar(64) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`alg` varchar(10) NOT NULL,
	`public_jwk` longtext NOT NULL,
	`private_key_encrypted` text,
	`created_at` datetime(3) NOT NULL,
	`retired_at` datetime(3),
	CONSTRAINT `app_auth_keys_kid` PRIMARY KEY(`kid`)
);
--> statement-breakpoint
ALTER TABLE `app_auth_keys` ADD CONSTRAINT `app_auth_keys_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `app_auth_keys_app_idx` ON `app_auth_keys` (`app_id`,`created_at`);