ALTER TABLE `apps` ADD `integrations_checked_at` datetime(3);--> statement-breakpoint
CREATE INDEX `apps_integrations_checked_idx` ON `apps` (`integrations_checked_at`);