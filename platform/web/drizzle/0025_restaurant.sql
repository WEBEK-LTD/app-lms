-- Restaurants and cafés (roadmap 26): a dish's option groups (JSON), and how a restaurant's order is collected (JSON) and where it is in the kitchen. Null for other products and orders.
ALTER TABLE `catalog_orders` ADD `fulfilment` longtext;--> statement-breakpoint
ALTER TABLE `catalog_orders` ADD `fulfilment_status` varchar(24);--> statement-breakpoint
ALTER TABLE `catalog_products` ADD `option_groups` longtext;