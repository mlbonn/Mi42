CREATE TABLE `scout_discovery_methods` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`enabled` boolean DEFAULT true,
	`priority` int DEFAULT 5,
	`config` json,
	`lastRunAt` timestamp,
	`successCount` int DEFAULT 0,
	`failureCount` int DEFAULT 0,
	CONSTRAINT `scout_discovery_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scout_queue` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64),
	`seedType` varchar(50),
	`seedData` json,
	`priority` int DEFAULT 5,
	`status` varchar(50) DEFAULT 'Pending',
	`generation` int DEFAULT 0,
	`parentId` varchar(64),
	`discoveryMethod` varchar(100),
	`scheduledAt` timestamp DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`errorMessage` text,
	`metadata` json,
	CONSTRAINT `scout_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `corporations` ADD `products` text;--> statement-breakpoint
ALTER TABLE `corporations` ADD `targetMarkets` text;--> statement-breakpoint
ALTER TABLE `corporations` ADD `countries` text;--> statement-breakpoint
ALTER TABLE `corporations` ADD `referenceCustomers` text;--> statement-breakpoint
ALTER TABLE `corporations` ADD `employeeCount` int;--> statement-breakpoint
ALTER TABLE `corporations` ADD `international` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `corporations` ADD `profileAnalyzedAt` timestamp;--> statement-breakpoint
ALTER TABLE `corporations` ADD `scoutStatus` varchar(50) DEFAULT 'Not Analyzed';--> statement-breakpoint
ALTER TABLE `corporations` ADD `scoutGeneration` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `corporations` ADD `scoutParentId` varchar(64);--> statement-breakpoint
ALTER TABLE `corporations` ADD `discoveryMethod` varchar(100);--> statement-breakpoint
ALTER TABLE `corporations` ADD `discoveredAt` timestamp;--> statement-breakpoint
CREATE INDEX `method_name_unique` ON `scout_discovery_methods` (`name`);--> statement-breakpoint
CREATE INDEX `queue_status_idx` ON `scout_queue` (`status`);--> statement-breakpoint
CREATE INDEX `queue_priority_idx` ON `scout_queue` (`priority`);--> statement-breakpoint
CREATE INDEX `queue_generation_idx` ON `scout_queue` (`generation`);--> statement-breakpoint
CREATE INDEX `queue_parent_idx` ON `scout_queue` (`parentId`);--> statement-breakpoint
CREATE INDEX `corp_generation_idx` ON `corporations` (`scoutGeneration`);--> statement-breakpoint
CREATE INDEX `corp_parent_idx` ON `corporations` (`scoutParentId`);