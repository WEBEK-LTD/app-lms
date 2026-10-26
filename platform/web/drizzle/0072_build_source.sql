ALTER TABLE `builds` ADD `source_ref` varchar(40);--> statement-breakpoint
ALTER TABLE `builds` ADD `source_commit` varchar(40);--> statement-breakpoint
ALTER TABLE `builds` ADD `rebuild_of` int;