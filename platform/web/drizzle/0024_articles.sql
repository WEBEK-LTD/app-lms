-- News & blog apps (roadmap 23): articles written in the dashboard, their categories and how they show in the app; a breaking-news notification opens its article.
CREATE TABLE `article_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`name` varchar(60) NOT NULL,
	`position` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `article_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`title` varchar(200) NOT NULL,
	`excerpt` varchar(400),
	`body` mediumtext NOT NULL,
	`image_asset_id` varchar(36),
	`author` varchar(80),
	`category_ids` longtext NOT NULL,
	`featured` boolean NOT NULL,
	`status` varchar(16) NOT NULL,
	`published_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news_settings` (
	`app_id` varchar(36) NOT NULL,
	`settings` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `news_settings_app_id` PRIMARY KEY(`app_id`)
);
--> statement-breakpoint
ALTER TABLE `hosted_notifications` ADD `article_id` varchar(64);--> statement-breakpoint
ALTER TABLE `article_categories` ADD CONSTRAINT `article_categories_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `articles` ADD CONSTRAINT `articles_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `news_settings` ADD CONSTRAINT `news_settings_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `article_categories_app_idx` ON `article_categories` (`app_id`,`position`);--> statement-breakpoint
CREATE INDEX `articles_app_idx` ON `articles` (`app_id`,`status`,`published_at`);