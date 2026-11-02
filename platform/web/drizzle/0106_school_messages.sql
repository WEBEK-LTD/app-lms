ALTER TABLE `chat_conversations` ADD `school_teacher_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `school_person_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `teacher_wrote_at` datetime(3);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `closed_at` datetime(3);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD `closed_by` varchar(120);--> statement-breakpoint
ALTER TABLE `school_people` ADD `department` varchar(60);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_school_unique` UNIQUE(`app_id`,`school_teacher_id`,`school_person_id`);--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_school_teacher_id_school_people_id_fk` FOREIGN KEY (`school_teacher_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_school_person_id_school_people_id_fk` FOREIGN KEY (`school_person_id`) REFERENCES `school_people`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chat_conversations_school_person_idx` ON `chat_conversations` (`app_id`,`school_person_id`);