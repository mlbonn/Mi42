CREATE TABLE `activities` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64),
	`companyId` varchar(64),
	`contactId` varchar(64),
	`activityType` varchar(50),
	`activityDate` timestamp DEFAULT (now()),
	`subject` varchar(255),
	`content` text,
	`direction` varchar(20),
	`outcome` varchar(50),
	`emailMessageId` varchar(255),
	`createdBy` varchar(100),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`dealId` varchar(64) NOT NULL,
	`commissionPercent` decimal(5,2),
	`commissionAmount` decimal(10,2),
	`paid` boolean DEFAULT false,
	`paidDate` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`legalForm` varchar(50),
	`country` varchar(2),
	`city` varchar(100),
	`address` text,
	`revenueEur` bigint,
	`products` text,
	`website` varchar(255),
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_company_relations` (
	`id` varchar(64) NOT NULL,
	`contactId` varchar(64) NOT NULL,
	`companyId` varchar(64) NOT NULL,
	`email` varchar(255),
	`position` varchar(255),
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `contact_company_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_emails` (
	`id` varchar(64) NOT NULL,
	`contactId` varchar(64) NOT NULL,
	`email` varchar(255) NOT NULL,
	`emailType` varchar(50) DEFAULT 'work',
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `contact_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` varchar(64) NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`jobTitle` varchar(255),
	`linkedinUrl` varchar(255),
	`phone` varchar(50),
	`mobile` varchar(50),
	`decisionMaker` boolean DEFAULT false,
	`contactStatus` varchar(50) DEFAULT 'Cold',
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corporations` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`headquartersCountry` varchar(2),
	`totalRevenueEur` bigint,
	`industry` varchar(100),
	`website` varchar(255),
	`linkedinUrl` varchar(255),
	`status` varchar(50) DEFAULT 'Target',
	`priority` varchar(20) DEFAULT 'Medium',
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `corporations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`companyId` varchar(64),
	`dealName` varchar(255),
	`dealValueEur` decimal(10,2),
	`stage` varchar(50) DEFAULT 'Cold',
	`probability` int DEFAULT 0,
	`expectedCloseDate` timestamp,
	`actualCloseDate` timestamp,
	`subscriptionTier` varchar(50),
	`createdBy` varchar(64),
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_deals` (
	`id` varchar(64) NOT NULL,
	`partnerId` varchar(64) NOT NULL,
	`dealId` varchar(64) NOT NULL,
	`revenueShareAmount` decimal(10,2),
	`paid` boolean DEFAULT false,
	`paidDate` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `partner_deals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` varchar(64) NOT NULL,
	`partnerName` varchar(255) NOT NULL,
	`partnerType` varchar(50),
	`revenueSharePercent` decimal(5,2),
	`totalRevenueGenerated` decimal(10,2) DEFAULT '0',
	`contactPerson` varchar(255),
	`contactEmail` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_usage` (
	`id` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`userEmail` varchar(255),
	`lastLogin` timestamp,
	`totalLogins` int DEFAULT 0,
	`countriesAccessed` text,
	`excelAddonUsed` boolean DEFAULT false,
	`apiCallsLastMonth` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_account_assignments` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`corporationId` varchar(64) NOT NULL,
	`assignedAt` timestamp DEFAULT (now()),
	`assignedBy` varchar(64),
	CONSTRAINT `user_account_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','sales_manager','external_sales','partner','user') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `status` varchar(50) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `partnerId` varchar(64);--> statement-breakpoint
CREATE INDEX `activities_corporation_idx` ON `activities` (`corporationId`);--> statement-breakpoint
CREATE INDEX `activities_contact_idx` ON `activities` (`contactId`);--> statement-breakpoint
CREATE INDEX `activities_date_idx` ON `activities` (`activityDate`);--> statement-breakpoint
CREATE INDEX `commissions_user_idx` ON `commissions` (`userId`);--> statement-breakpoint
CREATE INDEX `commissions_deal_idx` ON `commissions` (`dealId`);--> statement-breakpoint
CREATE INDEX `companies_corporation_idx` ON `companies` (`corporationId`);--> statement-breakpoint
CREATE INDEX `companies_name_idx` ON `companies` (`name`);--> statement-breakpoint
CREATE INDEX `ccr_contact_idx` ON `contact_company_relations` (`contactId`);--> statement-breakpoint
CREATE INDEX `ccr_company_idx` ON `contact_company_relations` (`companyId`);--> statement-breakpoint
CREATE INDEX `contact_emails_contact_idx` ON `contact_emails` (`contactId`);--> statement-breakpoint
CREATE INDEX `contact_emails_email_idx` ON `contact_emails` (`email`);--> statement-breakpoint
CREATE INDEX `contacts_name_idx` ON `contacts` (`lastName`,`firstName`);--> statement-breakpoint
CREATE INDEX `corporations_name_idx` ON `corporations` (`name`);--> statement-breakpoint
CREATE INDEX `corporations_status_idx` ON `corporations` (`status`);--> statement-breakpoint
CREATE INDEX `deals_corporation_idx` ON `deals` (`corporationId`);--> statement-breakpoint
CREATE INDEX `deals_stage_idx` ON `deals` (`stage`);--> statement-breakpoint
CREATE INDEX `deals_created_by_idx` ON `deals` (`createdBy`);--> statement-breakpoint
CREATE INDEX `partner_deals_partner_idx` ON `partner_deals` (`partnerId`);--> statement-breakpoint
CREATE INDEX `partner_deals_deal_idx` ON `partner_deals` (`dealId`);--> statement-breakpoint
CREATE INDEX `product_usage_corporation_idx` ON `product_usage` (`corporationId`);--> statement-breakpoint
CREATE INDEX `uaa_user_idx` ON `user_account_assignments` (`userId`);--> statement-breakpoint
CREATE INDEX `uaa_corporation_idx` ON `user_account_assignments` (`corporationId`);