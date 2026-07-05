-- Migration: 0006_email_send_queue.sql
-- Serien-E-Mail-Warteschlange

CREATE TABLE IF NOT EXISTS email_send_queue (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  draftId VARCHAR(64),
  userId VARCHAR(64) NOT NULL,
  toAddress VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  body TEXT,
  status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  maxAttempts INT NOT NULL DEFAULT 3,
  scheduledAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sentAt TIMESTAMP NULL,
  errorMessage TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX esq_status_scheduled_idx (status, scheduledAt),
  INDEX esq_draft_idx (draftId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
