-- Migration: Tote Tabellen entfernen
-- Tabellen ohne Code-Referenzen und ohne Daten (oder mit veralteten Testdaten)
-- Geprüft: 0 Code-Treffer in server/ und client/src/ für alle drei Tabellen

DROP TABLE IF EXISTS `archived_email_permissions`;
DROP TABLE IF EXISTS `mail_server_credentials`;
DROP TABLE IF EXISTS `mail_credentials_audit_log`;

