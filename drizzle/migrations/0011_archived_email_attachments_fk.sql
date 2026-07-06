-- Migration: 0011_archived_email_attachments_fk.sql
-- Ergaenzt den Foreign Key auf archived_emails(id) in archived_email_attachments.
-- Setzt voraus, dass 0010_archived_emails.sql bereits ausgefuehrt wurde.
-- Idempotent: FK wird nur angelegt wenn er noch nicht existiert.

SET @dbname = DATABASE();
SET @constraint_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'archived_email_attachments'
    AND CONSTRAINT_NAME = 'archived_email_attachments_ibfk_1'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(
  @constraint_exists = 0,
  'ALTER TABLE `archived_email_attachments` ADD CONSTRAINT `archived_email_attachments_ibfk_1` FOREIGN KEY (`archived_email_id`) REFERENCES `archived_emails` (`id`) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
