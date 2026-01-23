-- ============================================================================
-- FRIDAY CRM - SQL DDL (MySQL/TiDB)
-- Generated: 2025-10-21
-- Version: ca65c60b
-- ============================================================================

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` TEXT,
  `email` VARCHAR(320),
  `loginMethod` VARCHAR(64),
  `role` ENUM('admin', 'sales_manager', 'external_sales', 'partner', 'user') NOT NULL DEFAULT 'user',
  `status` VARCHAR(50) DEFAULT 'active',
  `partnerId` VARCHAR(64),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `lastSignedIn` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- HIERARCHIE: CORPORATION (Konzern)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `corporations` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `headquartersCountry` VARCHAR(2),
  `totalRevenueEur` BIGINT,
  `industry` VARCHAR(100),
  `website` VARCHAR(255),
  `linkedinUrl` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'Target',
  `priority` VARCHAR(20) DEFAULT 'Medium',
  `notes` TEXT,
  `companySize` VARCHAR(100),
  `stage` VARCHAR(100),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `corporations_name_idx` (`name`),
  INDEX `corporations_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- HIERARCHIE: COMPANY (Firma)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `companies` (
  `id` VARCHAR(64) PRIMARY KEY,
  `corporationId` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `legalForm` VARCHAR(50),
  `country` VARCHAR(2),
  `city` VARCHAR(100),
  `address` TEXT,
  `revenueEur` BIGINT,
  `products` TEXT,
  `website` VARCHAR(255),
  `notes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `companies_corporation_idx` (`corporationId`),
  INDEX `companies_name_idx` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- HIERARCHIE: CONTACT (Ansprechpartner)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` VARCHAR(64) PRIMARY KEY,
  `firstName` VARCHAR(100),
  `lastName` VARCHAR(100),
  `jobTitle` VARCHAR(255),
  `linkedinUrl` VARCHAR(255),
  `phone` VARCHAR(50),
  `mobile` VARCHAR(50),
  `decisionMaker` BOOLEAN DEFAULT FALSE,
  `contactStatus` VARCHAR(50) DEFAULT 'Cold',
  `notes` TEXT,
  -- Genesis World CRM Felder
  `keyword1` TEXT,
  `keyword2` TEXT,
  `companySize` VARCHAR(100),
  `responsiblePerson` VARCHAR(255),
  `function` VARCHAR(100),
  `department` VARCHAR(100),
  `category` VARCHAR(100),
  `tags` TEXT,
  `phoneBusiness` VARCHAR(50),
  `phoneMobile` VARCHAR(50),
  `phoneOffice` VARCHAR(50),
  `faxOffice` VARCHAR(50),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `contacts_name_idx` (`lastName`, `firstName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- N:M RELATION: CONTACT ↔ COMPANY
-- ============================================================================

CREATE TABLE IF NOT EXISTS `contact_company_relations` (
  `id` VARCHAR(64) PRIMARY KEY,
  `contactId` VARCHAR(64) NOT NULL,
  `companyId` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255),
  `position` VARCHAR(255),
  `isPrimary` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `ccr_contact_idx` (`contactId`),
  INDEX `ccr_company_idx` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- CONTACT EMAILS (Mehrere E-Mails pro Kontakt)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `contact_emails` (
  `id` VARCHAR(64) PRIMARY KEY,
  `contactId` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `emailType` VARCHAR(50) DEFAULT 'work',
  `isPrimary` BOOLEAN DEFAULT FALSE,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `contact_emails_contact_idx` (`contactId`),
  INDEX `contact_emails_email_idx` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEALS (Sales Pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `deals` (
  `id` VARCHAR(64) PRIMARY KEY,
  `corporationId` VARCHAR(64) NOT NULL,
  `companyId` VARCHAR(64),
  `dealName` VARCHAR(255),
  `dealValueEur` DECIMAL(10, 2),
  `stage` VARCHAR(50) DEFAULT 'Cold',
  `probability` INT DEFAULT 0,
  `expectedCloseDate` TIMESTAMP,
  `actualCloseDate` TIMESTAMP,
  `subscriptionTier` VARCHAR(50),
  `createdBy` VARCHAR(64),
  `notes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `deals_corporation_idx` (`corporationId`),
  INDEX `deals_stage_idx` (`stage`),
  INDEX `deals_created_by_idx` (`createdBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ACTIVITIES (E-Mails, Calls, Meetings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `activities` (
  `id` VARCHAR(64) PRIMARY KEY,
  `corporationId` VARCHAR(64),
  `companyId` VARCHAR(64),
  `contactId` VARCHAR(64),
  `activityType` VARCHAR(50),
  `activityDate` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `subject` VARCHAR(255),
  `content` TEXT,
  `direction` VARCHAR(20),
  `outcome` VARCHAR(50),
  `emailMessageId` VARCHAR(255),
  `createdBy` VARCHAR(100),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `activities_corporation_idx` (`corporationId`),
  INDEX `activities_contact_idx` (`contactId`),
  INDEX `activities_date_idx` (`activityDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PRODUCT USAGE (GBM Nutzung)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `product_usage` (
  `id` VARCHAR(64) PRIMARY KEY,
  `corporationId` VARCHAR(64) NOT NULL,
  `userEmail` VARCHAR(255),
  `lastLogin` TIMESTAMP,
  `totalLogins` INT DEFAULT 0,
  `countriesAccessed` TEXT,
  `excelAddonUsed` BOOLEAN DEFAULT FALSE,
  `apiCallsLastMonth` INT DEFAULT 0,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `product_usage_corporation_idx` (`corporationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PARTNERS (Externe Partner)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `partners` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contactEmail` VARCHAR(255),
  `partnerType` VARCHAR(50),
  `commissionRate` VARCHAR(20),
  `status` VARCHAR(50) DEFAULT 'Active',
  `notes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- PARTNER DEALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `partner_deals` (
  `id` VARCHAR(64) PRIMARY KEY,
  `partnerId` VARCHAR(64) NOT NULL,
  `dealId` VARCHAR(64) NOT NULL,
  `referralSource` VARCHAR(255),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `partner_deals_partner_idx` (`partnerId`),
  INDEX `partner_deals_deal_idx` (`dealId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- USER ACCOUNT ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `user_account_assignments` (
  `id` VARCHAR(64) PRIMARY KEY,
  `userId` VARCHAR(64) NOT NULL,
  `corporationId` VARCHAR(64) NOT NULL,
  `assignmentType` VARCHAR(50),
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `uaa_user_idx` (`userId`),
  INDEX `uaa_corporation_idx` (`corporationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- COMMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS `commissions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `userId` VARCHAR(64) NOT NULL,
  `dealId` VARCHAR(64) NOT NULL,
  `commissionAmount` DECIMAL(10, 2),
  `status` VARCHAR(50) DEFAULT 'Pending',
  `paidAt` TIMESTAMP,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `commissions_user_idx` (`userId`),
  INDEX `commissions_deal_idx` (`dealId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Total Tables: 13
-- Total Fields: 147
-- Genesis World CRM Fields: 14 (2 in corporations, 12 in contacts)
-- Version: ca65c60b
-- ============================================================================
