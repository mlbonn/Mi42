-- ============================================
-- Migration 001: AI Features & Email Archiving (v2)
-- Datum: 2026-01-13
-- Beschreibung: Neue Tabellen für KI-Features, Archivierung und Kategorisierung
-- 
-- WICHTIG: Eindeutige Tabellen- und Feldnamen um Konflikte zu vermeiden
-- Bestehende Tabellen: emails, users, contacts, email_accounts
-- ============================================

-- ============================================
-- 1. user_ai_settings - KI-Einstellungen pro User
-- Neue Tabelle (keine Konflikte)
-- ============================================
CREATE TABLE IF NOT EXISTS user_ai_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'FK zu users.id (VARCHAR!)',
  ai_provider VARCHAR(50) DEFAULT 'openai' COMMENT 'openai, anthropic, gemini',
  ai_model VARCHAR(100) DEFAULT 'gpt-4.1-mini',
  ai_api_key VARCHAR(512) COMMENT 'Verschlüsselt! Länger für verschlüsselte Keys',
  ai_default_tone VARCHAR(50) DEFAULT 'professional' COMMENT 'friendly, professional, brief',
  ai_default_language VARCHAR(10) DEFAULT 'de',
  ai_features_enabled JSON COMMENT 'Features: reply, translate, summarize, smartReplies, categorize',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_ai_settings (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='KI-Einstellungen pro User - Provider, Modell, API-Key';

-- ============================================
-- 2. contact_email_archives - Archivierte E-Mails an Kontakte
-- Neue Tabelle (keine Konflikte mit "emails" Tabelle)
-- ============================================
CREATE TABLE IF NOT EXISTS contact_email_archives (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'FK zu users.id',
  contact_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci COMMENT 'FK zu contacts.id - NULL wenn kein Kontakt zugeordnet',
  
  -- E-Mail Metadaten (von SmarterMail)
  email_uid VARCHAR(255) NOT NULL COMMENT 'UID aus SmarterMail',
  email_folder VARCHAR(100) NOT NULL COMMENT 'INBOX, Sent, Drafts, etc.',
  
  -- E-Mail Inhalt (denormalisiert für schnellen Zugriff)
  email_from_address VARCHAR(255) COMMENT 'Absender E-Mail',
  email_from_name VARCHAR(255) COMMENT 'Absender Name',
  email_to_addresses TEXT COMMENT 'Empfänger (JSON Array)',
  email_cc_addresses TEXT COMMENT 'CC (JSON Array)',
  email_subject TEXT COMMENT 'Betreff',
  email_body_text LONGTEXT COMMENT 'Body als Text',
  email_body_html LONGTEXT COMMENT 'Body als HTML',
  email_date DATETIME COMMENT 'E-Mail Datum',
  email_attachments JSON COMMENT 'Attachments metadata',
  
  -- Archivierungs-Metadaten
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_by VARCHAR(64) COLLATE utf8mb4_0900_ai_ci COMMENT 'User der archiviert hat',
  archive_notes TEXT COMMENT 'User-Notizen zur Archivierung',
  archive_source VARCHAR(50) DEFAULT 'manual' COMMENT 'manual, auto_on_send',
  
  -- Indizes für Performance
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  INDEX idx_contact_archives (contact_id, archived_at DESC),
  INDEX idx_user_archives (user_id, archived_at DESC),
  INDEX idx_email_uid_archives (email_uid),
  INDEX idx_email_folder_archives (email_folder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Archivierte E-Mails mit Verknüpfung zu Kontakten';

-- ============================================
-- 3. email_ai_categories - KI-basierte Kategorisierung
-- Neue Tabelle (keine Konflikte)
-- ============================================
CREATE TABLE IF NOT EXISTS email_ai_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email_uid VARCHAR(255) NOT NULL COMMENT 'UID aus SmarterMail',
  email_folder VARCHAR(100) NOT NULL COMMENT 'INBOX, Sent, etc.',
  user_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'FK zu users.id',
  
  -- KI-Kategorisierung
  ai_category VARCHAR(100) NOT NULL COMMENT 'invoice, inquiry, complaint, newsletter, order, support, other',
  ai_importance TINYINT DEFAULT 2 COMMENT '1=niedrig, 2=normal, 3=hoch',
  ai_sentiment VARCHAR(50) COMMENT 'positive, neutral, negative',
  ai_urgency VARCHAR(50) COMMENT 'low, medium, high',
  ai_tags JSON COMMENT 'Tags: urgent, follow-up, payment, technical',
  ai_confidence FLOAT COMMENT 'KI-Confidence Score (0.0-1.0)',
  
  -- Metadaten
  categorized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ai_model_used VARCHAR(100) COMMENT 'z.B. gpt-4.1-mini',
  
  -- Indizes
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_email_category (email_uid, user_id),
  INDEX idx_category (ai_category),
  INDEX idx_importance (ai_importance),
  INDEX idx_sentiment (ai_sentiment),
  INDEX idx_urgency (ai_urgency),
  INDEX idx_user_categories (user_id, categorized_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='KI-basierte Kategorisierung von E-Mails';

-- ============================================
-- 4. email_ai_smart_replies - Cache für Smart Reply Vorschläge
-- Neue Tabelle (keine Konflikte)
-- ============================================
CREATE TABLE IF NOT EXISTS email_ai_smart_replies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email_uid VARCHAR(255) NOT NULL COMMENT 'UID aus SmarterMail',
  email_folder VARCHAR(100) NOT NULL COMMENT 'INBOX, Sent, etc.',
  user_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'FK zu users.id',
  
  -- Smart Reply Vorschläge
  reply_option_1 TEXT COMMENT 'Erster Vorschlag',
  reply_option_2 TEXT COMMENT 'Zweiter Vorschlag',
  reply_option_3 TEXT COMMENT 'Dritter Vorschlag',
  
  -- Cache-Metadaten
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME COMMENT 'Cache für 24h',
  ai_model_used VARCHAR(100) COMMENT 'z.B. gpt-4.1-mini',
  
  -- Indizes
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_email_smart_reply (email_uid, user_id),
  INDEX idx_email_uid_replies (email_uid),
  INDEX idx_expires_replies (expires_at),
  INDEX idx_user_replies (user_id, generated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cache für KI-generierte Smart Reply Vorschläge (24h TTL)';

-- ============================================
-- 5. email_ai_translations - Cache für Übersetzungen
-- Neue Tabelle (optional, für Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS email_ai_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email_uid VARCHAR(255) NOT NULL COMMENT 'UID aus SmarterMail',
  user_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'FK zu users.id',
  
  -- Übersetzung
  source_language VARCHAR(10) COMMENT 'de, en, fr, etc.',
  target_language VARCHAR(10) NOT NULL COMMENT 'de, en, fr, etc.',
  original_text LONGTEXT NOT NULL,
  translated_text LONGTEXT NOT NULL,
  
  -- Cache-Metadaten
  translated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME COMMENT 'Cache für 7 Tage',
  ai_model_used VARCHAR(100) COMMENT 'z.B. gpt-4.1-mini',
  
  -- Indizes
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_email_uid_translations (email_uid),
  INDEX idx_expires_translations (expires_at),
  INDEX idx_user_translations (user_id, translated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cache für KI-Übersetzungen (7 Tage TTL)';

-- ============================================
-- 6. email_ai_summaries - Cache für Zusammenfassungen
-- Neue Tabelle (optional, für Performance)
-- ============================================
CREATE TABLE IF NOT EXISTS email_ai_summaries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email_uid VARCHAR(255) NOT NULL COMMENT 'UID aus SmarterMail',
  user_id VARCHAR(64) COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'FK zu users.id',
  
  -- Zusammenfassung
  summary_text TEXT COMMENT '2-3 Sätze Zusammenfassung',
  key_points JSON COMMENT 'Key points array',
  
  -- Cache-Metadaten
  summarized_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME COMMENT 'Cache für 7 Tage',
  ai_model_used VARCHAR(100) COMMENT 'z.B. gpt-4.1-mini',
  
  -- Indizes
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_email_summary (email_uid, user_id),
  INDEX idx_email_uid_summaries (email_uid),
  INDEX idx_expires_summaries (expires_at),
  INDEX idx_user_summaries (user_id, summarized_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cache für KI-Zusammenfassungen (7 Tage TTL)';

-- ============================================
-- Cleanup Events (optional)
-- Automatisches Löschen abgelaufener Cache-Einträge
-- ============================================

-- Event für Smart Replies (24h)
DELIMITER $$
CREATE EVENT IF NOT EXISTS cleanup_expired_smart_replies
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  DELETE FROM email_ai_smart_replies WHERE expires_at < NOW();
END$$
DELIMITER ;

-- Event für Übersetzungen (7 Tage)
DELIMITER $$
CREATE EVENT IF NOT EXISTS cleanup_expired_translations
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  DELETE FROM email_ai_translations WHERE expires_at < NOW();
END$$
DELIMITER ;

-- Event für Zusammenfassungen (7 Tage)
DELIMITER $$
CREATE EVENT IF NOT EXISTS cleanup_expired_summaries
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
  DELETE FROM email_ai_summaries WHERE expires_at < NOW();
END$$
DELIMITER ;

-- ============================================
-- Verify Tables
-- ============================================
-- SELECT 'Migration 001 completed successfully' AS status;
-- SHOW TABLES LIKE '%ai%';
-- SHOW TABLES LIKE '%archive%';

-- ============================================
-- Test Queries (optional)
-- ============================================
-- SELECT COUNT(*) FROM user_ai_settings;
-- SELECT COUNT(*) FROM contact_email_archives;
-- SELECT COUNT(*) FROM email_ai_categories;
-- SELECT COUNT(*) FROM email_ai_smart_replies;
-- SELECT COUNT(*) FROM email_ai_translations;
-- SELECT COUNT(*) FROM email_ai_summaries;
