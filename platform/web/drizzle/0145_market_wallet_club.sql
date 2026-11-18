ALTER TABLE `market_club_members` ADD `paid_total` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `market_club_members` ADD `periods` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `market_club_members` ADD `last_paid_at` datetime(3);--> statement-breakpoint
ALTER TABLE `market_coupons` ADD `members_only` boolean DEFAULT false NOT NULL;