# FRIDAY CRM - Outlook 2024 / SmarterMail Integration Guide

**Für IT-Abteilung**  
**Ziel:** E-Mail-Archivierung, Kontaktsuche und Termin-Synchronisation zwischen Outlook 2024 (mit SmarterMail Exchange) und FRIDAY CRM

---

## 1. Übersicht der Anforderungen

### 1.1 E-Mail-Archivierung
- **Halbautomatisch:** E-Mails aus Outlook an FRIDAY CRM senden
- **Automatische Kontakterkennung:** E-Mail-Adresse → Kontakt in CRM finden
- **Flexible Zuordnung:** E-Mail an Kontakt, Firma oder Konzern anhängen
- **Anhänge:** Dateien in S3 speichern, Metadaten in Datenbank

### 1.2 Kontaktsuche in Outlook
- **CRM-Kontakte in Outlook durchsuchen**
- **Autovervollständigung** beim Verfassen von E-Mails
- **Kontaktdetails anzeigen** (Firma, Position, Telefon)

### 1.3 Termin-Archivierung
- **Termine aus Outlook → CRM**
- **Zuordnung zu Kontakt/Firma**
- **Bidirektionale Sync** (optional)

---

## 2. Technische Architektur

### 2.1 Komponenten

```
┌─────────────────────────────────────────────────────────────┐
│                    Outlook 2024 Client                       │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Outlook Add-In  │  │  EWS/Graph API   │                 │
│  │  (JavaScript)    │  │  Connector       │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
└───────────┼────────────────────┼──────────────────────────┘
            │                    │
            │ REST API           │ EWS/Graph API
            │                    │
┌───────────▼────────────────────▼──────────────────────────┐
│              SmarterMail Exchange Server                   │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  IMAP/SMTP       │  │  EWS Protocol    │               │
│  │  (Fallback)      │  │  (Primary)       │               │
│  └──────────────────┘  └──────────────────┘               │
└────────────────────────────────────────────────────────────┘
            │
            │ HTTPS REST API
            │
┌───────────▼────────────────────────────────────────────────┐
│                    FRIDAY CRM Server                        │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Email Router    │  │  Contact Matcher │               │
│  │  (tRPC)          │  │  (GPT-4)         │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                          │
│  ┌────────▼─────────────────────▼─────────┐               │
│  │         MySQL Database                 │               │
│  │  (emails, contacts, companies)         │               │
│  └────────────────────────────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────┐                 │
│  │         S3 Storage (Anhänge)         │                 │
│  └──────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Integrationsmethoden

#### **Option A: Outlook Add-In (Empfohlen)**
- **Vorteile:** Native Integration, beste UX
- **Technologie:** Office.js API
- **Deployment:** Über Microsoft 365 Admin Center oder Sideloading

#### **Option B: EWS/Graph API (Server-seitig)**
- **Vorteile:** Keine Client-Installation
- **Technologie:** Exchange Web Services (EWS) oder Microsoft Graph API
- **Deployment:** FRIDAY CRM Server pollt SmarterMail

#### **Option C: IMAP-Sync (Fallback)**
- **Vorteile:** Funktioniert mit jedem E-Mail-Server
- **Technologie:** Node.js IMAP-Client
- **Deployment:** Cron-Job auf FRIDAY CRM Server

---

## 3. Implementierung: E-Mail-Archivierung

### 3.1 Outlook Add-In (Option A)

#### **3.1.1 Add-In Manifest (`manifest.xml`)**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">
  <Id>friday-crm-outlook-addin</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>FRIDAY CRM</ProviderName>
  <DefaultLocale>de-DE</DefaultLocale>
  <DisplayName DefaultValue="FRIDAY CRM"/>
  <Description DefaultValue="E-Mail-Archivierung in FRIDAY CRM"/>
  
  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>
  
  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="1.1"/>
    </Sets>
  </Requirements>
  
  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://46.224.13.250:3000/outlook-addin/taskpane.html"/>
        <RequestedHeight>250</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>
  
  <Permissions>ReadWriteMailbox</Permissions>
  
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/>
  </Rule>
  
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="MailHost">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="MessageReadCommandSurface">
            <OfficeTab id="TabDefault">
              <Group id="msgReadGroup">
                <Label resid="GroupLabel"/>
                <Control xsi:type="Button" id="msgReadOpenPaneButton">
                  <Label resid="TaskpaneButton.Label"/>
                  <Supertip>
                    <Title resid="TaskpaneButton.Label"/>
                    <Description resid="TaskpaneButton.Tooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16"/>
                    <bt:Image size="32" resid="Icon.32x32"/>
                    <bt:Image size="80" resid="Icon.80x80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <SourceLocation resid="Taskpane.Url"/>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="https://46.224.13.250:3000/assets/icon-16.png"/>
        <bt:Image id="Icon.32x32" DefaultValue="https://46.224.13.250:3000/assets/icon-32.png"/>
        <bt:Image id="Icon.80x80" DefaultValue="https://46.224.13.250:3000/assets/icon-80.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Taskpane.Url" DefaultValue="https://46.224.13.250:3000/outlook-addin/taskpane.html"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GroupLabel" DefaultValue="FRIDAY CRM"/>
        <bt:String id="TaskpaneButton.Label" DefaultValue="In CRM archivieren"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="TaskpaneButton.Tooltip" DefaultValue="E-Mail in FRIDAY CRM archivieren"/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
```

#### **3.1.2 Taskpane HTML (`taskpane.html`)**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FRIDAY CRM - E-Mail archivieren</title>
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  <script src="taskpane.js"></script>
  <link rel="stylesheet" href="taskpane.css">
</head>
<body>
  <div id="app">
    <h2>E-Mail in FRIDAY CRM archivieren</h2>
    
    <div id="email-info">
      <p><strong>Von:</strong> <span id="sender"></span></p>
      <p><strong>Betreff:</strong> <span id="subject"></span></p>
      <p><strong>Datum:</strong> <span id="date"></span></p>
    </div>
    
    <div id="contact-match">
      <h3>Erkannter Kontakt</h3>
      <div id="matched-contact">
        <!-- Wird dynamisch gefüllt -->
      </div>
    </div>
    
    <div id="archive-options">
      <h3>Archivieren als</h3>
      <select id="archive-type">
        <option value="contact">Kontakt</option>
        <option value="company">Firma</option>
        <option value="corporation">Konzern</option>
      </select>
      
      <select id="target-entity">
        <!-- Wird dynamisch gefüllt -->
      </select>
    </div>
    
    <button id="archive-btn" onclick="archiveEmail()">Archivieren</button>
    <div id="status"></div>
  </div>
</body>
</html>
```

#### **3.1.3 Taskpane JavaScript (`taskpane.js`)**

```javascript
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    loadEmailData();
  }
});

async function loadEmailData() {
  const item = Office.context.mailbox.item;
  
  // E-Mail-Daten extrahieren
  const sender = item.from.emailAddress;
  const subject = item.subject;
  const date = item.dateTimeCreated;
  
  document.getElementById('sender').textContent = sender;
  document.getElementById('subject').textContent = subject;
  document.getElementById('date').textContent = new Date(date).toLocaleString('de-DE');
  
  // Kontakt in CRM suchen
  const matchedContact = await searchContactByEmail(sender);
  
  if (matchedContact) {
    document.getElementById('matched-contact').innerHTML = `
      <p><strong>${matchedContact.firstName} ${matchedContact.lastName}</strong></p>
      <p>${matchedContact.company} - ${matchedContact.position}</p>
    `;
  } else {
    document.getElementById('matched-contact').innerHTML = `
      <p style="color: orange;">⚠️ Kein Kontakt gefunden. Neuen Kontakt anlegen?</p>
      <button onclick="createContact()">+ Neuer Kontakt</button>
    `;
  }
}

async function searchContactByEmail(email) {
  const response = await fetch('https://46.224.13.250:3000/api/trpc/contacts.searchByEmail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  return data.result?.data;
}

async function archiveEmail() {
  const item = Office.context.mailbox.item;
  
  // E-Mail-Body abrufen
  item.body.getAsync(Office.CoercionType.Html, async (result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const emailData = {
        from: item.from.emailAddress,
        to: item.to.map(r => r.emailAddress),
        cc: item.cc?.map(r => r.emailAddress) || [],
        subject: item.subject,
        body: result.value,
        date: item.dateTimeCreated,
        attachments: []
      };
      
      // Anhänge abrufen
      for (let attachment of item.attachments) {
        const attachmentData = await getAttachmentContent(attachment.id);
        emailData.attachments.push({
          name: attachment.name,
          contentType: attachment.contentType,
          size: attachment.size,
          content: attachmentData
        });
      }
      
      // An CRM senden
      const response = await fetch('https://46.224.13.250:3000/api/trpc/emails.archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          email: emailData,
          targetType: document.getElementById('archive-type').value,
          targetId: document.getElementById('target-entity').value
        })
      });
      
      if (response.ok) {
        document.getElementById('status').innerHTML = '<p style="color: green;">✅ E-Mail archiviert</p>';
      } else {
        document.getElementById('status').innerHTML = '<p style="color: red;">❌ Fehler beim Archivieren</p>';
      }
    }
  });
}

function getAuthToken() {
  // Token aus localStorage oder Session
  return localStorage.getItem('friday_crm_token');
}

async function getAttachmentContent(attachmentId) {
  return new Promise((resolve) => {
    Office.context.mailbox.item.getAttachmentContentAsync(attachmentId, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value.content);
      }
    });
  });
}
```

---

### 3.2 FRIDAY CRM Backend (E-Mail-Archivierung)

#### **3.2.1 Datenbank-Schema**

```sql
-- E-Mails Tabelle
CREATE TABLE emails (
  id VARCHAR(36) PRIMARY KEY,
  from_email VARCHAR(255) NOT NULL,
  to_emails JSON,
  cc_emails JSON,
  subject TEXT,
  body_html LONGTEXT,
  body_text LONGTEXT,
  sent_date DATETIME,
  received_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Zuordnung
  contact_id VARCHAR(36),
  company_id VARCHAR(36),
  corporation_id VARCHAR(36),
  
  -- Metadaten
  message_id VARCHAR(255),
  in_reply_to VARCHAR(255),
  thread_id VARCHAR(255),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (corporation_id) REFERENCES corporations(id),
  
  INDEX idx_from_email (from_email),
  INDEX idx_contact (contact_id),
  INDEX idx_company (company_id),
  INDEX idx_sent_date (sent_date)
);

-- E-Mail-Anhänge
CREATE TABLE email_attachments (
  id VARCHAR(36) PRIMARY KEY,
  email_id VARCHAR(36) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes INT,
  s3_key VARCHAR(500),
  s3_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
  INDEX idx_email (email_id)
);
```

#### **3.2.2 tRPC Router (`emailRouter.ts`)**

```typescript
import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./_core/storage";

export const emailRouter = router({
  // E-Mail archivieren
  archive: protectedProcedure
    .input(z.object({
      email: z.object({
        from: z.string().email(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        subject: z.string(),
        body: z.string(),
        date: z.string(),
        attachments: z.array(z.object({
          name: z.string(),
          contentType: z.string(),
          size: z.number(),
          content: z.string(), // Base64
        })).optional(),
      }),
      targetType: z.enum(['contact', 'company', 'corporation']),
      targetId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // E-Mail in DB speichern
      const emailId = await db.createEmail({
        fromEmail: input.email.from,
        toEmails: JSON.stringify(input.email.to),
        ccEmails: JSON.stringify(input.email.cc || []),
        subject: input.email.subject,
        bodyHtml: input.email.body,
        sentDate: new Date(input.email.date),
        contactId: input.targetType === 'contact' ? input.targetId : null,
        companyId: input.targetType === 'company' ? input.targetId : null,
        corporationId: input.targetType === 'corporation' ? input.targetId : null,
        createdBy: ctx.user.id,
      });
      
      // Anhänge in S3 speichern
      if (input.email.attachments) {
        for (const attachment of input.email.attachments) {
          const buffer = Buffer.from(attachment.content, 'base64');
          const s3Result = await storagePut(
            `emails/${emailId}/${attachment.name}`,
            buffer,
            attachment.contentType
          );
          
          await db.createEmailAttachment({
            emailId,
            filename: attachment.name,
            contentType: attachment.contentType,
            sizeBytes: attachment.size,
            s3Key: s3Result.key,
            s3Url: s3Result.url,
          });
        }
      }
      
      return { success: true, emailId };
    }),
  
  // Kontakt per E-Mail suchen
  searchByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      return await db.getContactByEmail(input.email);
    }),
  
  // E-Mails eines Kontakts abrufen
  listByContact: protectedProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      return await db.getEmailsByContact(input.contactId);
    }),
});
```

---

## 4. Implementierung: Kontaktsuche in Outlook

### 4.1 CRM-Kontakte als Outlook-Kontakte synchronisieren

#### **Option A: CardDAV-Server (Empfohlen)**

FRIDAY CRM stellt CardDAV-Endpoint bereit:

```
https://46.224.13.250:3000/carddav/
```

Outlook 2024 kann CardDAV-Kontakte abonnieren.

#### **Option B: Exchange Web Services (EWS)**

SmarterMail unterstützt EWS. FRIDAY CRM kann Kontakte via EWS in SmarterMail pushen.

```typescript
import { ExchangeService, WebCredentials } from "ews-javascript-api";

async function syncContactToExchange(contact: Contact) {
  const service = new ExchangeService();
  service.Credentials = new WebCredentials("user@domain.com", "password");
  service.Url = new Uri("https://smartermail.domain.com/ews/exchange.asmx");
  
  const ewsContact = new EwsContact(service);
  ewsContact.GivenName = contact.firstName;
  ewsContact.Surname = contact.lastName;
  ewsContact.EmailAddresses[EmailAddressKey.EmailAddress1] = contact.email;
  ewsContact.CompanyName = contact.company;
  ewsContact.JobTitle = contact.position;
  
  await ewsContact.Save();
}
```

---

## 5. Implementierung: Termin-Archivierung

### 5.1 Outlook Add-In für Termine

Ähnlich wie E-Mail-Add-In, aber für `ItemType="Appointment"`.

#### **5.1.1 Termin-Daten extrahieren**

```javascript
async function loadAppointmentData() {
  const item = Office.context.mailbox.item;
  
  const appointmentData = {
    subject: item.subject,
    start: item.start,
    end: item.end,
    location: item.location,
    attendees: item.requiredAttendees.map(a => a.emailAddress),
    organizer: item.organizer.emailAddress,
    body: await getBody(),
  };
  
  // An CRM senden
  await archiveAppointment(appointmentData);
}
```

#### **5.1.2 Backend: Termin archivieren**

```typescript
export const calendarRouter = router({
  archiveAppointment: protectedProcedure
    .input(z.object({
      subject: z.string(),
      start: z.string(),
      end: z.string(),
      location: z.string().optional(),
      attendees: z.array(z.string().email()),
      body: z.string().optional(),
      contactId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db.createActivity({
        activityType: 'meeting',
        activityDate: new Date(input.start),
        subject: input.subject,
        notes: input.body,
        contactId: input.contactId,
        createdBy: ctx.user.id,
      });
    }),
});
```

---

## 6. Deployment-Schritte

### 6.1 Outlook Add-In installieren

1. **Manifest hochladen:**
   - Outlook → Datei → Add-Ins verwalten → Meine Add-Ins → Benutzerdefiniertes Add-In hinzufügen
   - `manifest.xml` auswählen

2. **HTTPS erforderlich:**
   - Add-In muss über HTTPS bereitgestellt werden
   - SSL-Zertifikat für `46.224.13.250` installieren (Let's Encrypt)

3. **CORS konfigurieren:**
   ```typescript
   app.use(cors({
     origin: ['https://outlook.office.com', 'https://outlook.office365.com'],
     credentials: true,
   }));
   ```

### 6.2 SmarterMail EWS aktivieren

1. **Admin-Panel → Protokolle → EWS aktivieren**
2. **Authentifizierung:** OAuth 2.0 oder Basic Auth
3. **Endpoint:** `https://smartermail.domain.com/ews/exchange.asmx`

### 6.3 FRIDAY CRM Backend erweitern

1. **Email-Router hinzufügen** (`server/emailRouter.ts`)
2. **Calendar-Router hinzufügen** (`server/calendarRouter.ts`)
3. **Datenbank-Migration** (neue Tabellen `emails`, `email_attachments`)
4. **S3-Storage konfigurieren** (Anhänge speichern)

---

## 7. Sicherheit & Authentifizierung

### 7.1 OAuth 2.0 für Outlook Add-In

```javascript
async function getAuthToken() {
  const response = await fetch('https://46.224.13.250:3000/api/auth/outlook-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'user@domain.com',
      password: 'password', // Nur beim ersten Login
    }),
  });
  
  const { token } = await response.json();
  localStorage.setItem('friday_crm_token', token);
  return token;
}
```

### 7.2 API-Authentifizierung

- **JWT-Token** für Add-In ↔ FRIDAY CRM
- **EWS-Credentials** für FRIDAY CRM ↔ SmarterMail
- **Verschlüsselung:** Alle Passwörter mit bcrypt hashen

---

## 8. Testing-Checkliste

- [ ] E-Mail aus Outlook archivieren
- [ ] Anhänge werden in S3 gespeichert
- [ ] Kontakt wird automatisch erkannt
- [ ] Neue Kontakte können angelegt werden
- [ ] E-Mails werden in CRM angezeigt
- [ ] Termin aus Outlook archivieren
- [ ] Termin wird an Kontakt angehängt
- [ ] CRM-Kontakte in Outlook durchsuchbar
- [ ] Autovervollständigung funktioniert

---

## 9. Geschätzter Aufwand

### 9.1 Mit Manus (AI-Entwicklung)

| Komponente | Aufwand |
|------------|----------|
| Outlook Add-In (E-Mail) | ~30 Minuten |
| Outlook Add-In (Termin) | ~15 Minuten |
| Backend Email-Router | ~20 Minuten |
| Backend Calendar-Router | ~10 Minuten |
| Kontakt-Sync (CardDAV/EWS) | ~25 Minuten |
| Datenbank-Migration | ~5 Minuten |
| S3-Integration | ~10 Minuten |
| Testing & Bugfixes | ~30 Minuten |
| **Gesamt** | **~2-3 Stunden** |

**Hinweis:** Manus kann Code sehr schnell generieren, aber manuelle Schritte (SSL-Zertifikat, SmarterMail-Konfiguration, Add-In-Deployment) benötigen zusätzliche Zeit.

### 9.2 Mit menschlichem Entwickler (zum Vergleich)

| Komponente | Aufwand (Stunden) |
|------------|-------------------|
| Outlook Add-In (E-Mail) | 16h |
| Outlook Add-In (Termin) | 8h |
| Backend Email-Router | 12h |
| Backend Calendar-Router | 6h |
| Kontakt-Sync (CardDAV/EWS) | 12h |
| Datenbank-Migration | 4h |
| S3-Integration | 4h |
| Testing & Bugfixes | 12h |
| **Gesamt** | **74h (~2 Wochen)** |

**Produktivitätssteigerung:** ~25x schneller mit Manus

---

## 10. Nächste Schritte

1. **SSL-Zertifikat** für `46.224.13.250` installieren
2. **SmarterMail EWS-Zugang** testen
3. **Outlook Add-In Manifest** erstellen und hochladen
4. **FRIDAY CRM Backend** erweitern (Email-Router, DB-Schema)
5. **Pilottest** mit 2-3 Usern
6. **Rollout** an alle User

---

**Kontakt für Rückfragen:**  
IT-Abteilung kann mit Manus direkt arbeiten und dieses Dokument als Basis nutzen.

