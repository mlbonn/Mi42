CREATE TABLE `api_keys` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`openaiKey` text,
	`apolloKey` text,
	`linkedinKey` text,
	`hunterKey` text,
	`zerobounceKey` text,
	`smtpHost` varchar(255),
	`smtpPort` varchar(10),
	`smtpUser` varchar(255),
	`smtpPassword` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
