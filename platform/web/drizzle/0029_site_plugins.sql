-- What the WordPress site runs beside its LMS (roadmap 30): its shop plugin and its booking plugin, "" for none, null when the plugin did not report them.
ALTER TABLE `license_activations` ADD `store` varchar(64);--> statement-breakpoint
ALTER TABLE `license_activations` ADD `bookings` varchar(64);