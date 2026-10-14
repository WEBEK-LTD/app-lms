-- Sign-in for every app (roadmap 18): people who sign in by email have no phone number, and email sign-ins are checked with a code like phone ones. Existing users and codes keep their numbers.
ALTER TABLE `hosted_challenges` MODIFY COLUMN `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `hosted_users` MODIFY COLUMN `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `hosted_challenges` ADD `email` varchar(191);--> statement-breakpoint
CREATE INDEX `hosted_users_email_idx` ON `hosted_users` (`app_id`,`email`);