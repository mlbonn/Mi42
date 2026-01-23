ALTER TABLE `activities` ADD `hasAttachment` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `activities` ADD `attachmentCount` int DEFAULT 0;