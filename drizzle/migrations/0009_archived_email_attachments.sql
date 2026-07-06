-- Migration: 0009_archived_email_attachments
-- Erstellt die Tabelle archived_email_attachments fuer Anhänge archivierter E-Mails.
-- Entspricht der Drizzle-Schema-Definition in drizzle/schema.ts (Zeile 1185).
-- Idempotent: Tabelle wird nur angelegt wenn sie noch nicht existiert.

CREATE TABLE IF NOT EXISTS `archived_email_attachments` (
  `id`                int          NOT NULL AUTO_INCREMENT,
  `archived_email_id` int          NOT NULL,
  `filename`          varchar(512) NOT NULL,
  `content_type`      varchar(128) NULL,
  `size_bytes`        int          NULL,
  `file_path`         varchar(1024) NULL,
  `created_at`        timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_archived_email_id` (`archived_email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
