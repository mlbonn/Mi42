# FRIDAY Scout Agent - Kontinuierlicher Prozess
**Selbst-expandierendes Target Discovery System**

## Problem

Der bisherige Scout Agent V2 arbeitet einmalig:
1. 100 Genesis-Firmen importieren
2. Wettbewerber finden
3. Fertig

**Aber:** Wir wollen einen **kontinuierlichen, selbst-expandierenden Prozess**, der:
- Automatisch neue Targets findet
- Wettbewerber von Wettbewerbern entdeckt
- Über Verbände, Sortimente, Kunden expandiert
- Niemals stoppt

---

## Lösung: Zwei-Modus-System

### Modus A: **Seed Mode** (Manuell getriggert)
Neue Targets werden manuell hinzugefügt und gescoutet:
- Manuelle Eingabe (Name, Website)
- CSV-Import
- LinkedIn-Profil-URL
- Pressemeldung-URL
- Verbandswebsite

### Modus B: **Expansion Mode** (Automatisch)
Scout expandiert autonom durch:
- **Wettbewerber von Wettbewerbern** (Rekursiv)
- **Verbandswebsites** (Mitgliederlisten)
- **Sortimentsvergleich** (ähnliche Produktkataloge)
- **Kundenvergleich** (gemeinsame Referenzkunden)
- **Pressemeldungen** (neue Projekte, Expansionen)

---

## Architektur: Scout Queue System

```
┌─────────────────────────────────────────────────────────────┐
│                    Scout Queue                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Priority 1 │  │ Priority 2 │  │ Priority 3 │            │
│  │ (Manual)   │  │ (Approved) │  │ (Auto)     │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Scout Worker       │
              │  (Continuous Loop)   │
              └──────────┬───────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Website      │  │ Competitor   │  │ Association  │
│ Analyzer     │  │ Finder       │  │ Crawler      │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Suggestion Database  │
              │ (Pending Review)     │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Manual Review       │
              │  (User Approval)     │
              └──────────┬───────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   Approved          Rejected        Maybe Later
        │                │                │
        ▼                │                │
┌──────────────┐         │                │
│ Add to CRM   │         │                │
│ as Target    │         │                │
└──────┬───────┘         │                │
       │                 │                │
       └─────────────────┴────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Back to Queue       │
              │  (Next Generation)   │
              └──────────────────────┘
```

---

## Neue Datenbank-Struktur

### 1. Scout Queue Tabelle

```sql
CREATE TABLE IF NOT EXISTS `scout_queue` (
  `id` VARCHAR(64) PRIMARY KEY,
  `corporationId` VARCHAR(64) COMMENT 'Firma die gescoutet werden soll (kann NULL sein bei Seed)',
  `seedType` VARCHAR(50) COMMENT 'Manual, Import, LinkedIn, Press, Association',
  `seedData` JSON COMMENT 'Seed-Informationen (Name, URL, etc.)',
  `priority` INT DEFAULT 5 COMMENT '1=Highest, 10=Lowest',
  `status` VARCHAR(50) DEFAULT 'Pending' COMMENT 'Pending, Processing, Completed, Failed',
  `generation` INT DEFAULT 0 COMMENT 'Wettbewerber-Generation (0=Seed, 1=Direct, 2=Indirect, ...)',
  `parentId` VARCHAR(64) COMMENT 'Von welcher Firma wurde diese entdeckt?',
  `discoveryMethod` VARCHAR(100) COMMENT 'Competitor, Association, Customer, Press',
  `scheduledAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `startedAt` TIMESTAMP,
  `completedAt` TIMESTAMP,
  `errorMessage` TEXT,
  `metadata` JSON,
  
  INDEX `queue_status_idx` (`status`),
  INDEX `queue_priority_idx` (`priority`),
  INDEX `queue_generation_idx` (`generation`),
  INDEX `queue_parent_idx` (`parentId`),
  
  FOREIGN KEY (`corporationId`) REFERENCES `corporations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parentId`) REFERENCES `corporations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Scout Discovery Methods Tabelle

```sql
CREATE TABLE IF NOT EXISTS `scout_discovery_methods` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'CompetitorSearch, AssociationCrawl, CustomerAnalysis, PressMonitoring',
  `enabled` BOOLEAN DEFAULT TRUE,
  `priority` INT DEFAULT 5,
  `config` JSON COMMENT 'Methoden-spezifische Konfiguration',
  `lastRunAt` TIMESTAMP,
  `successCount` INT DEFAULT 0,
  `failureCount` INT DEFAULT 0,
  
  UNIQUE KEY `method_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Erweitere `corporations` Tabelle

```sql
ALTER TABLE corporations 
  ADD COLUMN `scoutGeneration` INT DEFAULT 0 COMMENT 'Wettbewerber-Generation',
  ADD COLUMN `scoutParentId` VARCHAR(64) COMMENT 'Von welcher Firma entdeckt?',
  ADD COLUMN `discoveryMethod` VARCHAR(100) COMMENT 'Wie wurde Firma entdeckt?',
  ADD COLUMN `discoveredAt` TIMESTAMP COMMENT 'Wann entdeckt?',
  ADD INDEX `corp_generation_idx` (`scoutGeneration`),
  ADD INDEX `corp_parent_idx` (`scoutParentId`);
```

---

## Modus A: Seed Mode

### A1: Manuelle Eingabe

```typescript
// Frontend: Neue Firma manuell hinzufügen
async function addManualSeed(data: {
  name: string;
  website: string;
  country: string;
  notes?: string;
}) {
  await trpc.scout.addSeed.mutate({
    seedType: 'Manual',
    seedData: data,
    priority: 1 // Höchste Priorität
  });
}
```

### A2: CSV-Import

```typescript
// Bulk-Import aus CSV
async function importSeeds(csvFile: File) {
  const rows = await parseCSV(csvFile);
  
  for (const row of rows) {
    await trpc.scout.addSeed.mutate({
      seedType: 'Import',
      seedData: {
        name: row.name,
        website: row.website,
        country: row.country,
        source: csvFile.name
      },
      priority: 2
    });
  }
}
```

### A3: LinkedIn-Profil

```typescript
// Firma aus LinkedIn-URL extrahieren
async function addFromLinkedIn(linkedInUrl: string) {
  // 1. LinkedIn scrapen (oder API)
  const companyData = await scrapeLinkedInCompany(linkedInUrl);
  
  // 2. In Queue stellen
  await trpc.scout.addSeed.mutate({
    seedType: 'LinkedIn',
    seedData: {
      name: companyData.name,
      website: companyData.website,
      country: companyData.country,
      linkedInUrl: linkedInUrl,
      employeeCount: companyData.employeeCount
    },
    priority: 2
  });
}
```

### A4: Pressemeldung

```typescript
// Firma aus Pressemeldung extrahieren
async function addFromPress(pressUrl: string) {
  // 1. Pressemeldung crawlen
  const content = await fetchURL(pressUrl);
  
  // 2. GPT-4: Firmen extrahieren
  const companies = await extractCompaniesFromText(content);
  
  // 3. In Queue stellen
  for (const company of companies) {
    await trpc.scout.addSeed.mutate({
      seedType: 'Press',
      seedData: {
        name: company.name,
        website: company.website,
        country: company.country,
        pressUrl: pressUrl,
        context: company.context
      },
      priority: 3
    });
  }
}
```

### A5: Verbandswebsite

```typescript
// Mitglieder aus Verbandswebsite extrahieren
async function addFromAssociation(associationUrl: string) {
  // 1. Verbandswebsite crawlen
  const members = await scrapeAssociationMembers(associationUrl);
  
  // 2. In Queue stellen
  for (const member of members) {
    await trpc.scout.addSeed.mutate({
      seedType: 'Association',
      seedData: {
        name: member.name,
        website: member.website,
        country: member.country,
        associationUrl: associationUrl,
        associationName: member.associationName
      },
      priority: 3
    });
  }
}
```

---

## Modus B: Expansion Mode (Automatisch)

### B1: Wettbewerber von Wettbewerbern (Rekursiv)

**Konzept:** Jede approved Firma wird zur Seed-Firma für die nächste Generation.

```typescript
// Nach Approval: In Queue für Expansion stellen
async function onSuggestionApproved(suggestionId: string) {
  const suggestion = await db.competitorSuggestions.get(suggestionId);
  
  // 1. Als Corporation anlegen
  const corporationId = await db.corporations.create({
    name: suggestion.suggestedName,
    // ... andere Felder ...
    scoutGeneration: suggestion.sourceCompany.scoutGeneration + 1,
    scoutParentId: suggestion.sourceCompanyId,
    discoveryMethod: 'CompetitorSearch',
    discoveredAt: new Date()
  });
  
  // 2. In Scout Queue für nächste Generation
  await db.scoutQueue.create({
    corporationId: corporationId,
    seedType: 'Expansion',
    priority: 5, // Mittlere Priorität
    generation: suggestion.sourceCompany.scoutGeneration + 1,
    parentId: suggestion.sourceCompanyId,
    discoveryMethod: 'Competitor'
  });
  
  return corporationId;
}
```

**Generationen-Baum:**

```
Generation 0 (Seed):
  └─ Knauf (Manual Import)
       │
       ├─ Generation 1 (Direct Competitors):
       │    ├─ USG Corporation (US)
       │    ├─ Yoshino Gypsum (JP)
       │    └─ Gyproc (UK)
       │         │
       │         └─ Generation 2 (Competitors of Competitors):
       │              ├─ British Gypsum (UK)
       │              ├─ Lafarge (FR)
       │              └─ Etex Group (BE)
       │                   │
       │                   └─ Generation 3:
       │                        ├─ Xella (DE)
       │                        └─ ...
```

**Stopp-Bedingungen:**
- Max. Generation: 5 (verhindert Endlosschleife)
- Similarity Score: >70 (nur hochwertige Wettbewerber)
- Bereits in DB: Duplikat-Check

### B2: Verbandswebsites crawlen

**Konzept:** Finde Branchenverbände und extrahiere Mitgliederlisten.

```typescript
// Discovery Method: Association Crawl
async function discoverViaAssociations(corporationId: string) {
  const corporation = await db.corporations.get(corporationId);
  
  // 1. Relevante Verbände finden
  const associations = await findRelevantAssociations(
    corporation.country,
    corporation.industry
  );
  
  // Beispiel-Verbände:
  // - Bundesverband Baustoffe (DE)
  // - National Association of Home Builders (US)
  // - China Building Materials Federation (CN)
  
  for (const association of associations) {
    // 2. Mitgliederliste crawlen
    const members = await scrapeAssociationMembers(association.url);
    
    // 3. Für jeden Member: In Queue stellen
    for (const member of members) {
      // Duplikat-Check
      const existing = await db.corporations.findByName(member.name);
      if (existing) continue;
      
      await db.scoutQueue.create({
        seedType: 'Expansion',
        seedData: {
          name: member.name,
          website: member.website,
          country: corporation.country,
          associationName: association.name
        },
        priority: 4,
        generation: corporation.scoutGeneration + 1,
        parentId: corporationId,
        discoveryMethod: 'Association'
      });
    }
  }
}

async function findRelevantAssociations(country: string, industry: string) {
  // Statische Liste + Google Search
  const staticAssociations = {
    'DE': [
      { name: 'Bundesverband Baustoffe', url: 'https://www.bvbaustoffe.de' },
      { name: 'Bundesverband der Deutschen Zementindustrie', url: 'https://www.vdz-online.de' }
    ],
    'US': [
      { name: 'National Association of Home Builders', url: 'https://www.nahb.org' }
    ],
    // ... weitere Länder
  };
  
  return staticAssociations[country] || [];
}

async function scrapeAssociationMembers(url: string) {
  // Playwright: Mitgliederliste crawlen
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  
  // Mitglieder-Seite finden
  const memberLinks = await page.$$eval('a[href*="member"], a[href*="mitglied"]', 
    links => links.map(a => a.href)
  );
  
  const members = [];
  
  for (const link of memberLinks.slice(0, 50)) {
    await page.goto(link);
    
    // GPT-4: Firma extrahieren
    const content = await page.textContent('body');
    const company = await extractCompanyFromText(content);
    
    if (company) {
      members.push(company);
    }
  }
  
  await browser.close();
  return members;
}
```

### B3: Sortimentsvergleich

**Konzept:** Finde Firmen mit ähnlichen Produktkatalogen.

```typescript
// Discovery Method: Product Catalog Comparison
async function discoverViaSortiment(corporationId: string) {
  const corporation = await db.corporations.get(corporationId);
  const profile = await getCompanyProfile(corporationId);
  
  // 1. Für jedes Produkt: Google Shopping / Alibaba suchen
  for (const product of profile.products.slice(0, 3)) {
    const manufacturers = await searchProductManufacturers(product);
    
    for (const manufacturer of manufacturers) {
      // Duplikat-Check
      const existing = await db.corporations.findByName(manufacturer.name);
      if (existing) continue;
      
      // Similarity Check
      const manufacturerProfile = await analyzeWebsite(manufacturer.website);
      const score = calculateSimilarity(profile, manufacturerProfile);
      
      if (score > 70) {
        await db.scoutQueue.create({
          seedType: 'Expansion',
          seedData: manufacturer,
          priority: 5,
          generation: corporation.scoutGeneration + 1,
          parentId: corporationId,
          discoveryMethod: 'ProductCatalog'
        });
      }
    }
  }
}

async function searchProductManufacturers(productName: string) {
  // Google Shopping API oder Scraping
  const results = await googleSearch({
    query: `${productName} manufacturer`,
    numResults: 20
  });
  
  return results.map(r => ({
    name: r.title,
    website: r.url
  }));
}
```

### B4: Kundenvergleich

**Konzept:** Finde Firmen die gleiche Referenzkunden haben.

```typescript
// Discovery Method: Customer Analysis
async function discoverViaCustomers(corporationId: string) {
  const corporation = await db.corporations.get(corporationId);
  const profile = await getCompanyProfile(corporationId);
  
  // 1. Für jeden Referenzkunden: Suche andere Lieferanten
  for (const customer of profile.referenceCustomers) {
    // Google: "[Kunde] suppliers" oder "[Kunde] partners"
    const suppliers = await searchCustomerSuppliers(customer);
    
    for (const supplier of suppliers) {
      // Duplikat-Check
      const existing = await db.corporations.findByName(supplier.name);
      if (existing) continue;
      
      await db.scoutQueue.create({
        seedType: 'Expansion',
        seedData: {
          name: supplier.name,
          website: supplier.website,
          sharedCustomer: customer
        },
        priority: 6,
        generation: corporation.scoutGeneration + 1,
        parentId: corporationId,
        discoveryMethod: 'SharedCustomer'
      });
    }
  }
}
```

### B5: Pressemeldungen monitoren

**Konzept:** Überwache Bau-News für neue Projekte und Expansionen.

```typescript
// Discovery Method: Press Monitoring
async function monitorPress() {
  // RSS Feeds von Bau-News-Portalen
  const feeds = [
    'https://www.baulinks.de/rss.xml',
    'https://www.baunetzwissen.de/rss',
    // ... weitere
  ];
  
  for (const feedUrl of feeds) {
    const articles = await parseFeed(feedUrl);
    
    for (const article of articles) {
      // GPT-4: Firmen extrahieren
      const companies = await extractCompaniesFromText(article.content);
      
      for (const company of companies) {
        // Duplikat-Check
        const existing = await db.corporations.findByName(company.name);
        if (existing) continue;
        
        await db.scoutQueue.create({
          seedType: 'Expansion',
          seedData: {
            name: company.name,
            website: company.website,
            pressUrl: article.url,
            context: company.context
          },
          priority: 7,
          generation: 0, // Neue Seed
          discoveryMethod: 'PressMonitoring'
        });
      }
    }
  }
}
```

---

## Scout Worker: Kontinuierliche Verarbeitung

### Worker Loop

```typescript
// server/scout/worker.ts

export async function startScoutWorker() {
  console.log('[Scout Worker] Starting continuous loop...');
  
  while (true) {
    try {
      // 1. Nächsten Job aus Queue holen
      const job = await getNextScoutJob();
      
      if (!job) {
        // Keine Jobs: 5 Minuten warten
        console.log('[Scout Worker] Queue empty, sleeping...');
        await sleep(5 * 60 * 1000);
        continue;
      }
      
      console.log(`[Scout Worker] Processing job ${job.id} (Priority ${job.priority}, Gen ${job.generation})`);
      
      // 2. Job als "Processing" markieren
      await db.scoutQueue.update(job.id, {
        status: 'Processing',
        startedAt: new Date()
      });
      
      // 3. Job verarbeiten
      await processScoutJob(job);
      
      // 4. Job als "Completed" markieren
      await db.scoutQueue.update(job.id, {
        status: 'Completed',
        completedAt: new Date()
      });
      
      // 5. Kurze Pause (Rate Limiting)
      await sleep(10 * 1000); // 10 Sekunden
      
    } catch (error) {
      console.error('[Scout Worker] Error:', error);
      await sleep(60 * 1000); // 1 Minute bei Fehler
    }
  }
}

async function getNextScoutJob() {
  const db = await getDb();
  
  // Sortierung: Priority ASC, Generation ASC, ScheduledAt ASC
  const [job] = await db.select()
    .from(scoutQueue)
    .where(eq(scoutQueue.status, 'Pending'))
    .orderBy(
      asc(scoutQueue.priority),
      asc(scoutQueue.generation),
      asc(scoutQueue.scheduledAt)
    )
    .limit(1);
  
  return job;
}

async function processScoutJob(job: ScoutQueueJob) {
  if (job.corporationId) {
    // Bestehende Firma: Expansion
    await expandFromCorporation(job);
  } else {
    // Neue Seed: Analysieren
    await processSeed(job);
  }
}

async function processSeed(job: ScoutQueueJob) {
  const seedData = job.seedData;
  
  // 1. Website analysieren
  const profile = await analyzeWebsite(seedData.website);
  
  // 2. Filter: Umsatz >€100M?
  if (profile.employeeCount < 500) {
    console.log(`[Scout] Skipping ${seedData.name}: too small`);
    return;
  }
  
  // 3. Filter: International?
  if (!profile.international) {
    console.log(`[Scout] Skipping ${seedData.name}: not international`);
    return;
  }
  
  // 4. Als Suggestion speichern
  await db.competitorSuggestions.create({
    sourceCompanyId: job.parentId || null,
    suggestedName: seedData.name,
    country: seedData.country,
    website: seedData.website,
    ...profile,
    similarityScore: 75, // Default für Seeds
    reason: `Discovered via ${job.discoveryMethod}`,
    status: 'Pending'
  });
}

async function expandFromCorporation(job: ScoutQueueJob) {
  const corporation = await db.corporations.get(job.corporationId);
  
  // Stopp-Bedingung: Max. Generation
  if (corporation.scoutGeneration >= 5) {
    console.log(`[Scout] Stopping expansion for ${corporation.name}: max generation reached`);
    return;
  }
  
  // Discovery Methods ausführen
  const methods = await db.scoutDiscoveryMethods.findEnabled();
  
  for (const method of methods) {
    try {
      switch (method.name) {
        case 'CompetitorSearch':
          await discoverViaCompetitors(job.corporationId);
          break;
        case 'AssociationCrawl':
          await discoverViaAssociations(job.corporationId);
          break;
        case 'ProductCatalog':
          await discoverViaSortiment(job.corporationId);
          break;
        case 'SharedCustomer':
          await discoverViaCustomers(job.corporationId);
          break;
      }
      
      await db.scoutDiscoveryMethods.update(method.id, {
        lastRunAt: new Date(),
        successCount: method.successCount + 1
      });
      
    } catch (error) {
      console.error(`[Scout] Method ${method.name} failed:`, error);
      
      await db.scoutDiscoveryMethods.update(method.id, {
        failureCount: method.failureCount + 1
      });
    }
  }
}

async function discoverViaCompetitors(corporationId: string) {
  // Wie in SCOUT_AGENT_V2.md beschrieben
  const corporation = await db.corporations.get(corporationId);
  const profile = await getCompanyProfile(corporationId);
  
  for (const country of TOP_15_MARKETS) {
    const competitors = await findCompetitors(profile, country);
    
    for (const competitor of competitors) {
      await db.scoutQueue.create({
        seedType: 'Expansion',
        seedData: competitor,
        priority: 5,
        generation: corporation.scoutGeneration + 1,
        parentId: corporationId,
        discoveryMethod: 'Competitor'
      });
    }
  }
}
```

---

## Frontend: Scout Control Panel

### Dashboard

```typescript
// client/src/pages/ScoutDashboard.tsx

export default function ScoutDashboard() {
  const { data: stats } = trpc.scout.getQueueStatistics.useQuery();
  const { data: methods } = trpc.scout.getDiscoveryMethods.useQuery();
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Scout Agent Dashboard</h1>
      
      {/* Queue Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="In Queue" value={stats?.pending || 0} />
        <StatCard label="Processing" value={stats?.processing || 0} />
        <StatCard label="Completed Today" value={stats?.completedToday || 0} />
        <StatCard label="Total Discovered" value={stats?.totalDiscovered || 0} />
      </div>
      
      {/* Generation Tree */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Generation Tree</h2>
        <GenerationChart data={stats?.byGeneration} />
      </div>
      
      {/* Discovery Methods */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Discovery Methods</h2>
        <MethodsTable methods={methods} />
      </div>
      
      {/* Manual Seed */}
      <div>
        <h2 className="text-xl font-bold mb-4">Add Seed</h2>
        <SeedForm />
      </div>
    </div>
  );
}

function SeedForm() {
  const addSeed = trpc.scout.addSeed.useMutation();
  
  const [seedType, setSeedType] = useState<'Manual' | 'LinkedIn' | 'Press' | 'Association'>('Manual');
  
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      
      await addSeed.mutate({
        seedType,
        seedData: {
          name: formData.get('name'),
          website: formData.get('website'),
          country: formData.get('country')
        },
        priority: 1
      });
    }}>
      <select value={seedType} onChange={(e) => setSeedType(e.target.value)}>
        <option value="Manual">Manual</option>
        <option value="LinkedIn">LinkedIn</option>
        <option value="Press">Press</option>
        <option value="Association">Association</option>
      </select>
      
      {seedType === 'Manual' && (
        <>
          <input name="name" placeholder="Company Name" required />
          <input name="website" placeholder="Website URL" required />
          <input name="country" placeholder="Country (DE, US, ...)" required />
        </>
      )}
      
      {seedType === 'LinkedIn' && (
        <input name="linkedInUrl" placeholder="LinkedIn Company URL" required />
      )}
      
      {/* ... weitere Seed-Typen */}
      
      <button type="submit">Add to Queue</button>
    </form>
  );
}
```

---

## Zusammenfassung: Kontinuierlicher Prozess

### Ablauf

1. **Start:** 100 Genesis-Firmen (Generation 0)
2. **Generation 1:** Wettbewerber finden (700 Firmen)
3. **Approval:** User approved 490 Firmen
4. **Generation 2:** Wettbewerber von 490 Firmen (3.430 neue Firmen)
5. **Expansion:** Verbände, Sortimente, Kunden (weitere 1.000+ Firmen)
6. **Generation 3, 4, 5...:** Endlos weiter

### Stopp-Bedingungen

- Max. Generation: 5
- Similarity Score: <70
- Duplikate: Automatisch gefiltert
- Budget: API-Kosten-Limit

### Kontrolle

- **Priority System:** Manuelle Seeds (1) > Approved (2-3) > Auto (4-7)
- **Enable/Disable Methods:** Discovery Methods einzeln aktivieren/deaktivieren
- **Pause/Resume:** Worker stoppen/starten
- **Rate Limiting:** 10 Sekunden Pause zwischen Jobs

### Erwartete Ergebnisse

| Generation | Firmen | Kumulativ |
|------------|--------|-----------|
| 0 (Seed) | 100 | 100 |
| 1 | 700 | 800 |
| 2 | 3.430 | 4.230 |
| 3 | 10.000+ | 14.230+ |

**Nach 6 Monaten:** 10.000+ Target-Unternehmen weltweit

---

## Änderungen am ursprünglichen Plan

### Neue Komponenten

1. **Scout Queue System** (statt einmaliger Ausführung)
2. **Discovery Methods** (5 verschiedene Methoden)
3. **Generation Tracking** (Wettbewerber-Baum)
4. **Continuous Worker** (endlose Schleife)
5. **Priority System** (manuelle Seeds bevorzugt)

### Angepasste Datenbank

- Neue Tabelle: `scout_queue`
- Neue Tabelle: `scout_discovery_methods`
- Erweiterte `corporations`: `scoutGeneration`, `scoutParentId`, `discoveryMethod`

### Frontend-Erweiterungen

- Scout Dashboard (Queue Statistics, Generation Tree)
- Seed Form (manuelle Eingabe, LinkedIn, Press, Association)
- Discovery Methods Control Panel

---

Soll ich jetzt mit der Implementierung beginnen (Phase 1: Datenbank-Migration)?

