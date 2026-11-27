CREATE TABLE `community_media` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`owner_id` varchar(36) NOT NULL,
	`kind` varchar(8) NOT NULL,
	`url` varchar(512) NOT NULL,
	`poster_url` varchar(512),
	`content_type` varchar(40) NOT NULL,
	`size` int NOT NULL,
	`used_by` varchar(60),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_post_comments` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`target_type` varchar(10) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`parent_id` varchar(36),
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`status` varchar(10) NOT NULL,
	`like_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_post_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`author_id` varchar(36) NOT NULL,
	`group_id` varchar(36),
	`body` text NOT NULL,
	`media_ids` longtext NOT NULL,
	`link` longtext,
	`status` varchar(10) NOT NULL,
	`like_count` int NOT NULL DEFAULT 0,
	`comment_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_reactions` (
	`member_id` varchar(36) NOT NULL,
	`kind` varchar(6) NOT NULL,
	`target_type` varchar(10) NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_reactions_member_id_kind_target_type_target_id_pk` PRIMARY KEY(`member_id`,`kind`,`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `community_showcase` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`author_id` varchar(36) NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`media_ids` longtext NOT NULL,
	`app_type` varchar(30) NOT NULL,
	`app_store_url` varchar(500),
	`play_store_url` varchar(500),
	`web_url` varchar(500),
	`yallapp_app_id` varchar(36),
	`verified` boolean NOT NULL DEFAULT false,
	`status` varchar(10) NOT NULL,
	`like_count` int NOT NULL DEFAULT 0,
	`comment_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `community_showcase_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_stories` (
	`id` varchar(36) NOT NULL,
	`tenant_id` varchar(36) NOT NULL DEFAULT 'yallapp',
	`author_id` varchar(36) NOT NULL,
	`media_id` varchar(36) NOT NULL,
	`status` varchar(10) NOT NULL,
	`view_count` int NOT NULL DEFAULT 0,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `community_stories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_story_views` (
	`story_id` varchar(36) NOT NULL,
	`viewer_id` varchar(36) NOT NULL,
	`viewed_at` datetime(3) NOT NULL,
	CONSTRAINT `community_story_views_story_id_viewer_id_pk` PRIMARY KEY(`story_id`,`viewer_id`)
);
--> statement-breakpoint
ALTER TABLE `community_media` ADD CONSTRAINT `community_media_owner_id_community_members_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_post_comments` ADD CONSTRAINT `community_post_comments_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_posts` ADD CONSTRAINT `community_posts_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_reactions` ADD CONSTRAINT `community_reactions_member_id_community_members_id_fk` FOREIGN KEY (`member_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_showcase` ADD CONSTRAINT `community_showcase_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_stories` ADD CONSTRAINT `community_stories_author_id_community_members_id_fk` FOREIGN KEY (`author_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_story_views` ADD CONSTRAINT `community_story_views_story_id_community_stories_id_fk` FOREIGN KEY (`story_id`) REFERENCES `community_stories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `community_story_views` ADD CONSTRAINT `community_story_views_viewer_id_community_members_id_fk` FOREIGN KEY (`viewer_id`) REFERENCES `community_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `community_media_owner` ON `community_media` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_post_comments_target` ON `community_post_comments` (`target_type`,`target_id`,`parent_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_post_comments_parent` ON `community_post_comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `community_posts_feed` ON `community_posts` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_posts_author` ON `community_posts` (`author_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_posts_group` ON `community_posts` (`group_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_reactions_saved` ON `community_reactions` (`member_id`,`kind`,`target_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_showcase_gallery` ON `community_showcase` (`tenant_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `community_showcase_author` ON `community_showcase` (`author_id`);--> statement-breakpoint
CREATE INDEX `community_stories_author` ON `community_stories` (`tenant_id`,`author_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `community_story_views_viewer` ON `community_story_views` (`viewer_id`);