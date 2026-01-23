# FRIDAY Scout Agent V2
**Wettbewerber-basierte Target-Identifikation**

## Konzept-Änderung

**ALT (V1):** Generische Suche nach Baulieferanten >€100M  
**NEU (V2):** Wettbewerber-Analyse basierend auf 100 bestehenden Kunden

## Workflow-Übersicht

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Genesis CRM Import (100 Firmen + Kontakte)               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Scout Agent: Website-Analyse                              │
│    - Crawlt Firmen-Websites                                  │
│    - Extrahiert: Produkte, Märkte, Kunden                   │
│    - Erstellt Firmen-Profil                                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Scout Agent: Wettbewerber-Suche (pro Land)               │
│    - Top 15 Märkte: DE, US, CN, UK, JP, CH, NL, AT, DK...  │
│    - Sucht ähnliche Unternehmen                              │
│    - Filtert: Umsatz >€100M, international tätig           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Scout Agent: Vorschlagsliste erstellen                   │
│    - Status: "Pending Approval"                              │
│    - Gruppiert nach Land                                      │
│    - Similarity Score (0-100)                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. MANUELLE REVIEW (User)                                    │
│    - Frontend: Vorschlagsliste mit Details                   │
│    - User: ✓ Approve oder ✗ Reject                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Hunter Agent: Ansprechpartner suchen                     │
│    - Nur für approved Unternehmen                            │
│    - Findet C-Level, VP Sales, Market Research              │
└──────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Genesis CRM Import

### Input
- 100 Firmen aus Genesis World CRM
- Bestehende Kontakte (Name, E-Mail, Position)
- Firmen-Infos (Name, Land, Website, Branche)

### Import-Skript

```bash
# CSV-Import
pnpm tsx server/import.ts \
  --corporations genesis_corporations.csv \
  --companies genesis_companies.csv \
  --contacts genesis_contacts.csv
```

### Datenstruktur

```csv
# genesis_corporations.csv
name,country,website,industry,revenueEur,products
"Knauf Gips KG","DE","https://www.knauf.com","Building Materials",15000,"Gypsum, Insulation, Drylining"
"Saint-Gobain","FR","https://www.saint-gobain.com","Building Materials",51000,"Glass, Insulation, Plaster"
...

# genesis_contacts.csv
firstName,lastName,email,company,function,linkedinUrl
"Christoph","Dorn","christoph.dorn@knauf.de","Knauf Gips KG","Geschäftsführer","https://linkedin.com/in/..."
...
```

### Output
- 100 Corporations in `corporations` Tabelle
- Status: "Customer" oder "Contacted"
- Kontakte in `contacts` Tabelle

---

## Phase 2: Website-Analyse

### Aufgabe
Crawlt Website jeder Firma und extrahiert strukturierte Informationen.

### Technologie
- **Playwright** - Headless Browser für JavaScript-Rendering
- **OpenAI GPT-4-Vision** - Extrahiert Infos aus Screenshots
- **Firecrawl API** - Alternativ: Managed Crawling Service

### Workflow

```typescript
// Scout Agent - Website-Analyse
async function analyzeCompanyWebsite(corporationId: string) {
  const corporation = await db.corporations.get(corporationId);
  
  // 1. Website crawlen
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  await page.goto(corporation.website);
  
  // 2. Relevante Seiten identifizieren
  const pages = await findRelevantPages(page, [
    '/products', '/solutions', '/markets', 
    '/about', '/company', '/references'
  ]);
  
  // 3. Content extrahieren
  const content = await extractContent(pages);
  
  // 4. GPT-4 Analyse
  const analysis = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "user",
      content: `
Analysiere diese Firmen-Website und extrahiere folgende Informationen:

**Website:** ${corporation.website}
**Content:**
${content}

**Zu extrahieren:**
1. Hauptprodukte (Liste)
2. Zielmärkte/Branchen (Liste)
3. Geografische Präsenz (Länder)
4. Referenzkunden (falls genannt)
5. Unternehmensgröße (Mitarbeiter, falls genannt)
6. Internationale Aktivitäten (Ja/Nein + Details)

Antworte in JSON:
{
  "products": ["Produkt 1", "Produkt 2", ...],
  "targetMarkets": ["Markt 1", "Markt 2", ...],
  "countries": ["DE", "FR", "US", ...],
  "referenceCustomers": ["Kunde 1", ...],
  "employeeCount": 5000,
  "international": true,
  "internationalDetails": "..."
}
`
    }],
    response_format: { type: "json_object" }
  });
  
  const profile = JSON.parse(analysis.choices[0].message.content);
  
  // 5. In Datenbank speichern
  await db.corporations.update(corporationId, {
    products: profile.products.join(', '),
    targetMarkets: profile.targetMarkets.join(', '),
    countries: profile.countries.join(', '),
    referenceCustomers: profile.referenceCustomers.join(', '),
    employeeCount: profile.employeeCount,
    international: profile.international,
    profileAnalyzedAt: new Date()
  });
  
  return profile;
}
```

### Neue Felder in `corporations` Tabelle

```sql
ALTER TABLE corporations ADD COLUMN `products` TEXT;
ALTER TABLE corporations ADD COLUMN `targetMarkets` TEXT;
ALTER TABLE corporations ADD COLUMN `countries` TEXT;
ALTER TABLE corporations ADD COLUMN `referenceCustomers` TEXT;
ALTER TABLE corporations ADD COLUMN `employeeCount` INT;
ALTER TABLE corporations ADD COLUMN `international` BOOLEAN;
ALTER TABLE corporations ADD COLUMN `profileAnalyzedAt` TIMESTAMP;
```

### Output pro Firma
```json
{
  "name": "Knauf Gips KG",
  "products": ["Gypsum boards", "Insulation materials", "Drylining systems"],
  "targetMarkets": ["Residential construction", "Commercial buildings", "Industrial"],
  "countries": ["DE", "FR", "UK", "US", "CN", "PL", "CZ", "AT"],
  "referenceCustomers": ["Deutsche Bahn", "Vonovia"],
  "employeeCount": 35000,
  "international": true
}
```

---

## Phase 3: Wettbewerber-Suche

### Aufgabe
Findet für jede Firma ähnliche Unternehmen in den Top 15 Märkten.

### Top 15 Zielmärkte

```typescript
const TOP_15_MARKETS = [
  "DE", // Deutschland
  "US", // USA
  "CN", // China
  "UK", // Großbritannien
  "JP", // Japan
  "CH", // Schweiz
  "NL", // Niederlande
  "AT", // Österreich
  "DK", // Dänemark
  "FR", // Frankreich
  "IT", // Italien
  "ES", // Spanien
  "SE", // Schweden
  "NO", // Norwegen
  "BE"  // Belgien
];
```

### Datenquellen

1. **LinkedIn Sales Navigator**
   - Suche nach Firmen mit ähnlichen Keywords
   - Filter: Land, Branche, Unternehmensgröße

2. **Crunchbase**
   - Similar Companies API
   - Filter: Revenue >$100M

3. **Google Search**
   - Query: "[Produkt] manufacturer [Land]"
   - Query: "competitors of [Firma]"

4. **Branchenverbände**
   - z.B. Bundesverband Baustoffe (DE)
   - National Association of Home Builders (US)

### Workflow

```typescript
// Scout Agent - Wettbewerber-Suche
async function findCompetitors(corporationId: string) {
  const corporation = await db.corporations.get(corporationId);
  const profile = await getCompanyProfile(corporationId);
  
  const competitors: Competitor[] = [];
  
  // Für jeden Top-Markt
  for (const country of TOP_15_MARKETS) {
    // 1. LinkedIn-Suche
    const linkedInResults = await searchLinkedIn({
      keywords: profile.products.slice(0, 3), // Top 3 Produkte
      industry: "Building Materials",
      country: country,
      companySize: ">1000" // Mindestens 1.000 Mitarbeiter
    });
    
    // 2. Crunchbase Similar Companies
    const crunchbaseResults = await crunchbase.findSimilar({
      companyName: corporation.name,
      country: country
    });
    
    // 3. Google Search
    const googleResults = await googleSearch({
      query: `${profile.products[0]} manufacturer ${country}`,
      numResults: 20
    });
    
    // 4. Alle Ergebnisse kombinieren
    const allResults = [
      ...linkedInResults,
      ...crunchbaseResults,
      ...googleResults
    ];
    
    // 5. Deduplizierung
    const unique = deduplicateByName(allResults);
    
    // 6. Für jedes Unternehmen: Enrichment + Scoring
    for (const company of unique) {
      // Enrichment: Zusatzdaten sammeln
      const enriched = await enrichCompany(company);
      
      // Filter: Umsatz >€100M?
      if (enriched.revenueEur < 100) continue;
      
      // Filter: International tätig?
      if (!enriched.international) continue;
      
      // Similarity Score berechnen
      const score = calculateSimilarity(profile, enriched);
      
      // Nur wenn Score >60
      if (score > 60) {
        competitors.push({
          ...enriched,
          similarityScore: score,
          sourceCompanyId: corporationId,
          country: country
        });
      }
    }
  }
  
  return competitors;
}
```

### Similarity Score Berechnung

```typescript
function calculateSimilarity(
  source: CompanyProfile, 
  target: CompanyProfile
): number {
  let score = 0;
  
  // 1. Produkt-Überschneidung (40%)
  const productOverlap = calculateOverlap(
    source.products, 
    target.products
  );
  score += productOverlap * 40;
  
  // 2. Zielmarkt-Überschneidung (25%)
  const marketOverlap = calculateOverlap(
    source.targetMarkets, 
    target.targetMarkets
  );
  score += marketOverlap * 25;
  
  // 3. Geografische Präsenz (20%)
  const geoOverlap = calculateOverlap(
    source.countries, 
    target.countries
  );
  score += geoOverlap * 20;
  
  // 4. Unternehmensgröße ähnlich? (15%)
  const sizeScore = calculateSizeScore(
    source.employeeCount, 
    target.employeeCount
  );
  score += sizeScore * 15;
  
  return Math.round(score);
}

function calculateOverlap(arr1: string[], arr2: string[]): number {
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  const set2 = new Set(arr2.map(s => s.toLowerCase()));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
}

function calculateSizeScore(size1: number, size2: number): number {
  const ratio = Math.min(size1, size2) / Math.max(size1, size2);
  return ratio; // 0-1
}
```

### Beispiel: Wettbewerber von Knauf

```json
{
  "sourceCompany": "Knauf Gips KG",
  "competitors": [
    {
      "name": "USG Corporation",
      "country": "US",
      "revenueEur": 3200,
      "products": ["Gypsum boards", "Ceiling systems", "Joint compounds"],
      "international": true,
      "similarityScore": 87,
      "reason": "Hauptprodukt Gypsum, ähnliche Märkte, internationale Präsenz"
    },
    {
      "name": "Yoshino Gypsum",
      "country": "JP",
      "revenueEur": 2100,
      "products": ["Gypsum boards", "Interior materials"],
      "international": true,
      "similarityScore": 82,
      "reason": "Gypsum-Spezialist, aktiv in Asien"
    },
    {
      "name": "Gyproc (Saint-Gobain)",
      "country": "UK",
      "revenueEur": 1800,
      "products": ["Gypsum boards", "Drylining systems"],
      "international": true,
      "similarityScore": 91,
      "reason": "Direkter Wettbewerber, identische Produkte"
    }
  ]
}
```

---

## Phase 4: Vorschlagsliste erstellen

### Neue Tabelle: `competitor_suggestions`

```sql
CREATE TABLE IF NOT EXISTS `competitor_suggestions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `sourceCompanyId` VARCHAR(64) NOT NULL, -- Referenz-Firma
  `suggestedName` VARCHAR(255) NOT NULL,
  `country` VARCHAR(2) NOT NULL,
  `website` VARCHAR(500),
  `revenueEur` DECIMAL(10, 2),
  `products` TEXT,
  `similarityScore` INT,
  `reason` TEXT,
  `status` VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
  `reviewedBy` VARCHAR(64),
  `reviewedAt` TIMESTAMP,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `suggestions_source_idx` (`sourceCompanyId`),
  INDEX `suggestions_status_idx` (`status`)
);
```

### Workflow

```typescript
// Scout Agent - Vorschlagsliste erstellen
async function createSuggestionList(corporationId: string) {
  const competitors = await findCompetitors(corporationId);
  
  // In Datenbank speichern
  for (const competitor of competitors) {
    await db.competitorSuggestions.create({
      sourceCompanyId: corporationId,
      suggestedName: competitor.name,
      country: competitor.country,
      website: competitor.website,
      revenueEur: competitor.revenueEur,
      products: competitor.products.join(', '),
      similarityScore: competitor.similarityScore,
      reason: competitor.reason,
      status: 'Pending'
    });
  }
  
  // Notification an User
  await notifyOwner({
    title: `Neue Wettbewerber-Vorschläge: ${corporation.name}`,
    content: `${competitors.length} ähnliche Unternehmen gefunden. Bitte reviewen.`
  });
}
```

---

## Phase 5: Manuelle Review (Frontend)

### UI: Vorschlagsliste

```typescript
// client/src/pages/CompetitorReview.tsx
export default function CompetitorReview() {
  const { data: suggestions } = trpc.scouts.getPendingSuggestions.useQuery();
  const approve = trpc.scouts.approveSuggestion.useMutation();
  const reject = trpc.scouts.rejectSuggestion.useMutation();
  
  return (
    <div className="container">
      <h1>Wettbewerber-Vorschläge</h1>
      <p>{suggestions?.length} Unternehmen warten auf Review</p>
      
      {suggestions?.map(suggestion => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onApprove={() => approve.mutate({ id: suggestion.id })}
          onReject={() => reject.mutate({ id: suggestion.id })}
        />
      ))}
    </div>
  );
}

function SuggestionCard({ suggestion, onApprove, onReject }) {
  return (
    <div className="border p-4 mb-4">
      <div className="flex justify-between">
        <div>
          <h3 className="font-bold">{suggestion.suggestedName}</h3>
          <p className="text-sm text-gray-600">
            {suggestion.country} | €{suggestion.revenueEur}M Umsatz
          </p>
          <p className="text-sm mt-2">
            <strong>Ähnlich zu:</strong> {suggestion.sourceCompany.name}
          </p>
          <p className="text-sm">
            <strong>Produkte:</strong> {suggestion.products}
          </p>
          <p className="text-sm mt-2">
            <strong>Grund:</strong> {suggestion.reason}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="text-center">
            <div className="text-2xl font-bold">{suggestion.similarityScore}</div>
            <div className="text-xs">Similarity</div>
          </div>
          
          <button 
            onClick={onApprove}
            className="bg-green-600 text-white px-4 py-2"
          >
            ✓ Approve
          </button>
          
          <button 
            onClick={onReject}
            className="bg-red-600 text-white px-4 py-2"
          >
            ✗ Reject
          </button>
          
          <a 
            href={suggestion.website} 
            target="_blank"
            className="text-blue-600 text-sm"
          >
            Website öffnen →
          </a>
        </div>
      </div>
    </div>
  );
}
```

### API-Endpoints

```typescript
// server/routers.ts
scouts: router({
  // Pending Suggestions abrufen
  getPendingSuggestions: protectedProcedure
    .query(async () => {
      return await db.competitorSuggestions.findMany({
        where: { status: 'Pending' },
        include: { sourceCompany: true },
        orderBy: { similarityScore: 'desc' }
      });
    }),
  
  // Suggestion approven
  approveSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const suggestion = await db.competitorSuggestions.get(input.id);
      
      // 1. Status auf Approved setzen
      await db.competitorSuggestions.update(input.id, {
        status: 'Approved',
        reviewedBy: ctx.user.id,
        reviewedAt: new Date()
      });
      
      // 2. Als Corporation anlegen
      const corporation = await db.corporations.create({
        name: suggestion.suggestedName,
        country: suggestion.country,
        website: suggestion.website,
        revenueEur: suggestion.revenueEur,
        products: suggestion.products,
        status: 'Target',
        priority: suggestion.similarityScore > 80 ? 'High' : 'Medium',
        stage: 'Cold',
        source: `Scout Agent (similar to ${suggestion.sourceCompany.name})`
      });
      
      // 3. Hunter Agent triggern
      await queueAgent({
        type: 'Hunter',
        targetId: corporation.id,
        priority: 5
      });
      
      return { success: true, corporationId: corporation.id };
    }),
  
  // Suggestion rejecten
  rejectSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.competitorSuggestions.update(input.id, {
        status: 'Rejected',
        reviewedBy: ctx.user.id,
        reviewedAt: new Date()
      });
      return { success: true };
    }),
  
  // Bulk Approve
  bulkApproveSuggestions: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      for (const id of input.ids) {
        await approveSuggestion({ id }, ctx);
      }
      return { success: true };
    })
})
```

---

## Phase 6: Hunter Agent (nur für Approved)

Nach Approval durch User:

1. **Corporation wird angelegt** (Status: "Target", Stage: "Cold")
2. **Hunter Agent wird getriggert** (automatisch)
3. Hunter sucht Ansprechpartner (wie in AI_AGENT_SYSTEM.md beschrieben)
4. Outreach Agent erstellt E-Mail-Drafts

---

## Implementierungsplan

### Woche 1: Genesis Import + Website-Analyse
- [ ] Genesis CRM CSV-Import (100 Firmen)
- [ ] Playwright Website-Crawler
- [ ] GPT-4 Content-Extraktion
- [ ] Firmen-Profile in DB speichern

### Woche 2: Wettbewerber-Suche
- [ ] LinkedIn Sales Navigator Integration
- [ ] Crunchbase Similar Companies API
- [ ] Google Search Integration
- [ ] Similarity Score Algorithmus

### Woche 3: Vorschlagsliste + Review UI
- [ ] `competitor_suggestions` Tabelle
- [ ] tRPC API-Endpoints
- [ ] Frontend: Review-Seite
- [ ] Bulk Actions (Approve/Reject)

### Woche 4: Automation
- [ ] Cron Job: Scout Agent (1x wöchentlich)
- [ ] Auto-Trigger Hunter nach Approval
- [ ] Notifications für neue Vorschläge
- [ ] Analytics Dashboard

---

## Erwartete Ergebnisse

### Pro Referenz-Firma (100 Firmen)
- **Wettbewerber gefunden:** 30-50 pro Firma
- **Nach Filtering (Umsatz, International):** 10-15 pro Firma
- **Nach Similarity Score >60:** 5-10 pro Firma

### Gesamt
- **100 Referenz-Firmen** × **7 Wettbewerber** = **700 neue Target-Unternehmen**
- **Top 15 Märkte** abgedeckt
- **Approval-Rate:** ~70% (490 approved)

---

## Kosten-Schätzung

### API-Kosten (einmalig für 100 Firmen)

| Service | Kosten | Nutzung |
|---------|--------|---------|
| Playwright Cloud | $0 | Self-hosted |
| OpenAI GPT-4 (Website-Analyse) | $50 | 100 Firmen × $0.50 |
| LinkedIn Sales Navigator | $99 | 1 Monat |
| Crunchbase API | $99 | 1 Monat |
| Google Search API | $0 | Kostenlos (Custom Search) |

**Gesamt:** ~$250 (einmalig)

### Laufende Kosten (monatlich)
- LinkedIn: $99/Monat
- Crunchbase: $99/Monat (optional, nur wenn weiter skaliert wird)
- OpenAI: $20/Monat (Maintenance)

**Gesamt:** ~$120/Monat

---

## Vorteile gegenüber V1

| Aspekt | V1 (Generisch) | V2 (Wettbewerber) |
|--------|----------------|-------------------|
| **Qualität** | Niedrig (viele Fehlalarme) | Hoch (ähnliche Firmen) |
| **Relevanz** | Mittel | Sehr hoch |
| **Kontrolle** | Wenig (automatisch) | Voll (manuelle Review) |
| **Skalierbarkeit** | Hoch | Mittel |
| **Sales-Pitch** | Generisch | "Ihre Wettbewerber nutzen GBM" |

---

## Nächste Schritte

1. **Genesis CRM Export vorbereiten**
   - CSV-Dateien mit 100 Firmen + Kontakten
   - Sicherstellen: Website-URLs vorhanden

2. **API-Accounts einrichten**
   - LinkedIn Sales Navigator
   - Crunchbase (optional)
   - OpenAI

3. **Datenbank erweitern**
   - Neue Felder in `corporations`
   - Neue Tabelle `competitor_suggestions`

4. **Scout Agent implementieren**
   - Website-Crawler (Playwright)
   - Wettbewerber-Suche
   - Vorschlagsliste

5. **Review UI bauen**
   - Frontend: Vorschlagsliste
   - Approve/Reject Buttons
   - Bulk Actions

---

**FRIDAY Scout Agent V2** - Competitor-Based Target Discovery  
Entwickelt für Global Building Monitor - 2025

