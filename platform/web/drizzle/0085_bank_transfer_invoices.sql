ALTER TABLE `plan_payments` ADD `method` varchar(16);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `bank_reference` varchar(100);--> statement-breakpoint
ALTER TABLE `plan_payments` ADD `recorded_by` varchar(191);