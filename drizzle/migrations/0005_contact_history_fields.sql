-- Migration: Add contact history fields
-- Generated: 2026-07-05

ALTER TABLE `contacts`
  ADD COLUMN IF NOT EXISTS `firstContact` varchar(30) NULL COMMENT 'Art des Erstkontakts',
  ADD COLUMN IF NOT EXISTS `firstContactDate` datetime NULL COMMENT 'Datum Erstkontakt',
  ADD COLUMN IF NOT EXISTS `lastContactDate` datetime NULL COMMENT 'Datum letzter Kontakt',
  ADD COLUMN IF NOT EXISTS `lastContactUser` varchar(30) NULL COMMENT 'Wer hatte zuletzt Kontakt',
  ADD COLUMN IF NOT EXISTS `lastContactMedium` varchar(30) NULL COMMENT 'Kanal des letzten Kontakts';
