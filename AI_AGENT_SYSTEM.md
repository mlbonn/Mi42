# FRIDAY AI Agent System
**Autonome Lead-Generierung und Outreach-Automatisierung**

## Übersicht

Das FRIDAY AI Agent System besteht aus drei autonomen Agenten, die kontinuierlich arbeiten:

1. **Scout Agent** - Identifiziert neue Target-Unternehmen (500-1.000)
2. **Hunter Agent** - Findet Ansprechpartner in Target-Unternehmen
3. **Outreach Agent** - Erstellt hyper-personalisierte E-Mails/LinkedIn-Messages

## Systemarchitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    FRIDAY CRM Database                       │
│  corporations | companies | contacts | activities | deals   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐    ┌───▼────┐    ┌───▼────────┐
   │ Scout   │───▶│ Hunter │───▶│ Outreach   │
   │ Agent   │    │ Agent  │    │ Agent      │
   └─────────┘    └────────┘    └────────────┘
        │              │              │
        ▼              ▼              ▼
   [LinkedIn]    [Apollo.io]    [Gmail API]
   [Crunchbase]  [LinkedIn]     [LinkedIn API]
   [Craft.co]    [Hunter.io]    [OpenAI GPT-4]
```

## 1. Scout Agent - Target-Identifikation

### Aufgabe
Kontinuierliche Suche nach Baulieferanten >100 Mio. EUR Umsatz weltweit.

### Datenquellen
1. **LinkedIn Sales Navigator API**
   - Filter: "Building Materials", "Construction", "Insulation"
   - Revenue: >$100M
   - Länder: Top 50 Baumärkte

2. **Crunchbase API**
   - Kategorie: Construction, Building Materials
   - Funding/Revenue: >$100M

3. **Craft.co API**
   - Branche: Building Materials
   - Revenue: >€100M

4. **Web Scraping**
   - Branchenverbände (z.B. Euroconstruct, NAHB)
   - Top-Listen (Forbes, Deloitte Construction)

### Workflow

```typescript
// Scout Agent - Pseudo-Code
async function scoutAgent() {
  while (true) {
    // 1. Neue Unternehmen suchen
    const newCompanies = await searchLinkedIn({
      industry: "Building Materials",
      revenue: ">100M",
      countries: TOP_50_COUNTRIES
    });
    
    // 2. Mit bestehenden Corporations abgleichen
    for (const company of newCompanies) {
      const exists = await db.corporations.findByName(company.name);
      
      if (!exists) {
        // 3. Enrichment: Zusatzdaten sammeln
        const enriched = await enrichCompany(company);
        
        // 4. Scoring: Wie gut passt das Unternehmen?
        const score = await scoreCompany(enriched);
        
        if (score > 70) {
          // 5. In CRM anlegen
          await db.corporations.create({
            name: enriched.name,
            country: enriched.country,
            revenueEur: enriched.revenue,
            industry: enriched.industry,
            status: "Target",
            priority: score > 85 ? "High" : "Medium",
            source: "Scout Agent",
            companySize: enriched.employeeCount,
            stage: "Cold"
          });
          
          // 6. Hunter Agent triggern
          await triggerHunterAgent(enriched.id);
        }
      }
    }
    
    // 7. Pause (1x täglich)
    await sleep(24 * 60 * 60 * 1000);
  }
}
```

### Scoring-Kriterien

| Kriterium | Gewichtung | Punkte |
|-----------|------------|--------|
| Umsatz >€500M | 30% | 0-30 |
| Export in >10 Länder | 25% | 0-25 |
| Produkte passen zu GBM | 20% | 0-20 |
| Aktive LinkedIn-Präsenz | 15% | 0-15 |
| Pressemitteilungen (letzte 12 Monate) | 10% | 0-10 |

**Score >85:** High Priority  
**Score 70-85:** Medium Priority  
**Score <70:** Ignorieren

### Output
- 500-1.000 Target-Unternehmen in `corporations` Tabelle
- Status: "Target"
- Priority: "High" oder "Medium"
- Stage: "Cold"

---

## 2. Hunter Agent - Ansprechpartner-Identifikation

### Aufgabe
Findet Entscheidungsträger in Target-Unternehmen (C-Level, VP Sales, Market Research Manager).

### Datenquellen
1. **LinkedIn Sales Navigator**
   - Titel: CEO, CFO, VP Sales, Head of Market Research, Strategy Manager
   - Firma: Target-Unternehmen

2. **Apollo.io API**
   - E-Mail-Adressen + Telefonnummern
   - Job Title Matching

3. **Hunter.io API**
   - E-Mail-Pattern-Erkennung (firstname.lastname@company.com)
   - E-Mail-Verifizierung

4. **RocketReach API**
   - Direkte E-Mail-Adressen
   - LinkedIn-Profile

### Workflow

```typescript
// Hunter Agent - Pseudo-Code
async function hunterAgent(corporationId: string) {
  const corporation = await db.corporations.get(corporationId);
  
  // 1. LinkedIn-Suche nach Entscheidungsträgern
  const prospects = await searchLinkedIn({
    company: corporation.name,
    titles: [
      "CEO", "Chief Executive Officer",
      "CFO", "Chief Financial Officer",
      "VP Sales", "Vice President Sales",
      "Head of Market Research",
      "Strategy Manager",
      "Business Development Director"
    ]
  });
  
  // 2. E-Mail-Adressen finden
  for (const prospect of prospects) {
    // Apollo.io
    let email = await apollo.findEmail(prospect.linkedInUrl);
    
    // Fallback: Hunter.io
    if (!email) {
      email = await hunter.findEmail({
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        domain: corporation.website
      });
    }
    
    // E-Mail verifizieren
    const isValid = await verifyEmail(email);
    
    if (isValid) {
      // 3. In CRM anlegen
      const contact = await db.contacts.create({
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: email,
        linkedinUrl: prospect.linkedInUrl,
        function: prospect.title,
        department: prospect.department,
        phoneBusiness: prospect.phone,
        source: "Hunter Agent",
        status: "New"
      });
      
      // 4. Firma zuordnen (falls noch nicht existiert)
      let company = await db.companies.findByName(corporation.name);
      if (!company) {
        company = await db.companies.create({
          corporationId: corporation.id,
          name: corporation.name,
          country: corporation.country,
          website: corporation.website
        });
      }
      
      // 5. Contact-Company-Relation
      await db.contactCompanyRelations.create({
        contactId: contact.id,
        companyId: company.id,
        isPrimary: true
      });
      
      // 6. Outreach Agent triggern
      await triggerOutreachAgent(contact.id);
    }
  }
}
```

### Ziel-Personas

| Persona | Job Titles | Priorität |
|---------|-----------|-----------|
| **C-Level** | CEO, CFO, COO, CMO | Hoch |
| **Sales Leadership** | VP Sales, Sales Director, Head of Sales | Hoch |
| **Market Intelligence** | Head of Market Research, Strategy Manager, Business Intelligence Manager | Sehr Hoch |
| **Business Development** | VP Business Development, BD Director | Mittel |
| **Procurement** | Head of Procurement, Purchasing Manager | Mittel |

### Output
- 3-5 Ansprechpartner pro Target-Unternehmen
- E-Mail-Adressen (verifiziert)
- LinkedIn-Profile
- Job Titles + Departments

---

## 3. Outreach Agent - Hyper-Personalisierte Ansprache

### Aufgabe
Erstellt individualisierte E-Mails/LinkedIn-Messages in Landessprache basierend auf:
- Unternehmensnews (letzte 3 Monate)
- LinkedIn-Posts der Person
- Branchentrends
- GBM-Use-Cases für diese Branche

### Datenquellen
1. **Google News API** - Unternehmensnews
2. **LinkedIn API** - Posts/Aktivitäten der Person
3. **OpenAI GPT-4** - Text-Generierung
4. **DeepL API** - Übersetzung in Landessprache

### Workflow

```typescript
// Outreach Agent - Pseudo-Code
async function outreachAgent(contactId: string) {
  const contact = await db.contacts.get(contactId);
  const company = await db.companies.getByContact(contactId);
  const corporation = await db.corporations.get(company.corporationId);
  
  // 1. Research: Unternehmensnews sammeln
  const news = await googleNews.search({
    query: corporation.name,
    language: getLanguage(corporation.country),
    dateRange: "last_3_months"
  });
  
  // 2. LinkedIn-Aktivität der Person
  const linkedInActivity = await linkedin.getActivity(contact.linkedinUrl);
  
  // 3. Branchentrends
  const trends = await getBuildingMaterialsTrends(corporation.country);
  
  // 4. GBM Use-Case für diese Branche
  const useCase = getUseCaseForIndustry(corporation.industry);
  
  // 5. Prompt für GPT-4
  const prompt = `
Du bist ein Sales Development Representative für Global Building Monitor (GBM).

**Zielunternehmen:** ${corporation.name}
**Land:** ${corporation.country}
**Branche:** ${corporation.industry}
**Umsatz:** €${corporation.revenueEur}M

**Ansprechpartner:**
- Name: ${contact.firstName} ${contact.lastName}
- Position: ${contact.function}
- LinkedIn: ${contact.linkedinUrl}

**Aktuelle News über ${corporation.name}:**
${news.map(n => `- ${n.title} (${n.date})`).join('\n')}

**LinkedIn-Aktivität von ${contact.firstName}:**
${linkedInActivity.recentPosts.map(p => `- ${p.text.substring(0, 100)}...`).join('\n')}

**Branchentrends in ${corporation.country}:**
${trends.join('\n')}

**GBM Use-Case:**
${useCase}

**Aufgabe:**
Schreibe eine hyper-personalisierte E-Mail (max. 150 Wörter) in ${getLanguage(corporation.country)}, die:
1. Bezug auf eine aktuelle News oder LinkedIn-Post nimmt
2. Ein spezifisches Problem des Unternehmens adressiert
3. GBM als Lösung positioniert (ohne zu verkaufen)
4. Einen konkreten CTA enthält (15-min Call)

Ton: Professionell, aber nicht steif. Wie ein Branchenkollege.
`;

  // 6. E-Mail generieren
  const email = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Du bist ein Sales Development Representative." },
      { role: "user", content: prompt }
    ]
  });
  
  const emailBody = email.choices[0].message.content;
  
  // 7. Betreff generieren
  const subject = await generateSubject(corporation, news[0]);
  
  // 8. E-Mail in CRM speichern (Draft)
  await db.activities.create({
    corporationId: corporation.id,
    contactId: contact.id,
    activityType: "Email",
    subject: subject,
    content: emailBody,
    direction: "Outbound",
    status: "Draft", // Manuelles Review vor Versand
    createdBy: "Outreach Agent"
  });
  
  // 9. Notification an Sales Team
  await notifyOwner({
    title: `Neue Outreach-E-Mail: ${corporation.name}`,
    content: `E-Mail an ${contact.firstName} ${contact.lastName} (${contact.function}) bereit zum Review.`
  });
}
```

### E-Mail-Template-Struktur

```
Betreff: [Personalisiert basierend auf News/LinkedIn]

Hallo [Vorname],

[Hook: Bezug auf News/LinkedIn-Post]
[1-2 Sätze]

[Problem-Identifikation]
[2-3 Sätze über spezifisches Problem der Branche/des Unternehmens]

[GBM als Lösung - ohne zu verkaufen]
[2-3 Sätze über GBM-Daten und Use-Case]

[CTA: 15-min Call]
[1 Satz]

Beste Grüße,
[Ihr Name]
[Signatur]
```

### Beispiel-E-Mail (Deutsch)

```
Betreff: Expansion nach Polen - Baumarkt-Daten für Knauf

Hallo Christoph,

ich habe gesehen, dass Knauf kürzlich die Übernahme von Siniat in Polen angekündigt hat. 
Gratulation zu diesem strategischen Schritt!

Bei solchen Expansionen ist der Zugang zu verlässlichen Bauvolumen-Daten entscheidend. 
Viele unserer Kunden nutzen Global Building Monitor, um neue Märkte zu bewerten und 
Vertriebsressourcen optimal zu allokieren.

Wir haben gerade unsere Polen-Daten aktualisiert (Q4 2024). Hätten Sie 15 Minuten für 
einen kurzen Austausch, wie andere Baulieferanten GBM für Marktanalysen nutzen?

Beste Grüße,
Martin Langen
Global Building Monitor
```

### Beispiel-E-Mail (Französisch)

```
Objet: Saint-Gobain et la transition énergétique

Bonjour Dr. Müller,

J'ai lu avec intérêt votre récent post LinkedIn sur les défis de la rénovation 
énergétique en Europe. Vous avez parfaitement raison sur l'importance des données 
de marché fiables.

Chez Global Building Monitor, nous suivons précisément les volumes de construction 
et de rénovation dans 180 pays. Nos clients utilisent ces données pour identifier 
les marchés à fort potentiel pour l'isolation et les matériaux durables.

Auriez-vous 15 minutes pour un échange sur la manière dont d'autres acteurs du 
secteur utilisent GBM pour leurs analyses stratégiques?

Cordialement,
Martin Langen
Global Building Monitor
```

### Output
- E-Mail-Draft in `activities` Tabelle
- Status: "Draft" (manuelles Review erforderlich)
- Notification an Sales Team

---

## Integration in FRIDAY CRM

### Neue Tabellen

```sql
-- AI Agents Execution Log
CREATE TABLE IF NOT EXISTS `agent_executions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `agentType` VARCHAR(50), -- Scout, Hunter, Outreach
  `status` VARCHAR(50), -- Running, Completed, Failed
  `startedAt` TIMESTAMP,
  `completedAt` TIMESTAMP,
  `itemsProcessed` INT,
  `itemsCreated` INT,
  `errors` TEXT,
  `metadata` JSON
);

-- AI Agent Queue
CREATE TABLE IF NOT EXISTS `agent_queue` (
  `id` VARCHAR(64) PRIMARY KEY,
  `agentType` VARCHAR(50),
  `targetId` VARCHAR(64), -- corporationId oder contactId
  `priority` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `scheduledFor` TIMESTAMP,
  `attempts` INT DEFAULT 0,
  `lastError` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API-Endpoints (tRPC)

```typescript
// server/routers.ts
agents: router({
  // Scout Agent manuell triggern
  triggerScout: adminProcedure
    .mutation(async () => {
      await queueAgent({ type: 'Scout', priority: 10 });
      return { success: true };
    }),
  
  // Hunter Agent für Corporation triggern
  triggerHunter: protectedProcedure
    .input(z.object({ corporationId: z.string() }))
    .mutation(async ({ input }) => {
      await queueAgent({ 
        type: 'Hunter', 
        targetId: input.corporationId,
        priority: 5 
      });
      return { success: true };
    }),
  
  // Outreach Agent für Contact triggern
  triggerOutreach: protectedProcedure
    .input(z.object({ contactId: z.string() }))
    .mutation(async ({ input }) => {
      await queueAgent({ 
        type: 'Outreach', 
        targetId: input.contactId,
        priority: 3 
      });
      return { success: true };
    }),
  
  // Agent-Status abrufen
  getAgentStatus: protectedProcedure
    .query(async () => {
      const executions = await db.agentExecutions.getRecent(10);
      const queue = await db.agentQueue.getPending();
      return { executions, queue };
    }),
  
  // E-Mail-Draft reviewen und versenden
  reviewOutreach: protectedProcedure
    .input(z.object({ 
      activityId: z.string(),
      action: z.enum(['approve', 'reject', 'edit']),
      editedContent: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      if (input.action === 'approve') {
        await sendEmail(input.activityId);
      }
      return { success: true };
    })
})
```

### Frontend-Integration

```typescript
// client/src/pages/AgentDashboard.tsx
export default function AgentDashboard() {
  const { data: status } = trpc.agents.getAgentStatus.useQuery();
  const triggerScout = trpc.agents.triggerScout.useMutation();
  
  return (
    <div>
      <h1>AI Agent Dashboard</h1>
      
      {/* Agent Status */}
      <div className="grid grid-cols-3 gap-4">
        <AgentCard 
          name="Scout Agent"
          status={status?.scout}
          onTrigger={() => triggerScout.mutate()}
        />
        <AgentCard name="Hunter Agent" status={status?.hunter} />
        <AgentCard name="Outreach Agent" status={status?.outreach} />
      </div>
      
      {/* Pending Reviews */}
      <OutreachReviewQueue />
    </div>
  );
}
```

---

## Implementierungsplan

### Phase 1: Scout Agent (Woche 1-2)
- [ ] LinkedIn Sales Navigator API Integration
- [ ] Crunchbase API Integration
- [ ] Scoring-Algorithmus
- [ ] Automatisches Anlegen in CRM
- [ ] Cron Job (1x täglich)

### Phase 2: Hunter Agent (Woche 3-4)
- [ ] Apollo.io API Integration
- [ ] Hunter.io API Integration
- [ ] E-Mail-Verifizierung
- [ ] LinkedIn-Scraping (Puppeteer)
- [ ] Automatisches Triggern nach Scout

### Phase 3: Outreach Agent (Woche 5-6)
- [ ] OpenAI GPT-4 Integration
- [ ] Google News API Integration
- [ ] LinkedIn Activity Scraping
- [ ] E-Mail-Template-System
- [ ] Review-Queue im Frontend

### Phase 4: Automation & Monitoring (Woche 7-8)
- [ ] Agent Queue System
- [ ] Error Handling & Retries
- [ ] Agent Dashboard (Frontend)
- [ ] Notifications für Sales Team
- [ ] Analytics & Reporting

---

## Kosten-Schätzung

### API-Kosten (monatlich)

| Service | Kosten | Nutzung |
|---------|--------|---------|
| LinkedIn Sales Navigator | $99/Monat | 1 Lizenz |
| Apollo.io | $49/Monat | 1.000 Credits |
| Hunter.io | $49/Monat | 1.000 Searches |
| OpenAI GPT-4 | $100/Monat | ~5.000 E-Mails |
| Google News API | $0 | Kostenlos |
| DeepL API | $25/Monat | 500.000 Zeichen |

**Gesamt:** ~$320/Monat

### ROI-Berechnung

**Annahmen:**
- 500 Target-Unternehmen identifiziert
- 3 Ansprechpartner pro Unternehmen = 1.500 Kontakte
- 10% Response-Rate = 150 Responses
- 5% Conversion zu Demo = 75 Demos
- 20% Conversion zu Deal = 15 Deals
- Durchschnittlicher Deal Value: $15.000
- **Gesamt-Revenue:** $225.000

**Kosten:**
- API-Kosten: $320/Monat × 6 Monate = $1.920
- **ROI:** 11.600%

---

## Compliance & Datenschutz

### DSGVO-Konformität
- ✅ Legitimes Interesse (B2B-Vertrieb)
- ✅ Opt-Out-Link in jeder E-Mail
- ✅ Datenminimierung (nur geschäftliche Kontakte)
- ✅ Recht auf Löschung (automatisch nach 2 Jahren Inaktivität)

### LinkedIn Terms of Service
- ⚠️ LinkedIn verbietet automatisiertes Scraping
- ✅ Lösung: LinkedIn Sales Navigator API nutzen (offiziell)
- ✅ Alternativ: Manuelle Recherche mit Phantombuster (Chrome Extension)

### E-Mail-Compliance
- ✅ CAN-SPAM Act (USA): Opt-Out + physische Adresse
- ✅ GDPR (EU): Legitimes Interesse + Opt-Out
- ✅ Keine Cold-Calls (nur E-Mail + LinkedIn)

---

## Nächste Schritte

1. **API-Accounts einrichten:**
   - LinkedIn Sales Navigator
   - Apollo.io
   - Hunter.io
   - OpenAI

2. **Datenbank erweitern:**
   - `agent_executions` Tabelle
   - `agent_queue` Tabelle

3. **Scout Agent implementieren:**
   - LinkedIn API Integration
   - Scoring-Algorithmus
   - Cron Job

4. **100 bestehende Kontakte importieren:**
   - Genesis World CRM CSV-Import
   - Outreach Agent für bestehende Kontakte triggern

5. **Review-Prozess definieren:**
   - Wer reviewed E-Mail-Drafts?
   - Wie schnell müssen Drafts reviewed werden?
   - Automatischer Versand nach X Stunden ohne Review?

---

**FRIDAY AI Agent System** - Fully Autonomous Lead Generation & Outreach  
Entwickelt für Global Building Monitor - 2025

