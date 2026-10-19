-- The dashboard's bell, "Notifications from Yallapp" (roadmap 57): what each person read in it (update_reads, per user), and on announcements their kind (update, announcement, maintenance, offer), whether they are also a banner, and optional Arabic and Turkish titles and messages.
CREATE TABLE `update_reads` (
	`user_id` varchar(36) NOT NULL,
	`item` varchar(64) NOT NULL,
	`read_at` datetime(3) NOT NULL,
	CONSTRAINT `update_reads_user_id_item_pk` PRIMARY KEY(`user_id`,`item`)
);
--> statement-breakpoint
ALTER TABLE `announcements` ADD `kind` varchar(16) DEFAULT 'announcement' NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `show_as_banner` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `announcements` ADD `title_ar` varchar(120);--> statement-breakpoint
ALTER TABLE `announcements` ADD `body_ar` text;--> statement-breakpoint
ALTER TABLE `announcements` ADD `title_tr` varchar(120);--> statement-breakpoint
ALTER TABLE `announcements` ADD `body_tr` text;--> statement-breakpoint
ALTER TABLE `update_reads` ADD CONSTRAINT `update_reads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `update_reads_item_idx` ON `update_reads` (`item`);