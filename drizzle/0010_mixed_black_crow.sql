CREATE TABLE `hunter_queue` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`searchType` varchar(50) DEFAULT 'apollo',
	`searchData` json,
	`priority` int DEFAULT 5,
	`status` varchar(50) DEFAULT 'Pending',
	`scheduledAt` timestamp DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`contactsFound` int DEFAULT 0,
	`errorMessage` text,
	`metadata` json,
	CONSTRAINT `hunter_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `hunter_corporation_idx` ON `hunter_queue` (`corporationId`);--> statement-breakpoint
CREATE INDEX `hunter_status_idx` ON `hunter_queue` (`status`);--> statement-breakpoint
CREATE INDEX `hunter_priority_idx` ON `hunter_queue` (`priority`);