-- Migration: 0010_archived_emails.sql
-- Archivierte E-Mails (Basis-Tabelle fuer archived_email_attachments)
-- Exakt passend zur Produktions-Struktur (verifiziert via SHOW CREATE TABLE).
-- Idempotent via CREATE TABLE IF NOT EXISTS.
-- MUSS vor 0009_archived_email_attachments.sql ausgefuehrt werden.

CREATE TABLE IF NOT EXISTS `archived_emails` (
  `id`            int          NOT NULL AUTO_INCREMENT,
  `email_id`      varchar(255) NOT NULL,
  `contact_id`    varchar(64)  NOT NULL,
  `user_id`       varchar(64)  NOT NULL,
  `folder`        varchar(100) NOT NULL DEFAULT 'INBOX',
  `from_address`  varchar(255) DEFAULT NULL,
  `from_name`     varchar(255) DEFAULT NULL,
  `to_address`    varchar(255) DEFAULT NULL,
  `cc_address`    text,
  `subject`       text,
  `body`          text,
  `html_body`     text,
  `email_date`    timestamp    NULL DEFAULT NULL,
  `notes`         text,
  `archived_at`   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email_contact` (`email_id`(191), `contact_id`),
  KEY `archived_emails_contact_idx` (`contact_id`),
  KEY `archived_emails_user_idx` (`user_id`),
  KEY `archived_emails_email_id_idx` (`email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
