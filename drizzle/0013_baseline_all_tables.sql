CREATE TABLE IF NOT EXISTS `agent_jobs` (
	`id` varchar(64) NOT NULL,
	`type` varchar(100) NOT NULL,
	`entityType` varchar(100),
	`entityId` varchar(64),
	`payload` json,
	`priority` int DEFAULT 5,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`attempts` int DEFAULT 0,
	`maxAttempts` int DEFAULT 3,
	`scheduledAt` timestamp DEFAULT (now()),
	`lockedBy` varchar(100),
	`lockedAt` timestamp,
	`errorMessage` text,
	`createdBy` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `agent_runs` (
	`id` varchar(64) NOT NULL,
	`jobId` varchar(64),
	`agentName` varchar(100) NOT NULL,
	`model` varchar(100),
	`promptVersion` varchar(50),
	`inputJson` json,
	`outputJson` json,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`errorMessage` text,
	`startedAt` timestamp DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `agent_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `agent_suggestions` (
	`id` varchar(64) NOT NULL,
	`agentRunId` varchar(64),
	`entityType` varchar(100),
	`entityId` varchar(64),
	`suggestionType` varchar(100) NOT NULL,
	`suggestionJson` json,
	`confidence` decimal(5,4),
	`status` enum('pending','approved','rejected','applied') NOT NULL DEFAULT 'pending',
	`reviewedBy` varchar(64),
	`reviewedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `agent_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `agent_tool_calls` (
	`id` varchar(64) NOT NULL,
	`runId` varchar(64) NOT NULL,
	`toolName` varchar(100) NOT NULL,
	`argumentsJson` json,
	`resultJson` json,
	`sideEffectLevel` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `agent_tool_calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `archived_email_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`archived_email_id` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`content_type` varchar(100),
	`size_bytes` int,
	`file_path` varchar(500) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `archived_email_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `archived_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email_id` varchar(255) NOT NULL,
	`contact_id` varchar(64) NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`folder` varchar(100) NOT NULL DEFAULT 'INBOX',
	`from_address` varchar(255),
	`from_name` varchar(255),
	`to_address` varchar(255),
	`ccAddress` varchar(500),
	`subject` text,
	`body` text,
	`html_body` text,
	`email_date` timestamp,
	`notes` text,
	`archived_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `archived_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `attachments` (
	`id` varchar(64) NOT NULL,
	`activityId` varchar(64) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`filePath` varchar(500) NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100),
	`uploadedAt` timestamp DEFAULT (now()),
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `contact_distribution_lists` (
	`id` varchar(64) NOT NULL,
	`contactId` varchar(64) NOT NULL,
	`distributionListId` varchar(64) NOT NULL,
	`subscribedAt` timestamp DEFAULT (now()),
	`unsubscribedAt` timestamp,
	`isActive` boolean DEFAULT true,
	`source` varchar(20) DEFAULT 'manual',
	`sourceDetails` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `contact_distribution_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `distribution_lists` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`listType` varchar(50) DEFAULT 'newsletter',
	`isActive` boolean DEFAULT true,
	`createdBy` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `distribution_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_accounts_new` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(64) NOT NULL,
	`email_address` varchar(255) NOT NULL,
	`password_encrypted` text NOT NULL,
	`server_url` varchar(255) NOT NULL DEFAULT 'https://mail.bl2020.com',
	`is_primary` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`use_for_caldav` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_accounts_new_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_accounts` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(64),
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`purpose` varchar(50) NOT NULL,
	`imapHost` varchar(255) NOT NULL,
	`imapPort` int NOT NULL DEFAULT 993,
	`imapUser` varchar(255) NOT NULL,
	`imapPassword` text NOT NULL,
	`imapSsl` boolean DEFAULT true,
	`deleteAfterFetch` boolean DEFAULT true,
	`markAsReadAfterFetch` boolean DEFAULT true,
	`fetchIntervalMinutes` int DEFAULT 5,
	`isActive` boolean DEFAULT true,
	`lastFetchAt` timestamp,
	`lastError` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `email_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_fetch_log` (
	`id` varchar(64) NOT NULL,
	`emailAccountId` varchar(64) NOT NULL,
	`messageId` varchar(255),
	`fromAddress` varchar(255),
	`toAddress` varchar(255),
	`ccAddress` varchar(500),
	`subject` text,
	`processedAt` timestamp DEFAULT (now()),
	`status` varchar(50) DEFAULT 'processed',
	`matchedContactId` varchar(64),
	`matchedCompanyId` varchar(64),
	`activityId` varchar(64),
	`errorMessage` text,
	CONSTRAINT `email_fetch_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_project_links` (
	`id` varchar(64) NOT NULL,
	`emailId` varchar(255) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`taskId` varchar(64),
	`linkedAt` timestamp DEFAULT (now()),
	CONSTRAINT `email_project_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `email_send_queue` (
	`id` varchar(64) NOT NULL,
	`draftId` varchar(64),
	`userId` varchar(64) NOT NULL,
	`toAddress` varchar(255) NOT NULL,
	`subject` varchar(500),
	`body` text,
	`status` enum('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`scheduledAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`errorMessage` text,
	`lockedBy` varchar(128),
	`lockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_send_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `project_budget_plans` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`category` varchar(100),
	`amount` decimal(10,2) NOT NULL,
	`spent` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `project_budget_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `project_timesheets` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`taskId` varchar(64),
	`userId` varchar(64) NOT NULL,
	`hours` decimal(5,2) NOT NULL,
	`cost` decimal(10,2) NOT NULL,
	`date` timestamp NOT NULL,
	`description` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `project_timesheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`userAgent` varchar(512),
	`ipAddress` varchar(64),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tasks` (
	`id` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`ownerUserId` varchar(64),
	`entityType` varchar(100),
	`entityId` varchar(64),
	`priority` int DEFAULT 50,
	`status` enum('open','in_progress','done','cancelled') NOT NULL DEFAULT 'open',
	`dueAt` timestamp,
	`source` varchar(100),
	`sourceAgentRunId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_drafts` MODIFY COLUMN `reviewStatus` enum('pending','approved','rejected','queued','sent') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `email_responses` MODIFY COLUMN `sentiment` enum('positive','neutral','negative','interested','not_interested');--> statement-breakpoint
ALTER TABLE `email_responses` MODIFY COLUMN `receivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `language` varchar(10) DEFAULT 'de';--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','staff','staff_plus') NOT NULL DEFAULT 'staff';--> statement-breakpoint
ALTER TABLE `api_keys` ADD `anthropicKey` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `googleKey` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `mistralKey` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `groqKey` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `openrouterKey` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `ollamaKey` text;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `ollamaUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `api_keys` ADD `defaultLlmProvider` varchar(50) DEFAULT 'openai';--> statement-breakpoint
ALTER TABLE `companies` ADD `createdBy` varchar(64);--> statement-breakpoint
ALTER TABLE `companies` ADD `updatedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `companies` ADD `companyName2` varchar(120);--> statement-breakpoint
ALTER TABLE `companies` ADD `responsibleUserId` varchar(64);--> statement-breakpoint
ALTER TABLE `companies` ADD `street` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `zip` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `state` varchar(50);--> statement-breakpoint
ALTER TABLE `companies` ADD `poBox` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `poBoxZip` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `rebate` decimal(10,4);--> statement-breakpoint
ALTER TABLE `companies` ADD `priceList` varchar(40);--> statement-breakpoint
ALTER TABLE `companies` ADD `rebateList` varchar(40);--> statement-breakpoint
ALTER TABLE `companies` ADD `debitorNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `creditorNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `taxNumber` varchar(30);--> statement-breakpoint
ALTER TABLE `companies` ADD `paymentTerm` varchar(255);--> statement-breakpoint
ALTER TABLE `companies` ADD `currency` varchar(3);--> statement-breakpoint
ALTER TABLE `companies` ADD `company_type` enum('partner','supplier','customer','staff','staff_plus','prospect') DEFAULT 'prospect';--> statement-breakpoint
ALTER TABLE `companies` ADD `parent_company_id` varchar(64);--> statement-breakpoint
ALTER TABLE `companies` ADD `domain` varchar(255);--> statement-breakpoint
ALTER TABLE `companies` ADD `addressFormat` varchar(10);--> statement-breakpoint
ALTER TABLE `companies` ADD `branch` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `industry` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `employeeCount` int;--> statement-breakpoint
ALTER TABLE `companies` ADD `city2` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `companySize` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `deactivated` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `companies` ADD `district` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `companies` ADD `externalAddressId` varchar(30);--> statement-breakpoint
ALTER TABLE `companies` ADD `gwAddressNumber` varchar(30);--> statement-breakpoint
ALTER TABLE `companies` ADD `name2` varchar(255);--> statement-breakpoint
ALTER TABLE `companies` ADD `ownerName` varchar(200);--> statement-breakpoint
ALTER TABLE `companies` ADD `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `companies` ADD `phone2` varchar(50);--> statement-breakpoint
ALTER TABLE `companies` ADD `poBoxCity` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `stage` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `state2` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `street2` varchar(100);--> statement-breakpoint
ALTER TABLE `companies` ADD `taxId` varchar(30);--> statement-breakpoint
ALTER TABLE `companies` ADD `website2` varchar(255);--> statement-breakpoint
ALTER TABLE `companies` ADD `zip2` varchar(20);--> statement-breakpoint
ALTER TABLE `companies` ADD `profilePath` varchar(500);--> statement-breakpoint
ALTER TABLE `companies` ADD `enrichedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contact_company_relations` ADD `email2` varchar(255);--> statement-breakpoint
ALTER TABLE `contact_company_relations` ADD `email3` varchar(255);--> statement-breakpoint
ALTER TABLE `contact_company_relations` ADD `email4` varchar(255);--> statement-breakpoint
ALTER TABLE `contact_company_relations` ADD `email5` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `title` varchar(30);--> statement-breakpoint
ALTER TABLE `contacts` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `email2` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `email3` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `email4` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `email5` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `street` varchar(255);--> statement-breakpoint
ALTER TABLE `contacts` ADD `postalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `contacts` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `state` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `country` varchar(100);--> statement-breakpoint
ALTER TABLE `contacts` ADD `firstContact` varchar(30);--> statement-breakpoint
ALTER TABLE `contacts` ADD `firstContactDate` datetime;--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastContactDate` datetime;--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastContactUser` varchar(30);--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastContactMedium` varchar(30);--> statement-breakpoint
ALTER TABLE `email_responses` ADD `requiresAction` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `email_responses` ADD `actionType` varchar(100);--> statement-breakpoint
ALTER TABLE `email_responses` ADD `processedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `email_responses` ADD `processedAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_responses` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `email_templates` ADD `category` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `assignedTo` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `caldavEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `users` ADD `caldavPassword` text;--> statement-breakpoint
ALTER TABLE `users` ADD `caldavEnabled` boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX `agent_jobs_status_idx` ON `agent_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `agent_jobs_type_idx` ON `agent_jobs` (`type`);--> statement-breakpoint
CREATE INDEX `agent_jobs_scheduled_idx` ON `agent_jobs` (`scheduledAt`);--> statement-breakpoint
CREATE INDEX `agent_jobs_entity_idx` ON `agent_jobs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `agent_runs_job_idx` ON `agent_runs` (`jobId`);--> statement-breakpoint
CREATE INDEX `agent_runs_agent_idx` ON `agent_runs` (`agentName`);--> statement-breakpoint
CREATE INDEX `agent_suggestions_status_idx` ON `agent_suggestions` (`status`);--> statement-breakpoint
CREATE INDEX `agent_suggestions_entity_idx` ON `agent_suggestions` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `agent_suggestions_type_idx` ON `agent_suggestions` (`suggestionType`);--> statement-breakpoint
CREATE INDEX `agent_tool_calls_run_idx` ON `agent_tool_calls` (`runId`);--> statement-breakpoint
CREATE INDEX `agent_tool_calls_tool_idx` ON `agent_tool_calls` (`toolName`);--> statement-breakpoint
CREATE INDEX `idx_archived_email_id` ON `archived_email_attachments` (`archived_email_id`);--> statement-breakpoint
CREATE INDEX `archived_emails_contact_idx` ON `archived_emails` (`contact_id`);--> statement-breakpoint
CREATE INDEX `archived_emails_user_idx` ON `archived_emails` (`user_id`);--> statement-breakpoint
CREATE INDEX `archived_emails_email_id_idx` ON `archived_emails` (`email_id`);--> statement-breakpoint
CREATE INDEX `attachments_activity_idx` ON `attachments` (`activityId`);--> statement-breakpoint
CREATE INDEX `cdl_contact_idx` ON `contact_distribution_lists` (`contactId`);--> statement-breakpoint
CREATE INDEX `cdl_list_idx` ON `contact_distribution_lists` (`distributionListId`);--> statement-breakpoint
CREATE INDEX `dl_name_idx` ON `distribution_lists` (`name`);--> statement-breakpoint
CREATE INDEX `dl_type_idx` ON `distribution_lists` (`listType`);--> statement-breakpoint
CREATE INDEX `ea_email_idx` ON `email_accounts` (`email`);--> statement-breakpoint
CREATE INDEX `ea_purpose_idx` ON `email_accounts` (`purpose`);--> statement-breakpoint
CREATE INDEX `efl_account_idx` ON `email_fetch_log` (`emailAccountId`);--> statement-breakpoint
CREATE INDEX `efl_message_idx` ON `email_fetch_log` (`messageId`);--> statement-breakpoint
CREATE INDEX `efl_contact_idx` ON `email_fetch_log` (`matchedContactId`);--> statement-breakpoint
CREATE INDEX `epl_email_idx` ON `email_project_links` (`emailId`);--> statement-breakpoint
CREATE INDEX `epl_project_idx` ON `email_project_links` (`projectId`);--> statement-breakpoint
CREATE INDEX `esq_status_scheduled_idx` ON `email_send_queue` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE INDEX `esq_draft_idx` ON `email_send_queue` (`draftId`);--> statement-breakpoint
CREATE INDEX `esq_locked_by_idx` ON `email_send_queue` (`lockedBy`);--> statement-breakpoint
CREATE INDEX `pbp_project_idx` ON `project_budget_plans` (`projectId`);--> statement-breakpoint
CREATE INDEX `pts_project_idx` ON `project_timesheets` (`projectId`);--> statement-breakpoint
CREATE INDEX `pts_user_idx` ON `project_timesheets` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_token_hash_idx` ON `sessions` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `tasks_owner_idx` ON `tasks` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`dueAt`);--> statement-breakpoint
CREATE INDEX `tasks_entity_idx` ON `tasks` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `companies_parent_idx` ON `companies` (`parent_company_id`);--> statement-breakpoint
CREATE INDEX `companies_domain_idx` ON `companies` (`domain`);--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `createdBy`;--> statement-breakpoint
ALTER TABLE `email_responses` DROP COLUMN `fromEmail`;--> statement-breakpoint
ALTER TABLE `email_responses` DROP COLUMN `qualification`;--> statement-breakpoint
ALTER TABLE `email_responses` DROP COLUMN `qualifiedAt`;--> statement-breakpoint
ALTER TABLE `email_responses` DROP COLUMN `isRead`;--> statement-breakpoint
ALTER TABLE `email_templates` DROP COLUMN `industry`;--> statement-breakpoint
ALTER TABLE `email_templates` DROP COLUMN `targetRole`;--> statement-breakpoint
ALTER TABLE `email_templates` DROP COLUMN `usageCount`;--> statement-breakpoint
ALTER TABLE `email_templates` DROP COLUMN `openRate`;--> statement-breakpoint
ALTER TABLE `email_templates` DROP COLUMN `responseRate`;--> statement-breakpoint
ALTER TABLE `outreach_campaigns` DROP COLUMN `createdBy`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `partnerId`;