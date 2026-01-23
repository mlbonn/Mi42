# FRIDAY CRM - Konzept: E-Mail, Kalender & Chatbot Integration

**Version:** 2.0  
**Datum:** 21. Oktober 2025  
**Status:** Konzept

---

## Überblick

Erweiterung von FRIDAY CRM um drei zentrale Kommunikationsfunktionen:

1. **E-Mail-Integration**: Halbautomatische Archivierung mit Kontakterkennung
2. **Kalender-Integration**: Termine und Teams-Calls direkt aus CRM versenden
3. **Chatbot-Integration**: Kontextbezogene Kundeninteraktion mit automatischer Kontaktanlage

---

## 1. E-Mail-Integration

### 1.1 Architektur

```
E-Mail-Postfach (IMAP)
    ↓
FRIDAY CRM E-Mail-Sync Service
    ↓
Kontakterkennung & Signatur-Parsing
    ↓
Archivierung in CRM-Akte
```

### 1.2 Kernfunktionen

#### A) Halbautomatische Archivierung

**Workflow:**
1. User öffnet E-Mail in Outlook/Gmail
2. Klick auf "In CRM archivieren" (Browser-Extension oder Forwarding)
3. FRIDAY CRM erkennt Absender-E-Mail
4. System schlägt Kontakt/Firma vor
5. User bestätigt oder wählt manuell aus
6. E-Mail + Anhänge werden archiviert

**Technische Umsetzung:**

```typescript
// E-Mail-Archivierung
interface EmailArchive {
  id: string;
  contactId?: string;      // Verknüpfung zu Kontakt
  companyId?: string;      // ODER Verknüpfung zu Firma
  corporationId?: string;  // ODER Verknüpfung zu Konzern
  
  from: string;            // Absender
  to: string[];            // Empfänger
  cc?: string[];
  subject: string;
  body: string;            // HTML oder Plain Text
  bodyPlain: string;       // Immer Plain Text für Suche
  
  attachments: EmailAttachment[];
  
  direction: 'inbound' | 'outbound';
  timestamp: Date;
  
  // Metadaten
  threadId?: string;       // E-Mail-Thread
  inReplyTo?: string;      // Antwort auf E-Mail
  
  // CRM-Felder
  relatedDealId?: string;  // Verknüpfung zu Deal
  tags: string[];          // z.B. "Angebot", "Rechnung"
  
  createdAt: Date;
  archivedBy: string;      // User-ID
}

interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;           // S3 Storage
  s3Url: string;
}
```

**Database Schema:**

```sql
CREATE TABLE email_archives (
  id VARCHAR(64) PRIMARY KEY,
  contact_id VARCHAR(64),
  company_id VARCHAR(64),
  corporation_id VARCHAR(64),
  
  from_email VARCHAR(320) NOT NULL,
  to_emails JSON,
  cc_emails JSON,
  subject VARCHAR(500),
  body TEXT,
  body_plain TEXT,
  
  direction ENUM('inbound', 'outbound') NOT NULL,
  timestamp DATETIME NOT NULL,
  
  thread_id VARCHAR(255),
  in_reply_to VARCHAR(255),
  
  related_deal_id VARCHAR(64),
  tags JSON,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_by VARCHAR(64),
  
  INDEX idx_contact (contact_id),
  INDEX idx_company (company_id),
  INDEX idx_from (from_email),
  INDEX idx_timestamp (timestamp),
  FULLTEXT INDEX idx_search (subject, body_plain)
);

CREATE TABLE email_attachments (
  id VARCHAR(64) PRIMARY KEY,
  email_archive_id VARCHAR(64) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size BIGINT,
  s3_key VARCHAR(500),
  s3_url VARCHAR(1000),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (email_archive_id) REFERENCES email_archives(id) ON DELETE CASCADE
);
```

#### B) Automatische Kontakterkennung

**Workflow bei eingehender E-Mail:**

1. E-Mail wird empfangen
2. System prüft: Existiert Kontakt mit dieser E-Mail?
   - **JA**: E-Mail automatisch zuordnen
   - **NEIN**: Signatur-Parsing starten

3. Signatur-Parsing:
   ```
   E-Mail-Body analysieren
   → Signatur-Block identifizieren (meist nach "--" oder letztem Absatz)
   → Extrahieren: Name, Firma, Position, Telefon, Website
   → Firma in CRM suchen (Name-Matching)
   → Kontakt in CRM suchen (Name-Matching)
   → Vorschlag generieren
   ```

4. User-Interface zeigt Vorschlag:
   ```
   ┌─────────────────────────────────────────┐
   │ Neuer Kontakt erkannt                   │
   ├─────────────────────────────────────────┤
   │ Name:     Marie Dubois                  │
   │ Firma:    Saint-Gobain (bereits im CRM) │
   │ Position: VP Sales EMEA                 │
   │ E-Mail:   marie.dubois@saint-gobain.com │
   │ Telefon:  +33 1 47 62 30 00            │
   │                                         │
   │ [Kontakt anlegen]  [Bearbeiten]  [Ignorieren] │
   └─────────────────────────────────────────┘
   ```

**Technische Umsetzung:**

```typescript
// Signatur-Parsing Service
interface SignatureParseResult {
  name?: string;
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedIn?: string;
  confidence: number; // 0-1
}

async function parseEmailSignature(emailBody: string): Promise<SignatureParseResult> {
  // 1. Signatur-Block identifizieren
  const signatureBlock = extractSignatureBlock(emailBody);
  
  // 2. Mit Regex oder GPT-4 parsen
  const parsed = await parseWithGPT4(signatureBlock);
  
  // 3. Validierung
  const validated = validateParsedData(parsed);
  
  return validated;
}

// Kontakt-Matching
async function findMatchingContact(signature: SignatureParseResult) {
  const db = await getDb();
  
  // 1. Exakte E-Mail-Suche
  let contact = await db.select().from(contacts)
    .where(eq(contacts.email, signature.email))
    .limit(1);
  
  if (contact.length > 0) {
    return { type: 'exact', contact: contact[0] };
  }
  
  // 2. Fuzzy Name-Matching
  const nameMatches = await db.select().from(contacts)
    .where(like(contacts.name, `%${signature.name}%`));
  
  if (nameMatches.length > 0) {
    return { type: 'fuzzy', contacts: nameMatches };
  }
  
  // 3. Firma-Matching
  const companyMatches = await db.select().from(companies)
    .where(like(companies.name, `%${signature.company}%`));
  
  return { type: 'new', suggestion: signature, companyMatches };
}
```

#### C) Flexible Zuordnung

**Anforderung:** Jede E-Mail kann an Kontakt ODER Firma ODER Konzern angehängt werden.

**UI-Konzept:**

```
┌─────────────────────────────────────────┐
│ E-Mail archivieren                      │
├─────────────────────────────────────────┤
│ Von: marie.dubois@saint-gobain.com      │
│ Betreff: Re: Webinar Einladung         │
│                                         │
│ Zuordnen zu:                            │
│ ○ Kontakt  ● Firma  ○ Konzern          │
│                                         │
│ Firma auswählen:                        │
│ [Saint-Gobain Group ▼]                  │
│                                         │
│ Verknüpfung zu Deal (optional):        │
│ [Deal auswählen... ▼]                   │
│                                         │
│ Tags:                                   │
│ [Angebot] [+]                           │
│                                         │
│ Anhänge (2):                            │
│ ✓ Presentation.pdf (2.3 MB)            │
│ ✓ Pricing.xlsx (156 KB)                │
│                                         │
│ [Archivieren]  [Abbrechen]              │
└─────────────────────────────────────────┘
```

### 1.3 E-Mail-Sync-Methoden

#### Option A: Browser-Extension (Empfohlen)

**Vorteile:**
- Funktioniert mit Gmail, Outlook Web, etc.
- Kein Server-Zugriff auf Postfach nötig
- User hat volle Kontrolle

**Technische Umsetzung:**
```javascript
// Chrome Extension: content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'archiveEmail') {
    const emailData = extractEmailFromDOM();
    
    // API Call zu FRIDAY CRM
    fetch('https://friday-crm.com/api/email/archive', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(emailData)
    });
  }
});
```

#### Option B: E-Mail-Forwarding

**Workflow:**
1. User leitet E-Mail weiter an: `archive@friday-crm.com`
2. FRIDAY CRM empfängt E-Mail via SMTP
3. Automatische Verarbeitung + Archivierung

**Technische Umsetzung:**
```typescript
// SMTP Server (Nodemailer)
import { SMTPServer } from 'smtp-server';

const server = new SMTPServer({
  onData(stream, session, callback) {
    const parser = new MailParser();
    stream.pipe(parser);
    
    parser.on('end', async (mail) => {
      // E-Mail verarbeiten
      await archiveEmail({
        from: mail.from.text,
        to: mail.to.text,
        subject: mail.subject,
        body: mail.html || mail.text,
        attachments: mail.attachments
      });
      
      callback();
    });
  }
});
```

#### Option C: IMAP-Sync (Vollautomatisch)

**Workflow:**
1. User verbindet Postfach (IMAP-Zugangsdaten)
2. FRIDAY CRM synct alle E-Mails automatisch
3. User ordnet E-Mails nachträglich zu

**Technische Umsetzung:**
```typescript
// IMAP-Sync mit node-imap
import Imap from 'imap';

async function syncEmails(userId: string) {
  const user = await getUser(userId);
  
  const imap = new Imap({
    user: user.emailAddress,
    password: user.emailPassword, // Verschlüsselt gespeichert
    host: 'imap.gmail.com',
    port: 993,
    tls: true
  });
  
  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err, box) => {
      // Neue E-Mails abrufen
      const fetch = imap.seq.fetch('1:*', {
        bodies: ['HEADER', 'TEXT'],
        struct: true
      });
      
      fetch.on('message', (msg) => {
        // E-Mail verarbeiten und archivieren
      });
    });
  });
  
  imap.connect();
}
```

**Empfehlung:** Kombination aus Browser-Extension (primär) + E-Mail-Forwarding (Backup)

---

## 2. Kalender-Integration

### 2.1 Architektur

```
FRIDAY CRM
    ↓
Microsoft Graph API / Google Calendar API
    ↓
Outlook / Google Calendar
    ↓
Teams / Google Meet
```

### 2.2 Kernfunktionen

#### A) Termin erstellen aus CRM

**Workflow:**
1. User öffnet Kontakt-Detail-Seite
2. Klick auf "Termin vereinbaren"
3. Formular öffnet sich:
   ```
   ┌─────────────────────────────────────────┐
   │ Termin vereinbaren                      │
   ├─────────────────────────────────────────┤
   │ Teilnehmer:                             │
   │ ✓ Marie Dubois (marie.dubois@...)      │
   │ [+ Weitere Teilnehmer]                  │
   │                                         │
   │ Titel:                                  │
   │ [Webinar: Global Building Monitor]     │
   │                                         │
   │ Datum & Uhrzeit:                        │
   │ [25.10.2025] [14:00] - [15:00]         │
   │                                         │
   │ Typ:                                    │
   │ ○ Persönlich  ● Teams Call  ○ Telefon  │
   │                                         │
   │ Beschreibung:                           │
   │ [Demo des Global Building Monitor...]  │
   │                                         │
   │ Erinnerung:                             │
   │ [15 Minuten vorher ▼]                  │
   │                                         │
   │ [Termin senden]  [Abbrechen]            │
   └─────────────────────────────────────────┘
   ```

4. System erstellt:
   - Kalendereintrag in Outlook/Google Calendar
   - Teams-Meeting-Link (falls ausgewählt)
   - E-Mail-Einladung an Teilnehmer
   - Archivierung in CRM

#### B) Teams-Call-Integration

**Technische Umsetzung:**

```typescript
// Microsoft Graph API - Teams Meeting erstellen
async function createTeamsMeeting(appointment: Appointment) {
  const token = await getGraphToken();
  
  const response = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDateTime: appointment.startTime,
      endDateTime: appointment.endTime,
      subject: appointment.title,
      participants: {
        attendees: appointment.attendees.map(a => ({
          identity: { user: { id: a.email } }
        }))
      }
    })
  });
  
  const meeting = await response.json();
  
  return {
    joinUrl: meeting.joinWebUrl,
    meetingId: meeting.id
  };
}

// Kalendereintrag erstellen
async function createCalendarEvent(appointment: Appointment, teamsLink?: string) {
  const token = await getGraphToken();
  
  const event = {
    subject: appointment.title,
    start: {
      dateTime: appointment.startTime,
      timeZone: 'Europe/Berlin'
    },
    end: {
      dateTime: appointment.endTime,
      timeZone: 'Europe/Berlin'
    },
    attendees: appointment.attendees.map(a => ({
      emailAddress: { address: a.email, name: a.name },
      type: 'required'
    })),
    body: {
      contentType: 'HTML',
      content: teamsLink 
        ? `${appointment.description}<br><br><a href="${teamsLink}">Teams-Meeting beitreten</a>`
        : appointment.description
    },
    isOnlineMeeting: !!teamsLink,
    onlineMeetingProvider: teamsLink ? 'teamsForBusiness' : null
  };
  
  await fetch('https://graph.microsoft.com/v1.0/me/calendar/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
}
```

#### C) Termin-Archivierung in CRM

**Database Schema:**

```sql
CREATE TABLE appointments (
  id VARCHAR(64) PRIMARY KEY,
  
  -- Verknüpfungen (flexibel)
  contact_id VARCHAR(64),
  company_id VARCHAR(64),
  corporation_id VARCHAR(64),
  deal_id VARCHAR(64),
  
  -- Termin-Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
  
  -- Typ
  type ENUM('meeting', 'call', 'teams', 'phone', 'other') NOT NULL,
  
  -- Teilnehmer
  attendees JSON, -- [{ email, name, status }]
  
  -- Teams/Meeting-Links
  teams_link VARCHAR(500),
  meeting_id VARCHAR(255),
  
  -- Outlook/Google Calendar IDs
  outlook_event_id VARCHAR(255),
  google_event_id VARCHAR(255),
  
  -- Status
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  
  -- Notizen (nach Termin)
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(64),
  
  INDEX idx_contact (contact_id),
  INDEX idx_start_time (start_time),
  INDEX idx_status (status)
);
```

#### D) Termin-Übersicht in CRM

**UI-Konzept:**

```
┌─────────────────────────────────────────┐
│ Kontakt: Marie Dubois                   │
├─────────────────────────────────────────┤
│ [Übersicht] [E-Mails] [Termine] [Deals] │
├─────────────────────────────────────────┤
│                                         │
│ Termine                                 │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 25.10.2025 14:00-15:00              │ │
│ │ Webinar: Global Building Monitor    │ │
│ │ Teams-Call                          │ │
│ │ [Teams beitreten] [Notizen]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 18.10.2025 10:00-11:00 (Abgeschlossen) │
│ │ Erstgespräch                        │ │
│ │ Telefon                             │ │
│ │ Notizen: "Interesse an Demo..."     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Neuer Termin]                        │
└─────────────────────────────────────────┘
```

### 2.3 Kalender-Sync

**Bidirektionale Synchronisation:**

1. **CRM → Outlook/Google**: Termin in CRM erstellt → automatisch in Kalender
2. **Outlook/Google → CRM**: Termin in Kalender erstellt → automatisch in CRM (falls Teilnehmer = CRM-Kontakt)

**Technische Umsetzung:**

```typescript
// Webhook von Microsoft Graph
app.post('/api/calendar/webhook', async (req, res) => {
  const notification = req.body;
  
  if (notification.changeType === 'created') {
    // Neuer Termin in Outlook erstellt
    const event = await fetchEventFromGraph(notification.resourceData.id);
    
    // Prüfen: Ist Teilnehmer ein CRM-Kontakt?
    const contact = await findContactByEmail(event.attendees[0].emailAddress.address);
    
    if (contact) {
      // Termin in CRM archivieren
      await createAppointment({
        contactId: contact.id,
        title: event.subject,
        startTime: event.start.dateTime,
        endTime: event.end.dateTime,
        outlookEventId: event.id
      });
    }
  }
  
  res.sendStatus(200);
});
```

---

## 3. Chatbot-Integration

### 3.1 Architektur

```
Website (friday-crm.com)
    ↓
Chatbot-Widget (React)
    ↓
FRIDAY CRM Chatbot-API
    ↓
OpenAI GPT-4 (Kontextbezogen)
    ↓
Kontakt-Anlage + Archivierung
```

### 3.2 Kernfunktionen

#### A) Kontextbezogener Chatbot

**Anforderung:** Chatbot kennt den Kontext (aktuelle Seite, Produkt, etc.)

**Beispiel:**

```
User ist auf Seite: /products/global-building-monitor

Chatbot-Kontext:
- Produkt: Global Building Monitor
- Zielgruppe: B2B (Building Materials)
- Sprache: Deutsch (basierend auf Browser)

Chat-Verlauf:
User: "Wie viele Länder deckt ihr ab?"
Bot:  "Der Global Building Monitor deckt 50+ Länder ab, 
       darunter alle europäischen Märkte. Möchten Sie 
       eine Demo vereinbaren?"

User: "Ja, gerne"
Bot:  "Perfekt! Bitte geben Sie Ihre E-Mail-Adresse an, 
       dann sende ich Ihnen Terminvorschläge."

User: "marie.dubois@saint-gobain.com"
Bot:  "Vielen Dank, Marie! Ich habe folgende Termine frei:
       - Morgen, 14:00 Uhr
       - Übermorgen, 10:00 Uhr
       Welcher passt Ihnen?"
```

**Technische Umsetzung:**

```typescript
// Chatbot-Widget (React)
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatContext {
  pageUrl: string;
  pageTitle: string;
  product?: string;
  language: string;
  userAgent: string;
}

// Chatbot-API
app.post('/api/chatbot/message', async (req, res) => {
  const { message, context, sessionId } = req.body;
  
  // GPT-4 mit Kontext
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `Du bist ein Sales-Assistent für Global Building Monitor.
                  Kontext: User ist auf Seite "${context.pageTitle}".
                  Produkt: ${context.product || 'Allgemein'}.
                  Sprache: ${context.language}.
                  
                  Aufgaben:
                  1. Beantworte Fragen zum Produkt
                  2. Erfasse E-Mail-Adresse oder Telefonnummer
                  3. Vereinbare Demo-Termine
                  4. Sei freundlich und professionell`
      },
      ...chatHistory,
      { role: 'user', content: message }
    ]
  });
  
  const botMessage = response.choices[0].message.content;
  
  // E-Mail-Adresse erkannt?
  const emailMatch = botMessage.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    await handleEmailCapture(emailMatch[0], sessionId, context);
  }
  
  res.json({ message: botMessage });
});
```

#### B) Automatische Kontaktanlage

**Workflow:**

1. User gibt E-Mail-Adresse im Chat an
2. System prüft: Existiert Kontakt?
   - **JA**: Chat-Verlauf an bestehenden Kontakt anhängen
   - **NEIN**: Neuen Kontakt anlegen

3. Zusätzliche Daten erfassen:
   ```
   Bot: "Vielen Dank! Darf ich noch Ihren Namen erfragen?"
   User: "Marie Dubois"
   
   Bot: "Und für welches Unternehmen arbeiten Sie?"
   User: "Saint-Gobain"
   
   Bot: "Perfekt! Ich habe Ihre Daten gespeichert."
   ```

4. Kontakt wird angelegt:
   ```typescript
   await createContact({
     name: "Marie Dubois",
     email: "marie.dubois@saint-gobain.com",
     company: "Saint-Gobain", // Automatisch mit Company verknüpfen
     source: "chatbot",
     initialMessage: chatHistory
   });
   ```

#### C) Chat-Archivierung

**Database Schema:**

```sql
CREATE TABLE chat_sessions (
  id VARCHAR(64) PRIMARY KEY,
  
  -- Verknüpfung
  contact_id VARCHAR(64),
  
  -- Session-Daten
  session_id VARCHAR(255) UNIQUE NOT NULL,
  
  -- Kontext
  page_url VARCHAR(500),
  page_title VARCHAR(255),
  product VARCHAR(100),
  language VARCHAR(10),
  user_agent TEXT,
  
  -- Status
  status ENUM('active', 'completed', 'abandoned') DEFAULT 'active',
  
  -- Metadaten
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME,
  message_count INT DEFAULT 0,
  
  -- Lead-Qualifizierung
  email_captured BOOLEAN DEFAULT FALSE,
  phone_captured BOOLEAN DEFAULT FALSE,
  demo_requested BOOLEAN DEFAULT FALSE,
  
  INDEX idx_contact (contact_id),
  INDEX idx_session (session_id),
  INDEX idx_started (started_at)
);

CREATE TABLE chat_messages (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session (session_id)
);
```

#### D) Chatbot-Widget UI

**Design:**

```
┌─────────────────────────────────────────┐
│ 💬 Global Building Monitor              │
│                                    [_][x]│
├─────────────────────────────────────────┤
│                                         │
│  Bot: Hallo! Wie kann ich Ihnen        │
│       helfen?                           │
│                                         │
│       User: Wie viele Länder deckt      │
│             ihr ab?                     │
│                                         │
│  Bot: Der Global Building Monitor       │
│       deckt 50+ Länder ab. Möchten     │
│       Sie eine Demo?                    │
│                                         │
│       User: Ja, gerne                   │
│                                         │
│  Bot: Perfekt! Bitte geben Sie Ihre    │
│       E-Mail-Adresse an.                │
│                                         │
├─────────────────────────────────────────┤
│ [Ihre Nachricht...]              [Send] │
└─────────────────────────────────────────┘
```

**Technische Umsetzung:**

```typescript
// Chatbot-Widget (React)
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    const context = {
      pageUrl: window.location.href,
      pageTitle: document.title,
      language: navigator.language,
      userAgent: navigator.userAgent
    };
    
    const response = await fetch('/api/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        context,
        sessionId: getSessionId()
      })
    });
    
    const data = await response.json();
    
    setMessages([
      ...messages,
      { role: 'user', content: input },
      { role: 'assistant', content: data.message }
    ]);
    
    setInput('');
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-96 h-[500px] bg-white shadow-2xl rounded-lg flex flex-col">
          {/* Header */}
          <div className="bg-black text-white p-4 rounded-t-lg flex justify-between">
            <span>💬 Global Building Monitor</span>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          {/* Input */}
          <div className="p-4 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ihre Nachricht..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button onClick={sendMessage} className="px-4 py-2 bg-black text-white rounded">
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-black text-white rounded-full shadow-lg flex items-center justify-center text-2xl"
        >
          💬
        </button>
      )}
    </div>
  );
}
```

---

## 4. Flexible Dokumenten-Archivierung

### 4.1 Anforderung

**Jedes Dokument** (E-Mail, Termin, Rechnung, Angebot, etc.) muss an **Kontakt ODER Firma ODER Konzern** angehängt werden können.

### 4.2 Universelles Archivierungs-System

**Database Schema:**

```sql
-- Universelle Dokument-Tabelle
CREATE TABLE documents (
  id VARCHAR(64) PRIMARY KEY,
  
  -- Flexible Verknüpfung (mindestens eine muss gesetzt sein)
  contact_id VARCHAR(64),
  company_id VARCHAR(64),
  corporation_id VARCHAR(64),
  deal_id VARCHAR(64),
  
  -- Dokument-Typ
  type ENUM(
    'email', 
    'appointment', 
    'invoice', 
    'quote', 
    'contract', 
    'note', 
    'file',
    'chat'
  ) NOT NULL,
  
  -- Metadaten
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Datei (falls vorhanden)
  filename VARCHAR(255),
  file_size BIGINT,
  content_type VARCHAR(100),
  s3_key VARCHAR(500),
  s3_url VARCHAR(1000),
  
  -- Referenz auf spezifische Tabelle
  reference_type VARCHAR(50), -- z.B. 'email_archives', 'appointments'
  reference_id VARCHAR(64),   -- ID in der spezifischen Tabelle
  
  -- Tags
  tags JSON,
  
  -- Zeitstempel
  document_date DATETIME, -- Datum des Dokuments (z.B. Rechnungsdatum)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(64),
  
  INDEX idx_contact (contact_id),
  INDEX idx_company (company_id),
  INDEX idx_corporation (corporation_id),
  INDEX idx_type (type),
  INDEX idx_date (document_date),
  FULLTEXT INDEX idx_search (title, description)
);
```

### 4.3 UI-Konzept: Universelles Archivierungs-Modal

```
┌─────────────────────────────────────────┐
│ Dokument archivieren                    │
├─────────────────────────────────────────┤
│ Typ:                                    │
│ [E-Mail ▼]                              │
│                                         │
│ Titel:                                  │
│ [Re: Webinar Einladung]                │
│                                         │
│ Zuordnen zu:                            │
│ ● Kontakt  ○ Firma  ○ Konzern          │
│                                         │
│ Kontakt auswählen:                      │
│ [Marie Dubois - Saint-Gobain ▼]        │
│                                         │
│ Verknüpfung zu Deal (optional):        │
│ [Deal auswählen... ▼]                   │
│                                         │
│ Tags:                                   │
│ [Angebot] [Demo] [+]                    │
│                                         │
│ Datum:                                  │
│ [21.10.2025]                            │
│                                         │
│ Datei (optional):                       │
│ [Datei hochladen...]                    │
│                                         │
│ [Archivieren]  [Abbrechen]              │
└─────────────────────────────────────────┘
```

### 4.4 Dokumenten-Übersicht

**Kontakt-Detail-Seite:**

```
┌─────────────────────────────────────────┐
│ Kontakt: Marie Dubois                   │
├─────────────────────────────────────────┤
│ [Übersicht] [Dokumente] [Termine] [Deals] │
├─────────────────────────────────────────┤
│                                         │
│ Dokumente (12)                          │
│                                         │
│ Filter: [Alle ▼] [Suche...]            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📧 Re: Webinar Einladung            │ │
│ │ 21.10.2025 | E-Mail                 │ │
│ │ Tags: Angebot, Demo                 │ │
│ │ [Öffnen] [Herunterladen]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📅 Webinar: Global Building Monitor │ │
│ │ 25.10.2025 | Termin                 │ │
│ │ [Details] [Teams beitreten]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 Angebot_Q4_2025.pdf              │ │
│ │ 18.10.2025 | Angebot | 2.3 MB      │ │
│ │ [Öffnen] [Herunterladen]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Dokument hinzufügen]                 │
└─────────────────────────────────────────┘
```

---

## 5. Implementierungs-Roadmap

### Phase 1: E-Mail-Integration (4 Wochen)
- [ ] Database Schema (email_archives, attachments)
- [ ] E-Mail-Forwarding (SMTP-Server)
- [ ] Browser-Extension (Chrome/Edge)
- [ ] Signatur-Parsing (GPT-4)
- [ ] Kontakterkennung & Matching
- [ ] UI: E-Mail-Archivierung
- [ ] UI: E-Mail-Übersicht in Kontakt-Detail

### Phase 2: Kalender-Integration (3 Wochen)
- [ ] Microsoft Graph API Integration
- [ ] Google Calendar API Integration
- [ ] Database Schema (appointments)
- [ ] Teams-Meeting-Erstellung
- [ ] UI: Termin erstellen
- [ ] UI: Termin-Übersicht
- [ ] Bidirektionale Sync (Webhooks)

### Phase 3: Chatbot-Integration (3 Wochen)
- [ ] Chatbot-Widget (React)
- [ ] Chatbot-API (GPT-4)
- [ ] Database Schema (chat_sessions, messages)
- [ ] Kontextbezogene Antworten
- [ ] E-Mail/Telefon-Erfassung
- [ ] Automatische Kontaktanlage
- [ ] UI: Chat-Archivierung in CRM

### Phase 4: Universelle Dokumenten-Archivierung (2 Wochen)
- [ ] Database Schema (documents)
- [ ] UI: Universelles Archivierungs-Modal
- [ ] UI: Dokumenten-Übersicht
- [ ] Volltext-Suche über alle Dokumente
- [ ] Export-Funktionen (PDF, ZIP)

---

## 6. Technische Anforderungen

### APIs & Services

1. **Microsoft Graph API**
   - Outlook Calendar
   - Teams Meetings
   - E-Mail (optional)

2. **Google APIs**
   - Google Calendar API
   - Google Meet API
   - Gmail API (optional)

3. **OpenAI API**
   - GPT-4 für Signatur-Parsing
   - GPT-4 für Chatbot

4. **Storage**
   - AWS S3 für E-Mail-Anhänge und Dokumente

### Sicherheit

1. **OAuth 2.0**
   - Microsoft Graph: Delegated Permissions
   - Google: OAuth 2.0 Consent

2. **Verschlüsselung**
   - E-Mail-Passwörter: AES-256
   - S3-Uploads: Server-Side Encryption

3. **DSGVO-Konformität**
   - Einwilligung für E-Mail-Sync
   - Recht auf Löschung (alle Dokumente)
   - Datenexport (DSGVO Art. 20)

---

## 7. Kosten-Schätzung

### API-Kosten (monatlich, 100 User)

| Service | Kosten |
|---------|--------|
| Microsoft Graph API | Kostenlos (in M365 enthalten) |
| Google Calendar API | Kostenlos (bis 1M Requests) |
| OpenAI GPT-4 | ~500€ (Signatur-Parsing + Chatbot) |
| AWS S3 | ~50€ (100 GB Storage) |
| **Gesamt** | **~550€/Monat** |

### Entwicklungskosten

| Phase | Aufwand | Kosten (80€/h) |
|-------|---------|----------------|
| Phase 1: E-Mail | 160h | 12.800€ |
| Phase 2: Kalender | 120h | 9.600€ |
| Phase 3: Chatbot | 120h | 9.600€ |
| Phase 4: Dokumente | 80h | 6.400€ |
| **Gesamt** | **480h** | **38.400€** |

---

## 8. Zusammenfassung

**Kernfunktionen:**

1. ✅ E-Mail-Integration mit automatischer Kontakterkennung
2. ✅ Kalender-Integration mit Teams-Calls
3. ✅ Chatbot mit kontextbezogenen Antworten
4. ✅ Universelle Dokumenten-Archivierung
5. ✅ Flexible Zuordnung (Kontakt/Firma/Konzern)

**Technologie-Stack:**

- Frontend: React + TypeScript
- Backend: Node.js + tRPC
- APIs: Microsoft Graph, Google Calendar, OpenAI GPT-4
- Storage: AWS S3
- Database: MySQL

**Implementierungsdauer:** 12 Wochen

**Kosten:** 38.400€ Entwicklung + 550€/Monat Betrieb

---

**Nächste Schritte:**

1. Konzept-Review mit Stakeholdern
2. Priorisierung der Phasen
3. API-Zugänge einrichten (Microsoft, Google, OpenAI)
4. Entwicklung starten

---

**Letzte Aktualisierung:** 21. Oktober 2025

