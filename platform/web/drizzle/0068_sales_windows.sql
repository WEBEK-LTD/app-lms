CREATE INDEX `booking_appointments_app_created_idx` ON `booking_appointments` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `course_enrollments_app_enrolled_idx` ON `course_enrollments` (`app_id`,`enrolled_at`);--> statement-breakpoint
CREATE INDEX `payment_refunds_app_created_idx` ON `payment_refunds` (`app_id`,`created_at`);