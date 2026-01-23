# FRIDAY CRM - Dokumentation

**Version:** 1.0  
**Datum:** 21. Oktober 2025  
**Entwickelt für:** Global Building Monitor

---

## Überblick

FRIDAY CRM ist ein intelligentes Customer Relationship Management System mit drei integrierten KI-Agenten für automatisierte Lead-Generierung, Kontaktsuche und E-Mail-Outreach.

### Kernfunktionen

1. **CRM Core**: Verwaltung von Konzernen, Firmen, Kontakten und Deals
2. **Scout Agent**: Automatische Identifikation von Zielunternehmen
3. **Hunter Agent**: Suche nach Entscheidungsträgern in Zielunternehmen
4. **Outreach Agent**: Hyper-personalisierte E-Mail-Kampagnen

---

## Architektur

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + tRPC
- **Database**: MySQL (via Drizzle ORM)
- **Authentication**: OAuth 2.0 (Manus Platform)
- **Styling**: TailwindCSS
- **State Management**: TanStack Query

### Projektstruktur

```
friday-crm/
├── client/                 # Frontend
│   ├── src/
│   │   ├── pages/         # React Pages
│   │   ├── components/    # Reusable Components
│   │   ├── lib/           # tRPC Client
│   │   └── _core/         # Core Utilities
├── server/                # Backend
│   ├── routers.ts         # Main tRPC Router
│   ├── scoutRouter.ts     # Scout Agent API
│   ├── hunterRouter.ts    # Hunter Agent API
│   ├── outreachRouter.ts  # Outreach Agent API
│   ├── db.ts              # Database Functions
│   └── services/          # Business Logic
├── drizzle/               # Database Schema
│   └── schema.ts
└── shared/                # Shared Types
```

---

## Datenmodell

### Hierarchie

```
Corporation (Konzern)
  └── Company (Firma)
      └── Contact (Kontakt)
          └── Deal (Verkaufschance)
```

### Wichtige Tabellen

#### Corporations (Konzerne)
- Globale Unternehmen (z.B. Saint-Gobain Group)
- Felder: Name, Land, Umsatz, Branche, Website, LinkedIn, Produkte, Zielmärkte

#### Companies (Firmen)
- Tochtergesellschaften von Konzernen
- Felder: Name, Land, Konzern-ID, Website

#### Contacts (Kontakte)
- Entscheidungsträger in Firmen
- Felder: Name, E-Mail, Position, LinkedIn, Telefon

#### Deals (Verkaufschancen)
- Sales Pipeline
- Felder: Titel, Wert, Status, Wahrscheinlichkeit, Verantwortlicher

#### Scout Agent Tabellen
- `scout_seeds`: Seed-Unternehmen für Discovery
- `scout_discoveries`: Gefundene Unternehmen
- `scout_jobs`: Discovery-Jobs

#### Hunter Agent Tabellen
- `hunter_jobs`: Kontaktsuche-Jobs
- `hunter_findings`: Gefundene Kontakte

#### Outreach Agent Tabellen
- `outreach_campaigns`: E-Mail-Kampagnen
- `email_drafts`: Generierte E-Mail-Drafts

---

## Scout Agent

### Zweck
Identifiziert automatisch Zielunternehmen basierend auf Seed-Daten.

### Workflow

1. **Seed hinzufügen** (`/scout/seed`)
   - Manuell: Name, Land, Website eingeben
   - Automatisch: LinkedIn-Profil analysieren

2. **Discovery starten**
   - Methoden: Google Search, LinkedIn, Branchenverzeichnisse
   - Findet ähnliche Unternehmen (gleiche Branche, Größe, Märkte)

3. **Review Queue** (`/scout/review`)
   - Gefundene Unternehmen prüfen
   - Genehmigen → wird zu Corporation
   - Ablehnen → wird verworfen

### API Endpoints

```typescript
// Seed erstellen
trpc.scout.createSeed.mutate({
  name: "Saint-Gobain",
  country: "FR",
  website: "https://saint-gobain.com"
})

// Discovery starten
trpc.scout.startDiscovery.mutate({
  seedId: "...",
  method: "google_search",
  targetCount: 10
})

// Discoveries reviewen
trpc.scout.reviewDiscovery.mutate({
  discoveryId: "...",
  action: "approve"
})
```

---

## Hunter Agent

### Zweck
Findet Entscheidungsträger in Zielunternehmen.

### Workflow

1. **Target Companies** (`/hunter/targets`)
   - Zielunternehmen auswählen (aus Corporations)
   - Ziel-Rollen definieren (VP Sales, Market Research Manager, etc.)
   - Anzahl Kontakte festlegen

2. **Job erstellen**
   - Hunter Agent durchsucht Apollo.io und Hunter.io
   - Findet Kontakte mit passenden Titeln
   - Extrahiert: Name, E-Mail, Position, LinkedIn

3. **Review Queue** (`/hunter/review`)
   - Gefundene Kontakte prüfen
   - E-Mail-Adressen verifizieren
   - Genehmigen → wird zu Contact

### API Endpoints

```typescript
// Hunter Job erstellen
trpc.hunter.createJob.mutate({
  corporationId: "...",
  targetRoles: ["VP Sales", "Market Research Manager"],
  targetCount: 5
})

// Findings reviewen
trpc.hunter.reviewFinding.mutate({
  findingId: "...",
  action: "approve"
})
```

---

## Outreach Agent

### Zweck
Generiert hyper-personalisierte E-Mails in der Muttersprache des Empfängers.

### Workflow

1. **Kampagne erstellen** (`/outreach/campaigns`)
   - Name, Beschreibung, Zielgruppe, Sprache
   - Status: draft → active → paused → completed

2. **E-Mails generieren**
   - Kontext sammeln:
     - Google News: Aktuelle Nachrichten über das Unternehmen
     - LinkedIn: Letzte Posts der Company Page
     - CRM-Daten: Produkte, Zielmärkte
   - GPT-4 generiert personalisierte E-Mail
   - Sprache: Automatisch basierend auf Land (DE, EN, FR, ES, IT)

3. **Review Queue** (`/outreach/review`)
   - E-Mail-Drafts prüfen
   - Betreff und Text bearbeiten
   - Genehmigen → bereit zum Versand
   - Ablehnen → wird verworfen

4. **Versenden** (`/outreach/sent`)
   - Genehmigte E-Mails versenden
   - Integration: SendGrid, AWS SES (in Produktion)
   - Tracking: Öffnungsraten, Klicks, Antworten

### Personalisierung

Jede E-Mail enthält:
- Aktuelle News über das Unternehmen
- Bezug zu LinkedIn-Posts
- Branchenspezifische Beispiele
- Muttersprache des Empfängers
- Persönliche Anrede

**Beispiel (Deutsch):**
```
Sehr geehrte Frau Schmidt,

ich habe mit großem Interesse die jüngsten Erfolge der Knauf Group verfolgt, 
insbesondere die Expansion in osteuropäische Märkte.

Als Director Market Intelligence wissen Sie, wie wichtig fundierte Marktdaten 
für strategische Entscheidungen sind...
```

**Beispiel (Französisch):**
```
Chère Madame Dubois,

J'ai suivi avec grand intérêt les récents succès de Saint-Gobain, notamment 
l'annonce des résultats du Q4 2024 avec une croissance de 12%...
```

### API Endpoints

```typescript
// Kampagne erstellen
trpc.outreach.createCampaign.mutate({
  name: "Q1 2025 - DACH Market",
  targetSegment: "VP Sales",
  language: "de"
})

// E-Mail generieren
trpc.outreach.generateEmail.mutate({
  campaignId: "...",
  contactId: "...",
  corporationId: "...",
  language: "de"
})

// Draft reviewen
trpc.outreach.reviewDraft.mutate({
  draftId: "...",
  action: "approve"
})

// E-Mail versenden
trpc.outreach.sendEmail.mutate({
  draftId: "..."
})
```

---

## User Roles

### admin
- Voller Zugriff auf alle Funktionen
- Verwaltung von Benutzern und Partnern
- Zugriff auf alle Deals

### sales_manager
- Verwaltung von Konzernen, Firmen, Kontakten
- Zugriff auf alle Deals
- Verwendung aller AI Agents

### external_sales
- Nur eigene Deals sichtbar (`/my-deals`)
- Kann Kontakte hinzufügen
- Eingeschränkter Zugriff auf CRM-Daten

### partner
- Zugriff nur auf zugewiesene Konzerne
- Kann keine neuen Konzerne erstellen
- Verwendung von Scout/Hunter Agents

---

## Deployment

### Entwicklung

```bash
# Installation
pnpm install

# Database Migration
pnpm db:push

# Seed Data
node_modules/.bin/tsx server/seed.ts
node_modules/.bin/tsx server/seedScout.ts
node_modules/.bin/tsx server/seedHunter.ts
node_modules/.bin/tsx server/seedOutreach.ts

# Development Server
pnpm dev
```

### Produktion

```bash
# Build
pnpm build

# Start
pnpm start
```

### Umgebungsvariablen

Automatisch injiziert:
- `DATABASE_URL`: MySQL Connection String
- `JWT_SECRET`: Session Secret
- `OAUTH_SERVER_URL`: OAuth Provider
- `VITE_APP_TITLE`: "FRIDAY CRM"

Manuell konfigurieren:
- `APOLLO_API_KEY`: Apollo.io API Key (Hunter Agent)
- `HUNTER_API_KEY`: Hunter.io API Key (Hunter Agent)
- `OPENAI_API_KEY`: OpenAI GPT-4 API Key (Outreach Agent)
- `SENDGRID_API_KEY`: SendGrid API Key (E-Mail Versand)

---

## Integration APIs

### Apollo.io (Hunter Agent)
```typescript
// Kontakte suchen
const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.APOLLO_API_KEY
  },
  body: JSON.stringify({
    organization_domains: ['saint-gobain.com'],
    person_titles: ['VP Sales', 'Market Research Manager'],
    per_page: 10
  })
})
```

### Hunter.io (Hunter Agent)
```typescript
// E-Mail-Adressen finden
const response = await fetch(
  `https://api.hunter.io/v2/domain-search?domain=saint-gobain.com&api_key=${process.env.HUNTER_API_KEY}`
)
```

### OpenAI GPT-4 (Outreach Agent)
```typescript
// E-Mail generieren
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'Du bist ein Experte für B2B Sales E-Mails...'
      },
      {
        role: 'user',
        content: `Schreibe eine personalisierte E-Mail an ${contactName}...`
      }
    ]
  })
})
```

---

## Best Practices

### Scout Agent
1. Verwenden Sie spezifische Seeds (nicht "Baumaterialien", sondern "Saint-Gobain")
2. Starten Sie mit 5-10 Discoveries pro Seed
3. Reviewen Sie regelmäßig die Queue (täglich)
4. Nutzen Sie mehrere Discovery-Methoden parallel

### Hunter Agent
1. Definieren Sie präzise Rollen (nicht "Manager", sondern "VP Sales EMEA")
2. Limitieren Sie auf 5-10 Kontakte pro Unternehmen
3. Verifizieren Sie E-Mail-Adressen vor Genehmigung
4. Prüfen Sie LinkedIn-Profile manuell

### Outreach Agent
1. Erstellen Sie separate Kampagnen pro Sprache
2. Reviewen Sie ALLE E-Mails manuell (keine Bulk-Genehmigung ohne Prüfung)
3. Bearbeiten Sie generierte E-Mails bei Bedarf
4. Versenden Sie maximal 50 E-Mails pro Tag (Spam-Vermeidung)
5. Nutzen Sie A/B-Testing für Betreffzeilen

---

## Troubleshooting

### Scout Agent findet keine Unternehmen
- Prüfen Sie Seed-Daten (Website, Land korrekt?)
- Verwenden Sie alternative Discovery-Methoden
- Erhöhen Sie `targetCount`

### Hunter Agent findet keine Kontakte
- Prüfen Sie, ob Apollo.io/Hunter.io API Keys konfiguriert sind
- Verwenden Sie generischere Rollen ("VP Sales" statt "VP Sales EMEA")
- Prüfen Sie, ob Unternehmen auf LinkedIn präsent ist

### Outreach Agent generiert schlechte E-Mails
- Prüfen Sie Personalisierungskontext (News, LinkedIn-Posts)
- Bearbeiten Sie E-Mail-Templates in `outreachService.ts`
- Verwenden Sie GPT-4 statt GPT-3.5 (bessere Qualität)

### E-Mails werden nicht versendet
- Prüfen Sie SendGrid API Key
- Prüfen Sie, ob E-Mails genehmigt wurden (`reviewStatus: "approved"`)
- Prüfen Sie Spam-Filter des Empfängers

---

## Roadmap

### Version 1.1 (Q1 2025)
- [ ] LinkedIn Integration (automatisches Login via Phantombuster)
- [ ] E-Mail Tracking (Öffnungsraten, Klicks)
- [ ] Antwort-Management (Inbox Integration)
- [ ] A/B Testing für E-Mail-Kampagnen

### Version 1.2 (Q2 2025)
- [ ] Multi-Channel Outreach (LinkedIn InMail, Twitter DM)
- [ ] AI-Powered Lead Scoring
- [ ] Automatische Follow-Up E-Mails
- [ ] CRM Analytics Dashboard

### Version 2.0 (Q3 2025)
- [ ] Mobile App (iOS, Android)
- [ ] WhatsApp Business Integration
- [ ] Video-Personalisierung (Loom, Vidyard)
- [ ] Slack/Teams Integration

---

## Support

**Entwickler:** Manus AI  
**Kontakt:** support@manus.im  
**Dokumentation:** https://docs.friday-crm.com

---

**Letzte Aktualisierung:** 21. Oktober 2025

