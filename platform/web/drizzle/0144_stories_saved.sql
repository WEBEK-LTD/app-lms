-- 165 When the owner last saved the app's stories in Dashboard › Stories (not the copy from Studio): until then the story elements follow the Studio design.
ALTER TABLE `apps` ADD `stories_saved_at` datetime(3);
