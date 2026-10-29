ALTER TABLE `article_categories` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_categories` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_services` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `school_announcements` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `teachers` ADD `sample` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicle_types` ADD `sample` boolean DEFAULT false NOT NULL;