-- Create test email with attachment for Maria Schmidt
-- Date: 2025-10-31

-- Insert new email activity
INSERT INTO activities (
  id,
  contactId,
  activityType,
  activityDate,
  subject,
  content,
  direction,
  outcome,
  hasAttachment,
  attachmentCount,
  createdBy,
  createdAt
) VALUES (
  'email_test_attachment_001',
  '9e5c80bd-c596-44b0-9e07-153356dfc332',
  'email',
  NOW(),
  'Angebot für Bauchemie-Produkte Q4 2025',
  'Sehr geehrte Frau Schmidt,\n\nvielen Dank für Ihr Interesse an unseren Bauchemie-Produkten. Im Anhang finden Sie unser detailliertes Angebot für das vierte Quartal 2025.\n\nBitte prüfen Sie die Konditionen und lassen Sie uns wissen, ob Sie Fragen haben.\n\nMit freundlichen Grüßen\nIhr Vertriebsteam',
  'Outbound',
  'Positive',
  1,
  1,
  'System',
  NOW()
);

-- Insert attachment record
INSERT INTO attachments (
  id,
  activityId,
  fileName,
  originalFileName,
  filePath,
  fileSize,
  mimeType,
  uploadedAt
) VALUES (
  'attachment_test_001',
  'email_test_attachment_001',
  'Angebot_Bauchemie_Q4_2025.pdf',
  'Angebot_Bauchemie_Q4_2025.pdf',
  'storage/attachments/2025/10/Angebot_Bauchemie_Q4_2025.pdf',
  15000,
  'application/pdf',
  NOW()
);
