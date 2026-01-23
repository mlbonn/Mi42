CREATE TABLE `scout_settings` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`minRevenueMio` int DEFAULT 100,
	`minEmployees` int DEFAULT 500,
	`companyTypes` json DEFAULT ('["Manufacturer"]'),
	`targetMarkets` json DEFAULT ('["DE","US","UK","FR","IT","ES","NL","BE","AT","CH","PL","SE","DK","NO","FI"]'),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scout_settings_id` PRIMARY KEY(`id`)
);
