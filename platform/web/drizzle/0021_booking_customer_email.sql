-- Bookings by people who sign in by email (roadmap 19): their email is kept in its own column, and the phone is empty. Appointments booked so far with an email in the phone column move it over.
ALTER TABLE `booking_appointments` MODIFY COLUMN `customer_phone` varchar(24);--> statement-breakpoint
ALTER TABLE `booking_appointments` ADD `customer_email` varchar(191);--> statement-breakpoint
UPDATE `booking_appointments` SET `customer_email` = `customer_phone`, `customer_phone` = NULL WHERE `customer_phone` LIKE '%@%';
