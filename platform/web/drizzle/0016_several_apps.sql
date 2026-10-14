-- Several apps per account (roadmap 12.1). Each new index is created before the unique one it replaces is dropped: MariaDB and MySQL refuse to drop the only index a foreign key uses.
CREATE INDEX `apps_client_idx` ON `apps` (`client_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `apps` DROP INDEX `apps_client_unique`;--> statement-breakpoint
CREATE INDEX `builds_client_idx` ON `builds` (`client_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `builds` ADD CONSTRAINT `builds_app_number_unique` UNIQUE(`app_id`,`number`);--> statement-breakpoint
ALTER TABLE `builds` DROP INDEX `builds_client_number_unique`;--> statement-breakpoint
CREATE INDEX `licenses_client_idx` ON `licenses` (`client_id`);--> statement-breakpoint
ALTER TABLE `licenses` DROP INDEX `licenses_client_unique`;--> statement-breakpoint
ALTER TABLE `licenses` ADD `app_id` varchar(36);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `app_id` varchar(36);--> statement-breakpoint
-- Until now an account had at most one app: its license and plan payments belong to it. Accounts without an app keep app_id null until their first app takes them.
UPDATE `licenses` `l` JOIN (SELECT `client_id`, MIN(`id`) AS `app_id` FROM `apps` GROUP BY `client_id` HAVING COUNT(*) = 1) `a` ON `a`.`client_id` = `l`.`client_id` SET `l`.`app_id` = `a`.`app_id` WHERE `l`.`app_id` IS NULL;--> statement-breakpoint
UPDATE `plan_payments` `p` JOIN (SELECT `client_id`, MIN(`id`) AS `app_id` FROM `apps` GROUP BY `client_id` HAVING COUNT(*) = 1) `a` ON `a`.`client_id` = `p`.`client_id` SET `p`.`app_id` = `a`.`app_id` WHERE `p`.`app_id` IS NULL;--> statement-breakpoint
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_app_unique` UNIQUE(`app_id`);--> statement-breakpoint
CREATE INDEX `plan_payments_app_idx` ON `plan_payments` (`app_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `licenses` ADD CONSTRAINT `licenses_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_payments` ADD CONSTRAINT `plan_payments_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE set null ON UPDATE no action;
