CREATE TABLE `store_products` (
	`id` varchar(36) NOT NULL,
	`app_id` varchar(36) NOT NULL,
	`product_id` varchar(100) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`course_id` int,
	`plan_id` varchar(64),
	`title` varchar(200) NOT NULL,
	`period` varchar(8),
	`course_ids` longtext NOT NULL,
	`currency` varchar(3) NOT NULL,
	`site_price` varchar(20) NOT NULL,
	`own_price` varchar(20),
	`active` boolean NOT NULL,
	`google` longtext,
	`apple` longtext,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `store_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_products_app_product_idx` UNIQUE(`app_id`,`product_id`)
);
--> statement-breakpoint
ALTER TABLE `apps` ADD `store_billing` longtext;--> statement-breakpoint
ALTER TABLE `store_products` ADD CONSTRAINT `store_products_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;