-- 184.5 The masked phone call: the owner's own Twilio account on contact_settings (the SIDs, the secret sealed with the platform's key and bound to the app, the number, the last test, phone calls paused after a failure; 184.6 the TURN choice) and each call's log (contact_calls: no recording, no numbers).
CREATE TABLE `contact_calls` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`shipment_id` bigint unsigned NOT NULL,
	`courier_id` bigint unsigned NOT NULL,
	`kind` varchar(8) NOT NULL,
	`caller` varchar(8) NOT NULL,
	`status` varchar(16) NOT NULL,
	`provider_sid` varchar(64),
	`problem` varchar(32),
	`duration_seconds` int,
	`created_at` datetime(3) NOT NULL,
	`answered_at` datetime(3),
	`ended_at` datetime(3),
	CONSTRAINT `contact_calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `turn` varchar(8) DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `twilio_account_sid` varchar(34);--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `twilio_key_sid` varchar(34);--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `twilio_secret_encrypted` text;--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `twilio_number` varchar(24);--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `twilio_check` longtext;--> statement-breakpoint
ALTER TABLE `contact_settings` ADD `phone_paused_at` datetime(3);--> statement-breakpoint
ALTER TABLE `contact_calls` ADD CONSTRAINT `contact_calls_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_calls` ADD CONSTRAINT `contact_calls_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contact_calls_thread_idx` ON `contact_calls` (`app_id`,`shipment_id`,`id`);--> statement-breakpoint
CREATE INDEX `contact_calls_sid_idx` ON `contact_calls` (`provider_sid`);