
-- Emails Tabelle
CREATE TABLE IF NOT EXISTS emails (
  id VARCHAR(36) PRIMARY KEY,
  contactId VARCHAR(36),
  fromAddress VARCHAR(255),
  toAddress TEXT,
  cc TEXT,
  bcc TEXT,
  subject VARCHAR(500),
  body LONGTEXT,
  htmlBody LONGTEXT,
  timestamp DATETIME,
  outlookId VARCHAR(255),
  direction ENUM('inbound', 'outbound') DEFAULT 'inbound',
  isRead BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdBy VARCHAR(36),
  INDEX idx_emails_contactId (contactId),
  INDEX idx_emails_outlookId (outlookId),
  INDEX idx_emails_timestamp (timestamp),
  FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE SET NULL
);

-- Email Attachments Tabelle
CREATE TABLE IF NOT EXISTS email_attachments (
  id VARCHAR(36) PRIMARY KEY,
  emailId VARCHAR(36) NOT NULL,
  name VARCHAR(255),
  size INT,
  mimeType VARCHAR(100),
  path VARCHAR(500),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attachments_emailId (emailId),
  FOREIGN KEY (emailId) REFERENCES emails(id) ON DELETE CASCADE
);

