-- Demo apps people can try (roadmap 16): which apps are demos (set only by the admin's Demo apps page) and the build whose APK /demo offers. Existing apps are not demos.
ALTER TABLE `apps` ADD `demo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD `demo_build_id` varchar(36);