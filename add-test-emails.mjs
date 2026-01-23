import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// First, find Maria Schmidt
const [contacts] = await connection.query(
  'SELECT id, firstName, lastName FROM contacts WHERE firstName LIKE ? AND lastName LIKE ? LIMIT 1',
  ['%Maria%', '%Schmidt%']
);

if (contacts.length === 0) {
  console.log('❌ Maria Schmidt nicht gefunden');
  await connection.end();
  process.exit(1);
}

const contact = contacts[0];
console.log(`✅ Gefunden: ${contact.firstName} ${contact.lastName} (ID: ${contact.id})`);

// Create 5 test emails
const testEmails = [
  {
    subject: 'Anfrage zu neuen Produkten',
    body: 'Hallo,\n\nich interessiere mich für Ihre neuen Produkte im Bereich Bauchemie. Können Sie mir weitere Informationen zusenden?\n\nMit freundlichen Grüßen\nMaria Schmidt',
    fromEmail: 'maria.schmidt@sika.com',
    toEmail: 'vertrieb@beispiel.de',
    sentAt: new Date('2025-10-25T09:15:00'),
    direction: 'outbound'
  },
  {
    subject: 'Re: Angebot für Projekt XYZ',
    body: 'Vielen Dank für Ihr Angebot. Wir werden es prüfen und uns in den nächsten Tagen bei Ihnen melden.\n\nBeste Grüße\nMaria Schmidt',
    fromEmail: 'maria.schmidt@sika.com',
    toEmail: 'vertrieb@beispiel.de',
    sentAt: new Date('2025-10-26T14:30:00'),
    direction: 'outbound'
  },
  {
    subject: 'Terminbestätigung Meeting',
    body: 'Hallo,\n\nhiermit bestätige ich unseren Termin am 5. November um 14:00 Uhr in unserem Büro.\n\nFreundliche Grüße\nMaria Schmidt',
    fromEmail: 'maria.schmidt@sika.com',
    toEmail: 'vertrieb@beispiel.de',
    sentAt: new Date('2025-10-28T10:00:00'),
    direction: 'outbound'
  },
  {
    subject: 'Technische Fragen zu Produkt ABC',
    body: 'Guten Tag,\n\nich habe einige technische Fragen zu Ihrem Produkt ABC. Könnten wir dazu telefonieren?\n\nViele Grüße\nMaria Schmidt',
    fromEmail: 'maria.schmidt@sika.com',
    toEmail: 'support@beispiel.de',
    sentAt: new Date('2025-10-29T11:45:00'),
    direction: 'outbound'
  },
  {
    subject: 'Feedback zum letzten Meeting',
    body: 'Hallo,\n\nvielen Dank für das konstruktive Gespräch gestern. Ich habe die besprochenen Punkte intern weitergegeben.\n\nBis bald\nMaria Schmidt',
    fromEmail: 'maria.schmidt@sika.com',
    toEmail: 'vertrieb@beispiel.de',
    sentAt: new Date('2025-10-30T08:20:00'),
    direction: 'outbound'
  }
];

// Insert emails
for (const email of testEmails) {
  const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await connection.query(
    `INSERT INTO activities (
      id, activityType, activityDate, subject, content,
      contactId, direction, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      emailId,
      'email',
      email.sentAt,
      email.subject,
      email.body,
      contact.id,
      email.direction,
      new Date()
    ]
  );
  
  console.log(`✅ E-Mail erstellt: ${email.subject}`);
  
  // Small delay to ensure unique IDs
  await new Promise(resolve => setTimeout(resolve, 10));
}

console.log('\n✅ Alle 5 Test-E-Mails erfolgreich erstellt!');

await connection.end();
