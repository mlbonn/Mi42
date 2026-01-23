CREATE TABLE `email_project_links` (
`id` varchar(64) NOT NULL,
`emailId` varchar(255) NOT NULL,
`projectId` varchar(64) NOT NULL,
`taskId` varchar(64),
`linkedAt` timestamp DEFAULT (now()),
CONSTRAINT `email_project_links_id` PRIMARY KEY(`id`),
INDEX `epl_email_idx` (`emailId`),
INDEX `epl_project_idx` (`projectId`)
);

CREATE TABLE `project_timesheets` (
`id` varchar(64) NOT NULL,
`projectId` varchar(64) NOT NULL,
`taskId` varchar(64),
`userId` varchar(64) NOT NULL,
`hours` decimal(5,2) NOT NULL,
`cost` decimal(10,2) NOT NULL,
`date` timestamp NOT NULL,
`description` text,
`createdAt` timestamp DEFAULT (now()),
CONSTRAINT `project_timesheets_id` PRIMARY KEY(`id`),
INDEX `pts_project_idx` (`projectId`),
INDEX `pts_user_idx` (`userId`)
);

CREATE TABLE `project_budget_plans` (
`id` varchar(64) NOT NULL,
`projectId` varchar(64) NOT NULL,
`category` varchar(100),
`amount` decimal(10,2) NOT NULL,
`spent` decimal(10,2) DEFAULT 0,
`createdAt` timestamp DEFAULT (now()),
CONSTRAINT `project_budget_plans_id` PRIMARY KEY(`id`),
INDEX `pbp_project_idx` (`projectId`)
);
