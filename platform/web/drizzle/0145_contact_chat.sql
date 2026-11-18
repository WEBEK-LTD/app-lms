-- 184 A customer and their order's courier reach each other: each courier job's chat (contact_messages, the courier who had the job kept with each message; contact_reads, how far each side read) and the owner's switches per app (contact_settings; no row: chat on, calls off).
CREATE TABLE `contact_messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`shipment_id` bigint unsigned NOT NULL,
	`courier_id` bigint unsigned NOT NULL,
	`sender` varchar(8) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`body` varchar(1000),
	`quick` varchar(32),
	`lat` double,
	`lng` double,
	`client_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_messages_client_unique` UNIQUE(`app_id`,`shipment_id`,`sender`,`client_id`)
);
--> statement-breakpoint
CREATE TABLE `contact_reads` (
	`app_id` varchar(36) NOT NULL,
	`shipment_id` bigint unsigned NOT NULL,
	`side` varchar(8) NOT NULL,
	`last_read_id` bigint unsigned NOT NULL,
	`read_at` datetime(3) NOT NULL,
	CONSTRAINT `contact_reads_app_id_shipment_id_side_pk` PRIMARY KEY(`app_id`,`shipment_id`,`side`)
);
--> statement-breakpoint
CREATE TABLE `contact_settings` (
	`app_id` varchar(36) NOT NULL,
	`chat` boolean NOT NULL DEFAULT true,
	`app_call` boolean NOT NULL DEFAULT false,
	`phone_call` boolean NOT NULL DEFAULT false,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `contact_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
ALTER TABLE `contact_messages` ADD CONSTRAINT `contact_messages_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_messages` ADD CONSTRAINT `contact_messages_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_reads` ADD CONSTRAINT `contact_reads_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_reads` ADD CONSTRAINT `contact_reads_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contact_settings` ADD CONSTRAINT `contact_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `contact_messages_thread_idx` ON `contact_messages` (`app_id`,`shipment_id`,`id`);