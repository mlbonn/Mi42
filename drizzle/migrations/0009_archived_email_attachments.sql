-- Migration: 0009_archived_email_attachments.sql
-- Anhänge archivierter E-Mails
-- Exakt passend zur Produktions-Struktur (verifiziert via SHOW CREATE TABLE).
-- Hinweis: Der Foreign Key auf archived_emails(id) wurde in Produktion manuell
-- ergänzt und ist nicht Teil dieser Migration, da archived_emails in einer
-- separaten Basis-Migration angelegt wird (0001-0004, noch nicht im Ordner).
-- Idempotent via CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS `archived_email_attachments` (
  `id`                int          NOT NULL AUTO_INCREMENT,
  `archived_email_id` int          NOT NULL,
  `filename`          varchar(255) NOT NULL,
  `content_type`      varchar(100) DEFAULT NULL,
  `size_bytes`        int          DEFAULT NULL,
  `file_path`         varchar(500) NOT NULL,
  `created_at`        timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_archived_email_id` (`archived_email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
