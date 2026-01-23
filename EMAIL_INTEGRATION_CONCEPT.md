# E-Mail-Integration Konzept für FRIDAY CRM

**Version:** 1.0  
**Datum:** 29.10.2025  
**Status:** Konzept

---

## 1. Übersicht

### Ziel
Bidirektionale Integration zwischen Outlook/Exchange und FRIDAY CRM mit vollständiger E-Mail-Archivierung und Kontakt-Zuordnung.

### Komponenten
1. **Outlook** (E-Mail-Client der Mitarbeiter)
2. **SmarterMail Exchange Server** (E-Mail-Server)
3. **FRIDAY CRM** (Zentrale Datenbank)
4. **Sync-Service** (Bidirektionale Synchronisation)

---

## 2. Architektur

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Outlook   │ ◄─────► │ SmarterMail      │ ◄─────► │   FRIDAY    │
│   (Client)  │         │ Exchange Server  │         │     CRM     │
└─────────────┘         └──────────────────┘         └─────────────┘
                                 │                            │
                                 │                            │
                                 └────────────────────────────┘
                                    FRIDAY Sync Service
                                    (IMAP/EWS + Webhook)
```

### Datenfluss

**Outlook → FRIDAY:**
- E-Mails werden via IMAP/EWS aus SmarterMail gelesen
- Sync-Service ordnet E-Mails automatisch Kontakten zu
- Anhänge werden in S3 gespeichert
- Metadaten in FRIDAY-Datenbank

**FRIDAY → Outlook:**
- Termine aus FRIDAY-Kalender via CalDAV (bereits implementiert!)
- E-Mail-Vorlagen können aus FRIDAY versendet werden
- Outreach-Kampagnen nutzen SMTP

---

## 3. Kalender-Integration (bereits vorhanden!)

### Status: ✅ Implementiert

**Technologie:** CalDAV (SmarterMail WebDAV)

**Funktionen:**
- Termine aus Outlook werden automatisch in FRIDAY angezeigt
- Bidirektionale Synchronisation
- Team-View: Alle Mitarbeiter-Kalender aggregiert
- User-Prefix: "AGENT32: Meeting" zeigt Zuordnung

**Keine weiteren Änderungen nötig!**

---

## 4. E-Mail-Archivierung (neu zu implementieren)

### 4.1 Technologie-Stack

**Option A: IMAP-basiert (empfohlen)**
```
FRIDAY Sync Service
  ↓
IMAP-Client (node-imap oder imap-simple)
  ↓
SmarterMail IMAP Server
  ↓
Alle Postfächer (agent32@bl2020.com, etc.)
```

**Vorteile:**
- ✅ Standard-Protokoll (IMAP)
- ✅ Einfache Implementierung
- ✅ Funktioniert mit jedem E-Mail-Server
- ✅ Keine Outlook-Abhängigkeit

**Option B: Exchange Web Services (EWS)**
```
FRIDAY Sync Service
  ↓
EWS-Client (node-ews)
  ↓
SmarterMail Exchange Emulation
  ↓
Alle Postfächer
```

**Vorteile:**
- ✅ Mehr Metadaten (Flags, Kategorien, etc.)
- ✅ Push-Notifications möglich
- ⚠️ Komplexer zu implementieren

**Empfehlung:** Start mit **IMAP** (einfacher), später optional EWS.

---

### 4.2 Datenbank-Schema

```sql
-- E-Mail-Archiv
CREATE TABLE emails (
  id VARCHAR(64) PRIMARY KEY,
  messageId VARCHAR(255) UNIQUE NOT NULL,  -- RFC822 Message-ID
  threadId VARCHAR(64),                     -- Conversation-Threading
  
  -- Absender/Empfänger
  fromAddress VARCHAR(320) NOT NULL,
  fromName VARCHAR(255),
  toAddresses TEXT,                         -- JSON Array
  ccAddresses TEXT,                         -- JSON Array
  bccAddresses TEXT,                        -- JSON Array
  
  -- Inhalt
  subject VARCHAR(500),
  bodyText TEXT,                            -- Plain Text
  bodyHtml TEXT,                            -- HTML
  
  -- Metadaten
  sentAt TIMESTAMP NOT NULL,
  receivedAt TIMESTAMP NOT NULL,
  direction ENUM('inbound', 'outbound') NOT NULL,
  
  -- IMAP-Daten
  imapUid INT,
  imapMailbox VARCHAR(255),
  imapFlags TEXT,                           -- JSON Array: ["\\Seen", "\\Flagged"]
  
  -- Zuordnung
  contactId VARCHAR(64),                    -- FK zu contacts
  companyId VARCHAR(64),                    -- FK zu companies
  corporationId VARCHAR(64),                -- FK zu corporations
  dealId VARCHAR(64),                       -- FK zu deals
  userId VARCHAR(64) NOT NULL,              -- FK zu users (Postfach-Besitzer)
  
  -- Status
  isArchived BOOLEAN DEFAULT true,
  isDeleted BOOLEAN DEFAULT false,
  
  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_messageId (messageId),
  INDEX idx_contactId (contactId),
  INDEX idx_companyId (companyId),
  INDEX idx_userId (userId),
  INDEX idx_sentAt (sentAt),
  INDEX idx_direction (direction),
  FOREIGN KEY (contactId) REFERENCES contacts(id),
  FOREIGN KEY (companyId) REFERENCES companies(id),
  FOREIGN KEY (corporationId) REFERENCES corporations(id),
  FOREIGN KEY (dealId) REFERENCES deals(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- E-Mail-Anhänge
CREATE TABLE email_attachments (
  id VARCHAR(64) PRIMARY KEY,
  emailId VARCHAR(64) NOT NULL,
  
  -- Datei-Info
  filename VARCHAR(500) NOT NULL,
  mimeType VARCHAR(255),
  size INT NOT NULL,                        -- Bytes
  
  -- S3-Storage
  s3Key VARCHAR(500) NOT NULL,              -- S3 Object Key
  s3Url VARCHAR(1000),                      -- Public URL (optional)
  
  -- Metadaten
  contentId VARCHAR(255),                   -- Für inline images
  isInline BOOLEAN DEFAULT false,
  
  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_emailId (emailId),
  FOREIGN KEY (emailId) REFERENCES emails(id) ON DELETE CASCADE
);

-- E-Mail-Kontakt-Zuordnung (Many-to-Many)
CREATE TABLE email_contacts (
  emailId VARCHAR(64) NOT NULL,
  contactId VARCHAR(64) NOT NULL,
  role ENUM('from', 'to', 'cc', 'bcc') NOT NULL,
  
  PRIMARY KEY (emailId, contactId, role),
  FOREIGN KEY (emailId) REFERENCES emails(id) ON DELETE CASCADE,
  FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Sync-Status (pro User/Postfach)
CREATE TABLE email_sync_status (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL UNIQUE,
  
  -- IMAP-Status
  lastSyncAt TIMESTAMP,
  lastImapUid INT DEFAULT 0,                -- Letzter synchronisierter UID
  lastError TEXT,
  
  -- Statistiken
  totalEmails INT DEFAULT 0,
  lastEmailAt TIMESTAMP,
  
  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

### 4.3 Automatische Kontakt-Zuordnung

**Algorithmus:**

```typescript
async function assignEmailToContact(email: Email): Promise<void> {
  // 1. Exakte E-Mail-Adresse-Suche
  const contact = await findContactByEmail(email.fromAddress);
  if (contact) {
    email.contactId = contact.id;
    email.companyId = contact.companyId;
    email.corporationId = contact.corporationId;
    return;
  }
  
  // 2. Domain-basierte Zuordnung
  const domain = extractDomain(email.fromAddress);
  const company = await findCompanyByDomain(domain);
  if (company) {
    email.companyId = company.id;
    email.corporationId = company.corporationId;
    
    // Optional: Neuen Kontakt vorschlagen
    await createContactSuggestion({
      email: email.fromAddress,
      name: email.fromName,
      companyId: company.id,
      source: 'email_archive'
    });
    return;
  }
  
  // 3. Manuelle Zuordnung erforderlich
  email.contactId = null;
  email.companyId = null;
  await createManualReviewTask(email);
}
```

**Zusätzliche Regeln:**
- Wenn Empfänger = bekannter Kontakt → auch zuordnen
- Thread-basierte Zuordnung: Alle E-Mails im Thread bekommen gleiche Zuordnung
- Deal-Zuordnung: Wenn Betreff Deal-Nummer enthält (z.B. "#DEAL-123")

---

### 4.4 Sync-Service Architektur

**Komponente:** `emailSyncDaemon.ts`

**Funktionsweise:**
1. **Polling-basiert** (alle 60 Sekunden)
2. Lädt alle FRIDAY-User mit E-Mail-Credentials
3. Verbindet zu jedem Postfach via IMAP
4. Lädt neue E-Mails (seit letztem Sync)
5. Speichert E-Mails + Anhänge in Datenbank/S3
6. Ordnet E-Mails automatisch zu
7. Aktualisiert Sync-Status

**Pseudo-Code:**

```typescript
// server/emailSyncDaemon.ts
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { storagePut } from './storage';

async function syncAllMailboxes() {
  const users = await getAllUsersWithEmail();
  
  for (const user of users) {
    try {
      await syncUserMailbox(user);
    } catch (error) {
      console.error(`Failed to sync mailbox for ${user.email}:`, error);
      await updateSyncStatus(user.id, { lastError: error.message });
    }
  }
}

async function syncUserMailbox(user: User) {
  const imap = new Imap({
    user: user.email,
    password: decryptPassword(user.passwordHash),
    host: 'mail.bl2020.com',
    port: 993,
    tls: true,
  });
  
  imap.connect();
  
  imap.once('ready', async () => {
    // Öffne INBOX
    imap.openBox('INBOX', false, async (err, box) => {
      if (err) throw err;
      
      // Hole letzten Sync-Status
      const syncStatus = await getSyncStatus(user.id);
      const lastUid = syncStatus.lastImapUid || 0;
      
      // Suche neue E-Mails
      const searchCriteria = [['UID', `${lastUid + 1}:*`]];
      
      imap.search(searchCriteria, (err, uids) => {
        if (err) throw err;
        if (uids.length === 0) return;
        
        const fetch = imap.fetch(uids, {
          bodies: '',
          struct: true,
        });
        
        fetch.on('message', (msg, seqno) => {
          msg.on('body', async (stream, info) => {
            const parsed = await simpleParser(stream);
            
            // Speichere E-Mail
            const email = await saveEmail({
              messageId: parsed.messageId,
              fromAddress: parsed.from.value[0].address,
              fromName: parsed.from.value[0].name,
              toAddresses: parsed.to?.value.map(t => t.address),
              subject: parsed.subject,
              bodyText: parsed.text,
              bodyHtml: parsed.html,
              sentAt: parsed.date,
              receivedAt: new Date(),
              direction: 'inbound',
              userId: user.id,
              imapUid: info.attrs.uid,
            });
            
            // Speichere Anhänge
            for (const attachment of parsed.attachments) {
              const s3Result = await storagePut(
                `emails/${email.id}/${attachment.filename}`,
                attachment.content,
                attachment.contentType
              );
              
              await saveAttachment({
                emailId: email.id,
                filename: attachment.filename,
                mimeType: attachment.contentType,
                size: attachment.size,
                s3Key: s3Result.key,
                s3Url: s3Result.url,
              });
            }
            
            // Automatische Zuordnung
            await assignEmailToContact(email);
          });
        });
        
        fetch.once('end', async () => {
          // Update Sync-Status
          const maxUid = Math.max(...uids);
          await updateSyncStatus(user.id, {
            lastSyncAt: new Date(),
            lastImapUid: maxUid,
            totalEmails: syncStatus.totalEmails + uids.length,
          });
          
          imap.end();
        });
      });
    });
  });
}

// Daemon: Läuft kontinuierlich
setInterval(syncAllMailboxes, 60000); // Alle 60 Sekunden
```

---

### 4.5 Deployment

**Prozess:**
1. Daemon läuft als separater Node.js-Prozess
2. PM2 oder systemd für Auto-Restart
3. Logs in `email-sync.log`

**Start-Befehl:**
```bash
node dist/emailSyncDaemon.js > email-sync.log 2>&1 &
```

---

## 5. Frontend-Integration

### 5.1 E-Mail-Ansicht pro Kontakt

**Seite:** `/contacts/:id` (Contact Detail)

**Neue Komponente:** `EmailTimeline.tsx`

```tsx
<div className="space-y-4">
  <h3 className="text-lg font-semibold">E-Mail-Verlauf</h3>
  
  {emails.map(email => (
    <div key={email.id} className="border rounded p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold">{email.fromName}</span>
          <span className="text-sm text-gray-500 ml-2">
            {email.fromAddress}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {formatDate(email.sentAt)}
        </span>
      </div>
      
      <div className="mt-2">
        <h4 className="font-medium">{email.subject}</h4>
      </div>
      
      <div className="mt-2 text-sm text-gray-700">
        {email.bodyText.substring(0, 200)}...
      </div>
      
      {email.attachments.length > 0 && (
        <div className="mt-2 flex gap-2">
          {email.attachments.map(att => (
            <a
              key={att.id}
              href={att.s3Url}
              className="text-sm text-blue-600 hover:underline"
              target="_blank"
            >
              📎 {att.filename}
            </a>
          ))}
        </div>
      )}
      
      <button
        onClick={() => openEmailDetail(email.id)}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        Vollständige E-Mail anzeigen
      </button>
    </div>
  ))}
</div>
```

### 5.2 E-Mail-Detail-Dialog

**Komponente:** `EmailDetailDialog.tsx`

**Features:**
- Vollständiger E-Mail-Body (HTML + Plain Text Toggle)
- Alle Anhänge mit Download-Links
- Zuordnung bearbeiten (Kontakt, Firma, Deal)
- Thread-Ansicht (alle E-Mails im Conversation)
- Antworten-Button (öffnet Outlook via `mailto:`)

### 5.3 E-Mail-Suche

**Neue Seite:** `/emails`

**Features:**
- Volltextsuche (Betreff, Body, Absender)
- Filter: Datum, Absender, Empfänger, mit/ohne Anhänge
- Sortierung: Datum, Relevanz
- Bulk-Aktionen: Zuordnen, Löschen, Exportieren

---

## 6. Outbound-E-Mails (aus FRIDAY versenden)

### 6.1 SMTP-Integration

**Bereits vorhanden:** Outreach Agent nutzt SMTP

**Erweiterung:**
- E-Mails, die aus FRIDAY versendet werden, auch archivieren
- In `emails` Tabelle mit `direction='outbound'` speichern
- Automatisch mit Kontakt/Deal verknüpfen

### 6.2 Outlook-Integration (optional)

**Option A: mailto: Links**
```tsx
<a href={`mailto:${contact.email}?subject=Angebot&body=Hallo...`}>
  E-Mail senden
</a>
```

**Option B: Outlook Add-In (fortgeschritten)**
- FRIDAY als Outlook Add-In
- Kontakt-Info direkt in Outlook-Sidebar
- E-Mail-Vorlagen aus FRIDAY einfügen
- Automatische Archivierung beim Senden

**Empfehlung:** Start mit **mailto:** (einfach), später Add-In.

---

## 7. Implementierungs-Phasen

### Phase 1: E-Mail-Archivierung (2-3 Wochen)
- [x] Datenbank-Schema erstellen
- [ ] IMAP-Client implementieren
- [ ] Email Sync Daemon entwickeln
- [ ] Anhänge in S3 speichern
- [ ] Automatische Kontakt-Zuordnung
- [ ] Deployment auf Hetzner

### Phase 2: Frontend-Integration (1-2 Wochen)
- [ ] EmailTimeline Komponente
- [ ] EmailDetailDialog
- [ ] E-Mail-Suche Seite
- [ ] Zuordnungs-UI (manuell)
- [ ] Anhänge-Download

### Phase 3: Outbound-Integration (1 Woche)
- [ ] SMTP-Versand archivieren
- [ ] E-Mail-Vorlagen aus FRIDAY
- [ ] mailto: Links in UI
- [ ] Tracking (geöffnet, geklickt)

### Phase 4: Erweiterte Features (optional)
- [ ] Thread-Ansicht (Conversations)
- [ ] E-Mail-Kategorien/Tags
- [ ] Automatische Antwort-Vorschläge (GPT-4)
- [ ] Outlook Add-In
- [ ] Push-Notifications (EWS)

---

## 8. Technische Anforderungen

### Dependencies

```json
{
  "dependencies": {
    "imap": "^0.8.19",
    "mailparser": "^3.6.5",
    "node-imap": "^0.9.6",
    "imap-simple": "^5.1.0"
  }
}
```

### Environment Variables

```env
# E-Mail-Sync
EMAIL_SYNC_ENABLED=true
EMAIL_SYNC_INTERVAL=60000  # 60 Sekunden
IMAP_HOST=mail.bl2020.com
IMAP_PORT=993
IMAP_TLS=true

# S3 für Anhänge (bereits vorhanden)
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_S3_BUCKET=...
```

---

## 9. Sicherheit & Datenschutz

### Verschlüsselung
- ✅ Passwörter: AES-256-GCM (bereits implementiert)
- ✅ Anhänge: S3 mit Server-Side Encryption
- ✅ E-Mail-Body: Datenbank-Verschlüsselung (optional)

### Zugriffskontrolle
- User sieht nur eigene E-Mails (userId-Filter)
- Admin kann alle E-Mails sehen
- Staff+ sieht nur zugeordnete Kontakte

### DSGVO-Compliance
- Löschfunktion für E-Mails
- Anonymisierung nach X Jahren
- Export-Funktion (Datenauskunft)

---

## 10. Performance-Optimierung

### Datenbank-Indizes
- `idx_messageId`: Duplikat-Erkennung
- `idx_contactId`: Schnelle Kontakt-Abfrage
- `idx_sentAt`: Zeitbasierte Sortierung
- `idx_userId`: User-Filter

### Caching
- E-Mail-Liste: Redis-Cache (5 Min)
- Anhänge: S3 CloudFront CDN
- Volltextsuche: Elasticsearch (optional)

### Batch-Processing
- Sync in Batches (100 E-Mails pro Durchlauf)
- Parallele Verarbeitung (5 Postfächer gleichzeitig)
- Rate-Limiting (max. 10 Requests/Sekunde zu IMAP)

---

## 11. Monitoring & Logging

### Metriken
- E-Mails synchronisiert (pro User)
- Sync-Fehler (Rate)
- Anhänge-Größe (Total)
- Zuordnungs-Rate (automatisch vs. manuell)

### Logs
- `email-sync.log`: Sync-Aktivität
- `email-errors.log`: Fehler
- Dashboard: Sync-Status pro User

---

## 12. Kosten-Schätzung

### Entwicklung
- Phase 1: 80-120 Stunden (E-Mail-Archivierung)
- Phase 2: 40-60 Stunden (Frontend)
- Phase 3: 20-30 Stunden (Outbound)
- **Total: 140-210 Stunden**

### Betrieb (monatlich)
- S3 Storage: ~10 GB Anhänge = ~$0.23/Monat
- Server-Last: +10% CPU/RAM (vernachlässigbar)
- **Total: <$1/Monat**

---

## 13. Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| IMAP-Server überlastet | Mittel | Hoch | Rate-Limiting, Batch-Processing |
| Duplikate in Archiv | Mittel | Mittel | Message-ID Unique Constraint |
| Anhänge zu groß | Niedrig | Mittel | Größen-Limit (25 MB), Warnung |
| Falsche Zuordnung | Hoch | Mittel | Manuelle Review-Queue |
| Sync-Daemon abstürzt | Mittel | Hoch | PM2 Auto-Restart, Monitoring |

---

## 14. Alternativen

### Option: Nylas API
- **Pro:** Fertige E-Mail-API (IMAP/Exchange abstrahiert)
- **Contra:** Kosten ($9/User/Monat), Vendor Lock-in
- **Empfehlung:** Nur wenn IMAP nicht funktioniert

### Option: Microsoft Graph API
- **Pro:** Direkte Outlook-Integration
- **Contra:** Nur für Microsoft 365 (nicht SmarterMail)
- **Empfehlung:** Nicht anwendbar

---

## 15. Zusammenfassung

### ✅ Empfohlene Lösung

**Architektur:**
- Kalender: CalDAV (bereits implementiert) ✅
- E-Mail-Archivierung: IMAP-basierter Sync-Daemon
- Anhänge: S3 Storage
- Frontend: EmailTimeline + Detail-Dialog

**Vorteile:**
- ✅ Standard-Protokolle (IMAP, SMTP)
- ✅ Server-unabhängig (funktioniert mit jedem E-Mail-Server)
- ✅ Keine Outlook-Abhängigkeit
- ✅ Bidirektionale Sync (Kalender bereits, E-Mails incoming)
- ✅ Vollständige Archivierung mit Anhängen
- ✅ Automatische Kontakt-Zuordnung

**Nächste Schritte:**
1. Datenbank-Schema in `schema.ts` hinzufügen
2. `emailSyncDaemon.ts` implementieren
3. Frontend-Komponenten entwickeln
4. Deployment auf Hetzner
5. Testing mit agent32@bl2020.com

---

**Fragen? Änderungswünsche?**

Ich kann direkt mit der Implementierung starten, sobald du grünes Licht gibst!

