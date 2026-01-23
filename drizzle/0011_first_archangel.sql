CREATE TABLE `email_responses` (
	`id` varchar(64) NOT NULL,
	`draftId` varchar(64),
	`contactId` varchar(64),
	`subject` varchar(500),
	`body` text,
	`fromEmail` varchar(255),
	`sentiment` enum('positive','negative','neutral','out_of_office'),
	`qualification` enum('hot','warm','cold','not_interested','unqualified'),
	`qualifiedAt` timestamp,
	`isRead` boolean NOT NULL DEFAULT false,
	`receivedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `email_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`subject` varchar(500) NOT NULL,
	`body` text NOT NULL,
	`language` varchar(10) NOT NULL,
	`industry` varchar(100),
	`targetRole` varchar(100),
	`variables` json,
	`usageCount` int DEFAULT 0,
	`openRate` decimal(5,2),
	`responseRate` decimal(5,2),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
