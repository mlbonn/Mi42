-- Migration: Create attachments table for file storage
-- Date: 2025-10-31
-- Version: 2 (without FK constraint due to charset mismatch)

CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  activityId VARCHAR(64) NOT NULL,
  fileName VARCHAR(255) NOT NULL COMMENT 'Stored filename (UUID + original)',
  originalFileName VARCHAR(255) NOT NULL COMMENT 'Original uploaded filename',
  filePath VARCHAR(500) NOT NULL COMMENT 'Relative path from project root',
  fileSize INT NOT NULL COMMENT 'File size in bytes',
  mimeType VARCHAR(100) COMMENT 'MIME type (e.g., application/pdf)',
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity (activityId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
