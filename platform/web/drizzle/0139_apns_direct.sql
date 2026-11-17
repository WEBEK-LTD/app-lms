-- iPhone notifications straight to Apple (roadmap 136.20): the client's APNs auth key (encrypted), its Key ID and the Apple team's ID.
ALTER TABLE `apps` ADD `apns_key_encrypted` text;--> statement-breakpoint
ALTER TABLE `apps` ADD `apns_key_id` varchar(10);--> statement-breakpoint
ALTER TABLE `apps` ADD `apns_team_id` varchar(10);