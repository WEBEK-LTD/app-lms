-- Yallapp's prices in pounds and dollars (roadmap 52): the account's country (the currency its prices show in) and, on plan payments charged in pounds, the dollar price the client saw.
ALTER TABLE `clients` ADD `country` varchar(2);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `shown_cents` bigint unsigned;--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `shown_currency` varchar(3);