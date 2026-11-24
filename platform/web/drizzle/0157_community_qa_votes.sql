ALTER TABLE `community_point_events` ADD CONSTRAINT `community_point_events_once` UNIQUE(`member_id`,`reason`,`ref`);--> statement-breakpoint
DROP INDEX `community_point_events_member` ON `community_point_events`;
