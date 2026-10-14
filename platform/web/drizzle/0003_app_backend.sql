ALTER TABLE `apps` ADD `backend` varchar(20) DEFAULT 'wordpress' NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `api_base_url` varchar(2048);--> statement-breakpoint
ALTER TABLE `apps` ADD `setup_requested_at` datetime(3);--> statement-breakpoint
ALTER TABLE `apps` ADD `setup_note` text;