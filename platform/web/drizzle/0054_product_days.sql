CREATE TABLE `product_days` (
	`day` varchar(10) NOT NULL,
	`snapshot` longtext NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `product_days_day` PRIMARY KEY(`day`)
);
