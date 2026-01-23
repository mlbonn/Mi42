CREATE TABLE `email_drafts` (
	`id` varchar(64) NOT NULL,
	`campaignId` varchar(64),
	`contactId` varchar(64),
	`corporationId` varchar(64),
	`subject` varchar(500),
	`body` text,
	`language` varchar(10),
	`personalizationData` json,
	`reviewStatus` enum('pending','approved','rejected','sent') NOT NULL DEFAULT 'pending',
	`reviewedBy` varchar(64),
	`reviewedAt` timestamp,
	`sentAt` timestamp,
	`sentBy` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `email_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hunter_jobs` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`priority` int DEFAULT 5,
	`targetRoles` json,
	`targetCount` int DEFAULT 5,
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	`error` text,
	CONSTRAINT `hunter_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hunter_results` (
	`id` varchar(64) NOT NULL,
	`jobId` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`firstName` varchar(255),
	`lastName` varchar(255),
	`fullName` varchar(255),
	`title` varchar(255),
	`seniority` varchar(100),
	`department` varchar(100),
	`email` varchar(320),
	`emailStatus` enum('valid','invalid','risky','unknown') DEFAULT 'unknown',
	`emailScore` int,
	`phoneNumber` varchar(50),
	`linkedinUrl` varchar(500),
	`companyName` varchar(255),
	`companyDomain` varchar(255),
	`dataSource` varchar(100),
	`confidence` int,
	`lastVerified` timestamp,
	`reviewStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` varchar(64),
	`reviewedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `hunter_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_campaigns` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
	`targetSegment` varchar(100),
	`language` varchar(10),
	`createdBy` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `outreach_campaigns_id` PRIMARY KEY(`id`)
);
