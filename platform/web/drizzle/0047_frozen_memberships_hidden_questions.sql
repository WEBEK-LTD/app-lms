ALTER TABLE `course_answers` ADD `hidden` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `course_questions` ADD `hidden` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `memberships` ADD `frozen_from` datetime(3);--> statement-breakpoint
ALTER TABLE `memberships` ADD `frozen_until` datetime(3);--> statement-breakpoint
CREATE INDEX `course_questions_hidden_idx` ON `course_questions` (`app_id`,`hidden`,`status`,`updated_at`);