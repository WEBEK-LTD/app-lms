CREATE TABLE `plan_payments` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`plan` varchar(16) NOT NULL,
	`months` int NOT NULL,
	`amount_cents` bigint unsigned NOT NULL,
	`currency` varchar(3) NOT NULL,
	`status` varchar(16) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`payment_id` varchar(64),
	`created_at` datetime(3) NOT NULL,
	`paid_at` datetime(3),
	CONSTRAINT `plan_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_payments_token_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `plan_payments` ADD CONSTRAINT `plan_payments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `plan_payments_client_idx` ON `plan_payments` (`client_id`,`created_at`);