# FRIDAY CRM - Konzept: E-Mail-Rücklauf-Verarbeitung

**Version:** 1.0  
**Datum:** 21. Oktober 2025  
**Zweck:** Automatische Pflege der Kontaktdaten durch E-Mail-Rücklauf-Analyse

---

## Überblick

**Problem:** E-Mail-Adressen werden ungültig durch:
- Mitarbeiter verlässt Unternehmen
- E-Mail-Adresse geändert
- Postfach voll / deaktiviert
- Domain nicht mehr aktiv

**Lösung:** Automatische Analyse von E-Mail-Rückläufen (Bounces, Out-of-Office, Auto-Replies) mit halbautomatischen Aktionen.

---

## 1. Typen von E-Mail-Rückläufen

### 1.1 Hard Bounces (Permanent)

**Bedeutung:** E-Mail-Adresse existiert nicht (mehr)

**Beispiele:**
```
550 5.1.1 User unknown
550 5.1.1 <user@example.com>: Recipient address rejected
554 5.7.1 <user@example.com>: Relay access denied
```

**Ursachen:**
- Mitarbeiter hat Unternehmen verlassen
- E-Mail-Adresse falsch geschrieben
- Domain existiert nicht mehr

**Aktion in CRM:**
- Kontakt-Status: `invalid_email`
- Automatische Benachrichtigung an Verantwortlichen
- Vorschlag: Neuen Ansprechpartner suchen (Hunter Agent)

### 1.2 Soft Bounces (Temporär)

**Bedeutung:** E-Mail konnte temporär nicht zugestellt werden

**Beispiele:**
```
452 4.2.2 Mailbox full
450 4.1.1 <user@example.com>: Recipient address rejected: Greylisted
421 4.3.2 Service not available
```

**Ursachen:**
- Postfach voll
- Server temporär nicht erreichbar
- Greylisting

**Aktion in CRM:**
- Kontakt-Status: `email_warning` (nach 3 Soft Bounces)
- Automatischer Retry nach 24h
- Nach 7 Tagen: Benachrichtigung an Verantwortlichen

### 1.3 Out-of-Office (OOO)

**Bedeutung:** Mitarbeiter ist abwesend

**Beispiele:**
```
Subject: Automatic reply: Re: Webinar Einladung

Vielen Dank für Ihre E-Mail. Ich bin vom 20.10. bis 27.10. 
nicht im Büro. In dringenden Fällen wenden Sie sich bitte an:

Marie Dubois (marie.dubois@saint-gobain.com)
Tel: +33 1 47 62 30 00
```

**Aktion in CRM:**
- Kontakt-Status: `out_of_office` (temporär)
- Abwesenheitszeitraum erfassen
- Alternative Ansprechpartner extrahieren
- Automatische Erinnerung nach Rückkehr

### 1.4 Mitarbeiter hat Unternehmen verlassen

**Beispiele:**
```
Subject: Automatic reply: User no longer with company

Thank you for your email. John Smith is no longer with 
Saint-Gobain. For inquiries regarding market research, 
please contact:

Marie Dubois (marie.dubois@saint-gobain.com)
VP Sales EMEA
```

**Aktion in CRM:**
- Kontakt-Status: `left_company`
- Nachfolger extrahieren (Name, E-Mail, Position)
- Vorschlag: Neuen Kontakt anlegen
- Alten Kontakt archivieren (nicht löschen!)

### 1.5 E-Mail-Adresse geändert

**Beispiele:**
```
Subject: Email address changed

This email address is no longer in use. 
Please update your records to:

john.smith@new-company.com
```

**Aktion in CRM:**
- Neue E-Mail-Adresse extrahieren
- Vorschlag: Kontakt aktualisieren
- Alte E-Mail als "veraltet" markieren

---

## 2. Technische Architektur

### 2.1 E-Mail-Rücklauf-Pipeline

```
E-Mail-Versand (SendGrid/AWS SES)
    ↓
Bounce/Auto-Reply empfangen
    ↓
FRIDAY CRM Bounce-Handler
    ↓
Klassifizierung (GPT-4)
    ↓
Aktion vorschlagen
    ↓
User-Benachrichtigung
    ↓
Halbautomatische Bestätigung
    ↓
CRM-Update
```

### 2.2 Bounce-Handler Service

**Technische Umsetzung:**

```typescript
// Bounce-Handler
interface BounceEvent {
  id: string;
  contactId: string;
  emailAddress: string;
  
  // Bounce-Details
  type: 'hard_bounce' | 'soft_bounce' | 'out_of_office' | 'left_company' | 'email_changed' | 'other';
  bounceCode: string;      // z.B. "550 5.1.1"
  bounceMessage: string;   // Vollständige Fehlermeldung
  
  // Auto-Reply-Inhalt (falls vorhanden)
  autoReplySubject?: string;
  autoReplyBody?: string;
  
  // Extrahierte Daten
  extractedData?: {
    newEmail?: string;
    alternativeContact?: {
      name: string;
      email: string;
      position?: string;
      phone?: string;
    };
    outOfOfficeUntil?: Date;
  };
  
  // Status
  status: 'pending' | 'processed' | 'ignored';
  suggestedAction: string;
  
  timestamp: Date;
  processedAt?: Date;
  processedBy?: string;
}
```

**Database Schema:**

```sql
CREATE TABLE email_bounces (
  id VARCHAR(64) PRIMARY KEY,
  contact_id VARCHAR(64) NOT NULL,
  email_address VARCHAR(320) NOT NULL,
  
  -- Bounce-Typ
  type ENUM(
    'hard_bounce', 
    'soft_bounce', 
    'out_of_office', 
    'left_company', 
    'email_changed',
    'other'
  ) NOT NULL,
  
  -- Details
  bounce_code VARCHAR(50),
  bounce_message TEXT,
  
  -- Auto-Reply (falls vorhanden)
  auto_reply_subject VARCHAR(500),
  auto_reply_body TEXT,
  
  -- Extrahierte Daten
  extracted_data JSON,
  
  -- Status
  status ENUM('pending', 'processed', 'ignored') DEFAULT 'pending',
  suggested_action TEXT,
  
  -- Zeitstempel
  timestamp DATETIME NOT NULL,
  processed_at DATETIME,
  processed_by VARCHAR(64),
  
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  INDEX idx_contact (contact_id),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_timestamp (timestamp)
);

-- Bounce-Counter für Kontakte
ALTER TABLE contacts ADD COLUMN bounce_count INT DEFAULT 0;
ALTER TABLE contacts ADD COLUMN last_bounce_at DATETIME;
ALTER TABLE contacts ADD COLUMN email_status ENUM(
  'valid', 
  'warning',      -- Soft Bounces
  'invalid',      -- Hard Bounce
  'out_of_office',
  'left_company'
) DEFAULT 'valid';
```

### 2.3 SendGrid/AWS SES Integration

**SendGrid Webhook:**

```typescript
// Webhook-Endpoint für SendGrid
app.post('/api/email/webhook/sendgrid', async (req, res) => {
  const events = req.body;
  
  for (const event of events) {
    if (event.event === 'bounce') {
      await handleBounce({
        emailAddress: event.email,
        bounceCode: event.status,
        bounceMessage: event.reason,
        type: event.type === 'bounce' ? 'hard_bounce' : 'soft_bounce',
        timestamp: new Date(event.timestamp * 1000)
      });
    }
  }
  
  res.sendStatus(200);
});

// Bounce-Verarbeitung
async function handleBounce(bounceData: any) {
  const db = await getDb();
  
  // 1. Kontakt finden
  const contact = await db.select().from(contacts)
    .where(eq(contacts.email, bounceData.emailAddress))
    .limit(1);
  
  if (!contact.length) return;
  
  const contactId = contact[0].id;
  
  // 2. Bounce-Counter erhöhen
  await db.update(contacts)
    .set({
      bounceCount: sql`bounce_count + 1`,
      lastBounceAt: new Date()
    })
    .where(eq(contacts.id, contactId));
  
  // 3. Bounce-Event speichern
  await db.insert(emailBounces).values({
    id: crypto.randomUUID(),
    contactId,
    emailAddress: bounceData.emailAddress,
    type: bounceData.type,
    bounceCode: bounceData.bounceCode,
    bounceMessage: bounceData.bounceMessage,
    timestamp: bounceData.timestamp,
    status: 'pending'
  });
  
  // 4. Bei Hard Bounce: Kontakt-Status aktualisieren
  if (bounceData.type === 'hard_bounce') {
    await db.update(contacts)
      .set({ emailStatus: 'invalid' })
      .where(eq(contacts.id, contactId));
    
    // Benachrichtigung senden
    await notifyUserAboutBounce(contactId, bounceData);
  }
  
  // 5. Bei 3+ Soft Bounces: Warnung
  if (contact[0].bounceCount >= 3) {
    await db.update(contacts)
      .set({ emailStatus: 'warning' })
      .where(eq(contacts.id, contactId));
    
    await notifyUserAboutBounce(contactId, bounceData);
  }
}
```

**AWS SES Webhook (ähnlich):**

```typescript
app.post('/api/email/webhook/ses', async (req, res) => {
  const message = JSON.parse(req.body.Message);
  
  if (message.notificationType === 'Bounce') {
    const bounce = message.bounce;
    
    for (const recipient of bounce.bouncedRecipients) {
      await handleBounce({
        emailAddress: recipient.emailAddress,
        bounceCode: recipient.status,
        bounceMessage: recipient.diagnosticCode,
        type: bounce.bounceType === 'Permanent' ? 'hard_bounce' : 'soft_bounce',
        timestamp: new Date(message.mail.timestamp)
      });
    }
  }
  
  res.sendStatus(200);
});
```

---

## 3. Auto-Reply-Analyse mit GPT-4

### 3.1 Intelligente Klassifizierung

**Problem:** Auto-Replies haben verschiedene Formate und Sprachen.

**Lösung:** GPT-4 analysiert Auto-Reply und extrahiert relevante Daten.

**Technische Umsetzung:**

```typescript
interface AutoReplyAnalysis {
  type: 'out_of_office' | 'left_company' | 'email_changed' | 'other';
  confidence: number;
  
  // Out-of-Office
  absentUntil?: Date;
  alternativeContact?: {
    name: string;
    email: string;
    position?: string;
    phone?: string;
  };
  
  // Left Company
  successor?: {
    name: string;
    email: string;
    position?: string;
    phone?: string;
  };
  
  // Email Changed
  newEmail?: string;
  
  // Rohdaten
  rawSubject: string;
  rawBody: string;
}

async function analyzeAutoReply(
  subject: string, 
  body: string
): Promise<AutoReplyAnalysis> {
  
  const prompt = `Analysiere diese Auto-Reply-E-Mail und extrahiere strukturierte Daten.

Subject: ${subject}

Body:
${body}

Aufgaben:
1. Klassifiziere den Typ: out_of_office, left_company, email_changed, oder other
2. Extrahiere relevante Daten (Datum, alternative Kontakte, neue E-Mail)
3. Gib das Ergebnis als JSON zurück

JSON-Format:
{
  "type": "out_of_office" | "left_company" | "email_changed" | "other",
  "confidence": 0.0-1.0,
  "absentUntil": "YYYY-MM-DD" (optional),
  "alternativeContact": {
    "name": "...",
    "email": "...",
    "position": "...",
    "phone": "..."
  } (optional),
  "successor": {
    "name": "...",
    "email": "...",
    "position": "...",
    "phone": "..."
  } (optional),
  "newEmail": "..." (optional)
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Du bist ein Experte für E-Mail-Analyse.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });
  
  const analysis = JSON.parse(response.choices[0].message.content);
  
  return {
    ...analysis,
    rawSubject: subject,
    rawBody: body
  };
}
```

**Beispiel-Analyse:**

**Input:**
```
Subject: Automatic reply: Re: Webinar Einladung

Vielen Dank für Ihre E-Mail. Ich bin vom 20.10. bis 27.10. 
nicht im Büro. In dringenden Fällen wenden Sie sich bitte an:

Marie Dubois
VP Sales EMEA
marie.dubois@saint-gobain.com
Tel: +33 1 47 62 30 00
```

**Output:**
```json
{
  "type": "out_of_office",
  "confidence": 0.95,
  "absentUntil": "2025-10-27",
  "alternativeContact": {
    "name": "Marie Dubois",
    "email": "marie.dubois@saint-gobain.com",
    "position": "VP Sales EMEA",
    "phone": "+33 1 47 62 30 00"
  }
}
```

### 3.2 Verarbeitung nach Typ

```typescript
async function processAutoReply(
  contactId: string,
  analysis: AutoReplyAnalysis
) {
  const db = await getDb();
  
  switch (analysis.type) {
    case 'out_of_office':
      // 1. Kontakt-Status temporär setzen
      await db.update(contacts)
        .set({ 
          emailStatus: 'out_of_office',
          outOfOfficeUntil: analysis.absentUntil
        })
        .where(eq(contacts.id, contactId));
      
      // 2. Alternative Kontakte vorschlagen
      if (analysis.alternativeContact) {
        await createContactSuggestion({
          type: 'alternative_contact',
          contactId,
          suggestedData: analysis.alternativeContact,
          reason: `Out-of-Office bis ${analysis.absentUntil}`
        });
      }
      
      // 3. Erinnerung nach Rückkehr
      if (analysis.absentUntil) {
        await scheduleFollowUp(contactId, analysis.absentUntil);
      }
      break;
    
    case 'left_company':
      // 1. Kontakt-Status setzen
      await db.update(contacts)
        .set({ 
          emailStatus: 'left_company',
          leftCompanyAt: new Date()
        })
        .where(eq(contacts.id, contactId));
      
      // 2. Nachfolger vorschlagen
      if (analysis.successor) {
        await createContactSuggestion({
          type: 'successor',
          contactId,
          suggestedData: analysis.successor,
          reason: 'Mitarbeiter hat Unternehmen verlassen'
        });
      }
      
      // 3. Hunter Agent triggern (neuen Ansprechpartner suchen)
      const contact = await db.select().from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);
      
      if (contact[0].companyId) {
        await triggerHunterJob({
          companyId: contact[0].companyId,
          targetRoles: [contact[0].position || 'Manager'],
          reason: `Ersatz für ${contact[0].name}`
        });
      }
      break;
    
    case 'email_changed':
      // 1. Neue E-Mail vorschlagen
      await createContactSuggestion({
        type: 'email_update',
        contactId,
        suggestedData: { newEmail: analysis.newEmail },
        reason: 'E-Mail-Adresse geändert'
      });
      break;
  }
}
```

---

## 4. User-Interface: Bounce-Management

### 4.1 Bounce-Dashboard

```
┌─────────────────────────────────────────┐
│ E-Mail-Rückläufe (12 ausstehend)        │
├─────────────────────────────────────────┤
│ Filter: [Alle ▼] [Suche...]            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠️ Hard Bounce                       │ │
│ │ Marie Dubois - Saint-Gobain         │ │
│ │ marie.dubois@saint-gobain.com       │ │
│ │ Fehler: 550 5.1.1 User unknown      │ │
│ │ 21.10.2025 14:23                    │ │
│ │                                     │ │
│ │ Vorschlag: Neuen Ansprechpartner    │ │
│ │ suchen (Hunter Agent)               │ │
│ │                                     │ │
│ │ [Hunter starten] [Ignorieren]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📅 Out-of-Office                    │ │
│ │ John Smith - Knauf Group            │ │
│ │ john.smith@knauf.com                │ │
│ │ Abwesend bis: 27.10.2025            │ │
│ │                                     │ │
│ │ Alternative Kontakte erkannt:       │ │
│ │ • Marie Dubois (VP Sales)           │ │
│ │   marie.dubois@knauf.com            │ │
│ │                                     │ │
│ │ [Kontakt anlegen] [Erinnerung]      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 Mitarbeiter hat Unternehmen      │ │
│ │    verlassen                        │ │
│ │ Peter Müller - Etex Group           │ │
│ │ peter.mueller@etexgroup.com         │ │
│ │                                     │ │
│ │ Nachfolger erkannt:                 │ │
│ │ • Anna Schmidt                      │ │
│ │   VP Market Research                │ │
│ │   anna.schmidt@etexgroup.com        │ │
│ │   +32 2 778 12 11                   │ │
│ │                                     │ │
│ │ [Kontakt anlegen] [Alten archivieren] │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 4.2 Kontakt-Vorschläge

**UI-Konzept:**

```
┌─────────────────────────────────────────┐
│ Neuen Kontakt anlegen?                  │
├─────────────────────────────────────────┤
│ Grund: Mitarbeiter hat Unternehmen      │
│        verlassen                        │
│                                         │
│ Alter Kontakt:                          │
│ Peter Müller                            │
│ VP Market Research                      │
│ peter.mueller@etexgroup.com             │
│                                         │
│ Nachfolger (erkannt aus Auto-Reply):   │
│                                         │
│ Name:     [Anna Schmidt]                │
│ Position: [VP Market Research]          │
│ E-Mail:   [anna.schmidt@etexgroup.com]  │
│ Telefon:  [+32 2 778 12 11]            │
│ Firma:    [Etex Group] (bereits im CRM) │
│                                         │
│ Aktion mit altem Kontakt:              │
│ ● Archivieren  ○ Löschen               │
│                                         │
│ Deals übertragen:                       │
│ ✓ Deal: Q4 2025 - Etex (€15,000)      │
│                                         │
│ [Kontakt anlegen]  [Bearbeiten]  [Abbrechen] │
└─────────────────────────────────────────┘
```

### 4.3 Benachrichtigungen

**E-Mail-Benachrichtigung:**

```
Betreff: [FRIDAY CRM] 3 neue E-Mail-Rückläufe

Hallo Martin,

Es gibt 3 neue E-Mail-Rückläufe, die Ihre Aufmerksamkeit erfordern:

1. Hard Bounce: Marie Dubois (Saint-Gobain)
   → E-Mail-Adresse ungültig
   → Aktion: Neuen Ansprechpartner suchen

2. Out-of-Office: John Smith (Knauf Group)
   → Abwesend bis 27.10.2025
   → Alternative: Marie Dubois (VP Sales)

3. Mitarbeiter verlassen: Peter Müller (Etex Group)
   → Nachfolger: Anna Schmidt
   → Aktion: Neuen Kontakt anlegen

[Jetzt bearbeiten]

---
FRIDAY CRM
```

**In-App-Benachrichtigung:**

```
┌─────────────────────────────────────────┐
│ 🔔 Benachrichtigungen (3)               │
├─────────────────────────────────────────┤
│ ⚠️ Hard Bounce: Marie Dubois            │
│    vor 5 Minuten                        │
│    [Anzeigen]                           │
│                                         │
│ 📅 Out-of-Office: John Smith            │
│    vor 1 Stunde                         │
│    [Anzeigen]                           │
│                                         │
│ 👤 Mitarbeiter verlassen: Peter Müller  │
│    vor 2 Stunden                        │
│    [Anzeigen]                           │
└─────────────────────────────────────────┘
```

---

## 5. Automatische Aktionen

### 5.1 Regelbasierte Automation

**Konfigurierbare Regeln:**

```typescript
interface BounceRule {
  id: string;
  name: string;
  
  // Bedingung
  condition: {
    bounceType: 'hard_bounce' | 'soft_bounce' | 'out_of_office' | 'left_company';
    bounceCount?: number; // z.B. "nach 3 Soft Bounces"
  };
  
  // Aktion
  action: {
    type: 'update_status' | 'notify_user' | 'trigger_hunter' | 'archive_contact';
    params: any;
  };
  
  // Automatisch oder manuell?
  autoExecute: boolean;
}

// Beispiel-Regeln
const defaultRules: BounceRule[] = [
  {
    id: '1',
    name: 'Hard Bounce → Kontakt ungültig',
    condition: { bounceType: 'hard_bounce' },
    action: { 
      type: 'update_status', 
      params: { status: 'invalid' } 
    },
    autoExecute: true
  },
  {
    id: '2',
    name: '3 Soft Bounces → Warnung',
    condition: { bounceType: 'soft_bounce', bounceCount: 3 },
    action: { 
      type: 'notify_user', 
      params: { message: 'E-Mail-Adresse möglicherweise ungültig' } 
    },
    autoExecute: true
  },
  {
    id: '3',
    name: 'Mitarbeiter verlassen → Hunter Agent',
    condition: { bounceType: 'left_company' },
    action: { 
      type: 'trigger_hunter', 
      params: { searchForReplacement: true } 
    },
    autoExecute: false // Manuell bestätigen
  }
];
```

### 5.2 Hunter Agent Integration

**Automatische Suche nach Ersatz-Kontakt:**

```typescript
async function triggerHunterForReplacement(contactId: string) {
  const db = await getDb();
  
  // 1. Alten Kontakt laden
  const oldContact = await db.select().from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  
  if (!oldContact.length) return;
  
  // 2. Hunter Job erstellen
  await createHunterJob({
    companyId: oldContact[0].companyId,
    targetRoles: [
      oldContact[0].position || 'Manager',
      // Ähnliche Rollen
      'VP Sales', 'Market Research Manager', 'Director'
    ],
    targetCount: 3,
    reason: `Ersatz für ${oldContact[0].name} (hat Unternehmen verlassen)`,
    priority: 'high'
  });
  
  // 3. Benachrichtigung
  await notifyUser({
    type: 'hunter_triggered',
    message: `Hunter Agent sucht Ersatz für ${oldContact[0].name}`,
    contactId
  });
}
```

---

## 6. Datenqualität & Reporting

### 6.1 E-Mail-Qualitäts-Dashboard

```
┌─────────────────────────────────────────┐
│ E-Mail-Datenqualität                    │
├─────────────────────────────────────────┤
│                                         │
│ Gesamt Kontakte: 1,247                  │
│                                         │
│ ✅ Gültig:        1,156 (92.7%)         │
│ ⚠️ Warnung:         45 (3.6%)          │
│ ❌ Ungültig:        32 (2.6%)          │
│ 📅 Out-of-Office:   14 (1.1%)          │
│                                         │
│ Bounces (letzte 30 Tage):              │
│ • Hard Bounces:     18                  │
│ • Soft Bounces:     67                  │
│ • Out-of-Office:    42                  │
│ • Mitarbeiter verlassen: 8              │
│                                         │
│ [Ungültige Kontakte anzeigen]           │
│ [Datenqualität verbessern]              │
└─────────────────────────────────────────┘
```

### 6.2 Automatische Bereinigung

**Wöchentlicher Report:**

```
Betreff: [FRIDAY CRM] Wöchentlicher Datenqualitäts-Report

Hallo Martin,

Zusammenfassung der letzten 7 Tage:

📊 Statistiken:
- 12 Hard Bounces
- 23 Soft Bounces
- 8 Out-of-Office
- 3 Mitarbeiter haben Unternehmen verlassen

✅ Erledigte Aktionen:
- 8 Kontakte als ungültig markiert
- 3 neue Kontakte angelegt (Nachfolger)
- 5 Hunter Jobs gestartet

⚠️ Offene Aktionen (12):
- 7 Hard Bounces warten auf Bearbeitung
- 5 Nachfolger-Vorschläge warten auf Bestätigung

[Jetzt bearbeiten]

---
FRIDAY CRM
```

---

## 7. Implementierungs-Roadmap

### Phase 1: Bounce-Handling (2 Wochen)
- [ ] Database Schema (email_bounces)
- [ ] SendGrid/AWS SES Webhook-Integration
- [ ] Bounce-Klassifizierung (Hard/Soft)
- [ ] Automatische Kontakt-Status-Updates
- [ ] Benachrichtigungen

### Phase 2: Auto-Reply-Analyse (2 Wochen)
- [ ] IMAP-Integration für Auto-Replies
- [ ] GPT-4 Auto-Reply-Analyse
- [ ] Out-of-Office-Erkennung
- [ ] "Mitarbeiter verlassen"-Erkennung
- [ ] Nachfolger-Extraktion

### Phase 3: UI & Automation (2 Wochen)
- [ ] Bounce-Dashboard
- [ ] Kontakt-Vorschläge-UI
- [ ] Regelbasierte Automation
- [ ] Hunter Agent Integration
- [ ] E-Mail-Qualitäts-Dashboard

### Phase 4: Reporting & Optimierung (1 Woche)
- [ ] Wöchentlicher Report
- [ ] Datenqualitäts-Metriken
- [ ] Automatische Bereinigung
- [ ] Performance-Optimierung

**Gesamt: 7 Wochen**

---

## 8. Kosten-Schätzung

### API-Kosten (monatlich, 100 User, 10.000 E-Mails/Monat)

| Service | Kosten |
|---------|--------|
| SendGrid (Bounce-Tracking) | Kostenlos (in Plan enthalten) |
| OpenAI GPT-4 (Auto-Reply-Analyse) | ~100€ (ca. 500 Analysen/Monat) |
| **Gesamt** | **~100€/Monat** |

### Entwicklungskosten

| Phase | Aufwand | Kosten (80€/h) |
|-------|---------|----------------|
| Phase 1: Bounce-Handling | 80h | 6.400€ |
| Phase 2: Auto-Reply-Analyse | 80h | 6.400€ |
| Phase 3: UI & Automation | 80h | 6.400€ |
| Phase 4: Reporting | 40h | 3.200€ |
| **Gesamt** | **280h** | **22.400€** |

---

## 9. Zusammenfassung

**Kernfunktionen:**

1. ✅ Automatische Bounce-Erkennung (Hard/Soft)
2. ✅ GPT-4-basierte Auto-Reply-Analyse
3. ✅ Out-of-Office-Erkennung mit Nachfolger-Extraktion
4. ✅ "Mitarbeiter verlassen"-Erkennung mit Nachfolger-Vorschlag
5. ✅ Halbautomatische Aktionen (mit User-Bestätigung)
6. ✅ Hunter Agent Integration (automatische Ersatzsuche)
7. ✅ E-Mail-Qualitäts-Dashboard & Reporting

**Vorteile:**

- Kontaktdaten bleiben automatisch aktuell
- Keine manuellen E-Mail-Checks nötig
- Schnelle Reaktion auf Mitarbeiter-Wechsel
- Höhere Zustellrate bei E-Mail-Kampagnen
- Bessere Datenqualität im CRM

**Implementierung:** 7 Wochen, 22.400€  
**Betrieb:** 100€/Monat (GPT-4)

---

**Nächste Schritte:**

1. SendGrid/AWS SES Account einrichten
2. Webhook-Endpoints konfigurieren
3. GPT-4 API-Zugang einrichten
4. Entwicklung starten

---

**Letzte Aktualisierung:** 21. Oktober 2025

