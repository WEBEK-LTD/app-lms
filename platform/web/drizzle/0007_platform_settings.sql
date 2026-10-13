CREATE TABLE `platform_settings` (
	`setting_key` varchar(32) NOT NULL,
	`value` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`updated_by` varchar(191) NOT NULL,
	CONSTRAINT `platform_settings_setting_key` PRIMARY KEY(`setting_key`)
);
