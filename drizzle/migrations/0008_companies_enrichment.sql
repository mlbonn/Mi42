-- Migration: 0008_companies_enrichment
-- Ergänzt Felder für den company_enrichment Agent
-- und openrouterKey in api_keys
-- Idempotent: Spalten werden nur ergänzt wenn sie noch nicht existieren

-- companies: Anreicherungs-Felder (idempotent via INFORMATION_SCHEMA)
SET @dbname = DATABASE();

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='companies' AND COLUMN_NAME='industry'),
  'ALTER TABLE `companies` ADD COLUMN `industry` varchar(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='companies' AND COLUMN_NAME='employeeCount'),
  'ALTER TABLE `companies` ADD COLUMN `employeeCount` int NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='companies' AND COLUMN_NAME='profilePath'),
  'ALTER TABLE `companies` ADD COLUMN `profilePath` varchar(512) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='companies' AND COLUMN_NAME='enrichedAt'),
  'ALTER TABLE `companies` ADD COLUMN `enrichedAt` timestamp NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- api_keys: OpenRouter Key
SET @sql = IF(
  NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@dbname AND TABLE_NAME='api_keys' AND COLUMN_NAME='openrouterKey'),
  'ALTER TABLE `api_keys` ADD COLUMN `openrouterKey` text NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
