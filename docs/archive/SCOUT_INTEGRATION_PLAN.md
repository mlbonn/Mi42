# Scout Agent V2 - Integration in FRIDAY CRM
**Schritt-für-Schritt Implementierungsplan**

## Übersicht

Der Scout Agent V2 wird als eigenständiger Service in FRIDAY CRM integriert mit:
- Neuen Datenbank-Tabellen
- Backend-APIs (tRPC)
- Frontend-UI für Review
- Cron-Jobs für Automation

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    FRIDAY CRM                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Frontend   │  │   Backend    │  │   Database   │      │
│  │              │  │              │  │              │      │
│  │ - Review UI  │◄─┤ - tRPC API   │◄─┤ - Tables     │      │
│  │ - Dashboard  │  │ - Scout Jobs │  │ - Indexes    │      │
│  └──────────────┘  └──────┬───────┘  └──────────────┘      │
│                            │                                  │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Scout Agent    │
                    │  (Node.js Job)  │
                    ├─────────────────┤
                    │ - Playwright    │
                    │ - OpenAI GPT-4  │
                    │ - LinkedIn API  │
                    │ - Crunchbase    │
                    └─────────────────┘
```

---

## Phase 1: Datenbank-Schema erweitern

### 1.1 Neue Felder in `corporations`

```sql
-- Erweitere corporations Tabelle für Scout Agent
ALTER TABLE corporations 
  ADD COLUMN `products` TEXT COMMENT 'Komma-separierte Liste von Produkten',
  ADD COLUMN `targetMarkets` TEXT COMMENT 'Zielmärkte/Branchen',
  ADD COLUMN `countries` TEXT COMMENT 'Länder mit Präsenz (ISO-Codes)',
  ADD COLUMN `referenceCustomers` TEXT COMMENT 'Referenzkunden',
  ADD COLUMN `employeeCount` INT COMMENT 'Anzahl Mitarbeiter',
  ADD COLUMN `international` BOOLEAN DEFAULT FALSE COMMENT 'International tätig?',
  ADD COLUMN `profileAnalyzedAt` TIMESTAMP COMMENT 'Wann wurde Website analysiert?',
  ADD COLUMN `scoutStatus` VARCHAR(50) DEFAULT 'Not Analyzed' COMMENT 'Not Analyzed, Analyzing, Analyzed, Error';
```

### 1.2 Neue Tabelle: `competitor_suggestions`

```sql
CREATE TABLE IF NOT EXISTS `competitor_suggestions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `sourceCompanyId` VARCHAR(64) NOT NULL COMMENT 'Referenz-Firma (corporations.id)',
  `suggestedName` VARCHAR(255) NOT NULL,
  `country` VARCHAR(2) NOT NULL,
  `website` VARCHAR(500),
  `revenueEur` DECIMAL(10, 2),
  `employeeCount` INT,
  `products` TEXT,
  `targetMarkets` TEXT,
  `international` BOOLEAN,
  `similarityScore` INT COMMENT '0-100',
  `reason` TEXT COMMENT 'Warum ähnlich?',
  `status` VARCHAR(50) DEFAULT 'Pending' COMMENT 'Pending, Approved, Rejected',
  `reviewedBy` VARCHAR(64) COMMENT 'User ID',
  `reviewedAt` TIMESTAMP,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `suggestions_source_idx` (`sourceCompanyId`),
  INDEX `suggestions_status_idx` (`status`),
  INDEX `suggestions_score_idx` (`similarityScore`),
  
  FOREIGN KEY (`sourceCompanyId`) REFERENCES `corporations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.3 Neue Tabelle: `scout_executions`

```sql
CREATE TABLE IF NOT EXISTS `scout_executions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `corporationId` VARCHAR(64) NOT NULL COMMENT 'Welche Firma wurde analysiert?',
  `executionType` VARCHAR(50) NOT NULL COMMENT 'WebsiteAnalysis, CompetitorSearch',
  `status` VARCHAR(50) DEFAULT 'Running' COMMENT 'Running, Completed, Failed',
  `startedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completedAt` TIMESTAMP,
  `itemsFound` INT DEFAULT 0 COMMENT 'Anzahl gefundener Wettbewerber',
  `itemsFiltered` INT DEFAULT 0 COMMENT 'Nach Filtering',
  `errorMessage` TEXT,
  `metadata` JSON COMMENT 'Zusätzliche Infos',
  
  INDEX `executions_corp_idx` (`corporationId`),
  INDEX `executions_status_idx` (`status`),
  
  FOREIGN KEY (`corporationId`) REFERENCES `corporations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.4 Schema in Drizzle ORM

```typescript
// drizzle/schema.ts

// Erweitere corporations
export const corporations = mysqlTable("corporations", {
  // ... bestehende Felder ...
  
  // Scout Agent Felder
  products: text("products"),
  targetMarkets: text("targetMarkets"),
  countries: text("countries"),
  referenceCustomers: text("referenceCustomers"),
  employeeCount: int("employeeCount"),
  international: boolean("international").default(false),
  profileAnalyzedAt: timestamp("profileAnalyzedAt"),
  scoutStatus: varchar("scoutStatus", { length: 50 }).default("Not Analyzed"),
});

// Neue Tabellen
export const competitorSuggestions = mysqlTable("competitor_suggestions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  sourceCompanyId: varchar("sourceCompanyId", { length: 64 }).notNull(),
  suggestedName: varchar("suggestedName", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  website: varchar("website", { length: 500 }),
  revenueEur: decimal("revenueEur", { precision: 10, scale: 2 }),
  employeeCount: int("employeeCount"),
  products: text("products"),
  targetMarkets: text("targetMarkets"),
  international: boolean("international"),
  similarityScore: int("similarityScore"),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).default("Pending"),
  reviewedBy: varchar("reviewedBy", { length: 64 }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  sourceIdx: index("suggestions_source_idx").on(table.sourceCompanyId),
  statusIdx: index("suggestions_status_idx").on(table.status),
  scoreIdx: index("suggestions_score_idx").on(table.similarityScore),
}));

export const scoutExecutions = mysqlTable("scout_executions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  executionType: varchar("executionType", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("Running"),
  startedAt: timestamp("startedAt").defaultNow(),
  completedAt: timestamp("completedAt"),
  itemsFound: int("itemsFound").default(0),
  itemsFiltered: int("itemsFiltered").default(0),
  errorMessage: text("errorMessage"),
  metadata: json("metadata"),
}, (table) => ({
  corpIdx: index("executions_corp_idx").on(table.corporationId),
  statusIdx: index("executions_status_idx").on(table.status),
}));

export type CompetitorSuggestion = typeof competitorSuggestions.$inferSelect;
export type InsertCompetitorSuggestion = typeof competitorSuggestions.$inferInsert;
export type ScoutExecution = typeof scoutExecutions.$inferSelect;
export type InsertScoutExecution = typeof scoutExecutions.$inferInsert;
```

### 1.5 Migration durchführen

```bash
cd /home/ubuntu/friday-crm
pnpm db:push
```

---

## Phase 2: Backend - Database Helpers

### 2.1 Scout DB Functions

```typescript
// server/db.ts

// ============================================================================
// SCOUT AGENT - Database Helpers
// ============================================================================

export async function getCompaniesForScout() {
  const db = await getDb();
  if (!db) return [];
  
  // Firmen die noch nicht analysiert wurden
  return await db.select()
    .from(corporations)
    .where(eq(corporations.scoutStatus, "Not Analyzed"))
    .limit(10);
}

export async function updateCompanyProfile(
  corporationId: string,
  profile: {
    products?: string[];
    targetMarkets?: string[];
    countries?: string[];
    referenceCustomers?: string[];
    employeeCount?: number;
    international?: boolean;
  }
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(corporations)
    .set({
      products: profile.products?.join(", "),
      targetMarkets: profile.targetMarkets?.join(", "),
      countries: profile.countries?.join(", "),
      referenceCustomers: profile.referenceCustomers?.join(", "),
      employeeCount: profile.employeeCount,
      international: profile.international,
      profileAnalyzedAt: new Date(),
      scoutStatus: "Analyzed"
    })
    .where(eq(corporations.id, corporationId));
}

export async function createCompetitorSuggestion(
  suggestion: InsertCompetitorSuggestion
) {
  const db = await getDb();
  if (!db) return;
  
  const id = generateId();
  await db.insert(competitorSuggestions).values({
    id,
    ...suggestion
  });
  
  return id;
}

export async function getPendingSuggestions() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select({
    suggestion: competitorSuggestions,
    sourceCompany: corporations
  })
  .from(competitorSuggestions)
  .leftJoin(corporations, eq(competitorSuggestions.sourceCompanyId, corporations.id))
  .where(eq(competitorSuggestions.status, "Pending"))
  .orderBy(desc(competitorSuggestions.similarityScore));
}

export async function approveSuggestion(suggestionId: string, userId: string) {
  const db = await getDb();
  if (!db) return;
  
  // 1. Suggestion holen
  const [suggestion] = await db.select()
    .from(competitorSuggestions)
    .where(eq(competitorSuggestions.id, suggestionId))
    .limit(1);
  
  if (!suggestion) throw new Error("Suggestion not found");
  
  // 2. Status updaten
  await db.update(competitorSuggestions)
    .set({
      status: "Approved",
      reviewedBy: userId,
      reviewedAt: new Date()
    })
    .where(eq(competitorSuggestions.id, suggestionId));
  
  // 3. Als Corporation anlegen
  const corporationId = generateId();
  await db.insert(corporations).values({
    id: corporationId,
    name: suggestion.suggestedName,
    country: suggestion.country,
    website: suggestion.website,
    revenueEur: suggestion.revenueEur,
    products: suggestion.products,
    targetMarkets: suggestion.targetMarkets,
    employeeCount: suggestion.employeeCount,
    international: suggestion.international,
    status: "Target",
    priority: suggestion.similarityScore > 80 ? "High" : "Medium",
    stage: "Cold",
    source: `Scout Agent (similar to source company)`,
    scoutStatus: "Analyzed"
  });
  
  return corporationId;
}

export async function rejectSuggestion(suggestionId: string, userId: string) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(competitorSuggestions)
    .set({
      status: "Rejected",
      reviewedBy: userId,
      reviewedAt: new Date()
    })
    .where(eq(competitorSuggestions.id, suggestionId));
}

export async function createScoutExecution(
  execution: InsertScoutExecution
) {
  const db = await getDb();
  if (!db) return;
  
  const id = generateId();
  await db.insert(scoutExecutions).values({
    id,
    ...execution
  });
  
  return id;
}

export async function updateScoutExecution(
  executionId: string,
  updates: Partial<ScoutExecution>
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(scoutExecutions)
    .set(updates)
    .where(eq(scoutExecutions.id, executionId));
}
```

---

## Phase 3: Backend - tRPC API

### 3.1 Scout Router

```typescript
// server/routers.ts

import { z } from "zod";

export const appRouter = router({
  // ... bestehende Router ...
  
  scout: router({
    // Pending Suggestions abrufen
    getPendingSuggestions: protectedProcedure
      .query(async () => {
        return await getPendingSuggestions();
      }),
    
    // Suggestion Details
    getSuggestion: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        const [suggestion] = await db.select()
          .from(competitorSuggestions)
          .where(eq(competitorSuggestions.id, input.id))
          .limit(1);
        return suggestion;
      }),
    
    // Suggestion approven
    approveSuggestion: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const corporationId = await approveSuggestion(input.id, ctx.user.id);
        
        // Hunter Agent triggern (später implementiert)
        // await queueAgent({ type: 'Hunter', targetId: corporationId });
        
        return { success: true, corporationId };
      }),
    
    // Suggestion rejecten
    rejectSuggestion: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        await rejectSuggestion(input.id, ctx.user.id);
        return { success: true };
      }),
    
    // Bulk Approve
    bulkApproveSuggestions: protectedProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .mutation(async ({ input, ctx }) => {
        const corporationIds: string[] = [];
        
        for (const id of input.ids) {
          const corpId = await approveSuggestion(id, ctx.user.id);
          corporationIds.push(corpId);
        }
        
        return { success: true, count: corporationIds.length, corporationIds };
      }),
    
    // Bulk Reject
    bulkRejectSuggestions: protectedProcedure
      .input(z.object({ ids: z.array(z.string()) }))
      .mutation(async ({ input, ctx }) => {
        for (const id of input.ids) {
          await rejectSuggestion(id, ctx.user.id);
        }
        return { success: true, count: input.ids.length };
      }),
    
    // Scout Agent manuell triggern
    triggerScout: adminProcedure
      .input(z.object({ corporationId: z.string() }))
      .mutation(async ({ input }) => {
        // Job in Queue stellen (später implementiert)
        // await queueScoutJob(input.corporationId);
        
        return { success: true, message: "Scout Agent wird gestartet" };
      }),
    
    // Scout Execution History
    getExecutionHistory: protectedProcedure
      .input(z.object({ 
        corporationId: z.string().optional(),
        limit: z.number().default(20)
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        let query = db.select()
          .from(scoutExecutions)
          .orderBy(desc(scoutExecutions.startedAt))
          .limit(input.limit);
        
        if (input.corporationId) {
          query = query.where(eq(scoutExecutions.corporationId, input.corporationId));
        }
        
        return await query;
      }),
    
    // Statistics
    getStatistics: protectedProcedure
      .query(async () => {
        const db = await getDb();
        
        const [pending] = await db.select({ count: count() })
          .from(competitorSuggestions)
          .where(eq(competitorSuggestions.status, "Pending"));
        
        const [approved] = await db.select({ count: count() })
          .from(competitorSuggestions)
          .where(eq(competitorSuggestions.status, "Approved"));
        
        const [rejected] = await db.select({ count: count() })
          .from(competitorSuggestions)
          .where(eq(competitorSuggestions.status, "Rejected"));
        
        const [analyzed] = await db.select({ count: count() })
          .from(corporations)
          .where(eq(corporations.scoutStatus, "Analyzed"));
        
        return {
          pending: pending.count,
          approved: approved.count,
          rejected: rejected.count,
          companiesAnalyzed: analyzed.count
        };
      })
  })
});
```

---

## Phase 4: Scout Agent Service

### 4.1 Projektstruktur

```
server/
├── scout/
│   ├── index.ts              # Main Scout Agent
│   ├── websiteAnalyzer.ts    # Website-Crawling + GPT-4
│   ├── competitorFinder.ts   # Wettbewerber-Suche
│   ├── similarityScorer.ts   # Similarity Score
│   └── config.ts             # Konfiguration
```

### 4.2 Website Analyzer

```typescript
// server/scout/websiteAnalyzer.ts

import { chromium } from 'playwright';
import { invokeLLM } from '../_core/llm';

export async function analyzeWebsite(url: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Relevante Seiten finden
    const links = await page.$$eval('a[href]', (anchors) => 
      anchors.map(a => a.href).filter(href => 
        href.includes('/products') || 
        href.includes('/solutions') ||
        href.includes('/about') ||
        href.includes('/company')
      )
    );
    
    // Content sammeln
    let content = await page.textContent('body');
    
    // Zusätzliche Seiten crawlen
    for (const link of links.slice(0, 5)) {
      try {
        await page.goto(link, { timeout: 10000 });
        const pageContent = await page.textContent('body');
        content += '\n\n' + pageContent;
      } catch (e) {
        // Seite überspringen bei Fehler
      }
    }
    
    await browser.close();
    
    // GPT-4 Analyse
    const analysis = await invokeLLM({
      messages: [{
        role: "user",
        content: `
Analysiere diese Firmen-Website und extrahiere strukturierte Informationen.

**Website:** ${url}
**Content (gekürzt):**
${content.substring(0, 10000)}

**Zu extrahieren:**
1. Hauptprodukte (max. 5)
2. Zielmärkte/Branchen (max. 5)
3. Länder mit Präsenz (ISO-Codes)
4. Mitarbeiteranzahl (falls genannt)
5. International tätig? (Ja/Nein)

Antworte in JSON:
{
  "products": ["Produkt 1", "Produkt 2", ...],
  "targetMarkets": ["Markt 1", "Markt 2", ...],
  "countries": ["DE", "FR", ...],
  "employeeCount": 5000,
  "international": true
}
`
      }],
      response_format: { 
        type: "json_schema",
        json_schema: {
          name: "company_profile",
          strict: true,
          schema: {
            type: "object",
            properties: {
              products: { type: "array", items: { type: "string" } },
              targetMarkets: { type: "array", items: { type: "string" } },
              countries: { type: "array", items: { type: "string" } },
              employeeCount: { type: "number" },
              international: { type: "boolean" }
            },
            required: ["products", "targetMarkets", "countries", "international"],
            additionalProperties: false
          }
        }
      }
    });
    
    return JSON.parse(analysis.choices[0].message.content);
    
  } catch (error) {
    await browser.close();
    throw error;
  }
}
```

### 4.3 Competitor Finder

```typescript
// server/scout/competitorFinder.ts

const TOP_15_MARKETS = [
  "DE", "US", "CN", "UK", "JP", "CH", "NL", "AT", "DK", "FR",
  "IT", "ES", "SE", "NO", "BE"
];

export async function findCompetitors(
  companyProfile: CompanyProfile,
  targetCountry: string
) {
  const competitors: Competitor[] = [];
  
  // 1. Google Search
  const googleResults = await searchGoogle({
    query: `${companyProfile.products[0]} manufacturer ${targetCountry}`,
    numResults: 20
  });
  
  // 2. LinkedIn (falls API verfügbar)
  // const linkedInResults = await searchLinkedIn(...);
  
  // 3. Crunchbase (falls API verfügbar)
  // const crunchbaseResults = await searchCrunchbase(...);
  
  // Alle Ergebnisse kombinieren
  const allResults = [...googleResults];
  
  // Deduplizierung
  const unique = deduplicateByDomain(allResults);
  
  // Enrichment + Filtering
  for (const result of unique) {
    try {
      // Website analysieren
      const profile = await analyzeWebsite(result.url);
      
      // Filter: Umsatz >€100M (approximiert über Mitarbeiter)
      if (profile.employeeCount < 500) continue;
      
      // Filter: International
      if (!profile.international) continue;
      
      // Similarity Score
      const score = calculateSimilarity(companyProfile, profile);
      
      if (score > 60) {
        competitors.push({
          name: result.name,
          website: result.url,
          country: targetCountry,
          ...profile,
          similarityScore: score
        });
      }
    } catch (e) {
      // Fehler überspringen
      console.error(`Error analyzing ${result.url}:`, e);
    }
  }
  
  return competitors;
}

async function searchGoogle(params: { query: string; numResults: number }) {
  // Implementierung mit Google Custom Search API
  // oder Puppeteer für Scraping
  return [];
}
```

### 4.4 Main Scout Agent

```typescript
// server/scout/index.ts

import { analyzeWebsite } from './websiteAnalyzer';
import { findCompetitors } from './competitorFinder';
import { 
  getCompaniesForScout, 
  updateCompanyProfile,
  createCompetitorSuggestion,
  createScoutExecution,
  updateScoutExecution
} from '../db';

export async function runScoutAgent() {
  console.log('[Scout Agent] Starting...');
  
  // 1. Firmen holen die analysiert werden sollen
  const companies = await getCompaniesForScout();
  
  console.log(`[Scout Agent] Found ${companies.length} companies to analyze`);
  
  for (const company of companies) {
    const executionId = await createScoutExecution({
      corporationId: company.id,
      executionType: 'CompetitorSearch',
      status: 'Running'
    });
    
    try {
      // 2. Website analysieren
      console.log(`[Scout Agent] Analyzing ${company.name}...`);
      const profile = await analyzeWebsite(company.website);
      
      // 3. Profil speichern
      await updateCompanyProfile(company.id, profile);
      
      // 4. Wettbewerber suchen (pro Land)
      const TOP_15_MARKETS = ["DE", "US", "CN", "UK", "JP", "CH", "NL", "AT", "DK", "FR", "IT", "ES", "SE", "NO", "BE"];
      
      let totalFound = 0;
      
      for (const country of TOP_15_MARKETS) {
        console.log(`[Scout Agent] Searching competitors in ${country}...`);
        
        const competitors = await findCompetitors(profile, country);
        
        // 5. Als Suggestions speichern
        for (const competitor of competitors) {
          await createCompetitorSuggestion({
            sourceCompanyId: company.id,
            suggestedName: competitor.name,
            country: competitor.country,
            website: competitor.website,
            revenueEur: estimateRevenue(competitor.employeeCount),
            employeeCount: competitor.employeeCount,
            products: competitor.products.join(', '),
            targetMarkets: competitor.targetMarkets.join(', '),
            international: competitor.international,
            similarityScore: competitor.similarityScore,
            reason: generateReason(profile, competitor),
            status: 'Pending'
          });
          
          totalFound++;
        }
      }
      
      // 6. Execution als completed markieren
      await updateScoutExecution(executionId, {
        status: 'Completed',
        completedAt: new Date(),
        itemsFound: totalFound
      });
      
      console.log(`[Scout Agent] Found ${totalFound} competitors for ${company.name}`);
      
    } catch (error) {
      console.error(`[Scout Agent] Error analyzing ${company.name}:`, error);
      
      await updateScoutExecution(executionId, {
        status: 'Failed',
        completedAt: new Date(),
        errorMessage: error.message
      });
    }
  }
  
  console.log('[Scout Agent] Finished');
}

function estimateRevenue(employeeCount: number): number {
  // Grobe Schätzung: €200k Revenue pro Mitarbeiter
  return (employeeCount * 200000) / 1000000; // in Millionen
}

function generateReason(source: CompanyProfile, target: CompanyProfile): string {
  const reasons: string[] = [];
  
  // Produkt-Überschneidung
  const productOverlap = source.products.filter(p => 
    target.products.some(tp => tp.toLowerCase().includes(p.toLowerCase()))
  );
  if (productOverlap.length > 0) {
    reasons.push(`Ähnliche Produkte: ${productOverlap.join(', ')}`);
  }
  
  // Markt-Überschneidung
  const marketOverlap = source.targetMarkets.filter(m =>
    target.targetMarkets.some(tm => tm.toLowerCase().includes(m.toLowerCase()))
  );
  if (marketOverlap.length > 0) {
    reasons.push(`Gleiche Zielmärkte: ${marketOverlap.join(', ')}`);
  }
  
  // International
  if (source.international && target.international) {
    reasons.push('Beide international tätig');
  }
  
  return reasons.join(' | ');
}
```

### 4.5 Cron Job

```typescript
// server/scout/cron.ts

import cron from 'node-cron';
import { runScoutAgent } from './index';

// Jeden Montag um 2 Uhr morgens
export function startScoutCron() {
  cron.schedule('0 2 * * 1', async () => {
    console.log('[Cron] Starting Scout Agent...');
    await runScoutAgent();
  });
  
  console.log('[Cron] Scout Agent scheduled (every Monday 2am)');
}
```

---

## Phase 5: Frontend - Review UI

### 5.1 Neue Route

```typescript
// client/src/App.tsx

<Route path="/scout/review" component={ScoutReview} />
```

### 5.2 Scout Review Page

```typescript
// client/src/pages/ScoutReview.tsx

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

export default function ScoutReview() {
  const { data: suggestions, refetch } = trpc.scout.getPendingSuggestions.useQuery();
  const { data: stats } = trpc.scout.getStatistics.useQuery();
  
  const approve = trpc.scout.approveSuggestion.useMutation({
    onSuccess: () => refetch()
  });
  
  const reject = trpc.scout.rejectSuggestion.useMutation({
    onSuccess: () => refetch()
  });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const bulkApprove = trpc.scout.bulkApproveSuggestions.useMutation({
    onSuccess: () => {
      setSelectedIds([]);
      refetch();
    }
  });
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Wettbewerber-Vorschläge</h1>
        <p className="text-gray-600">
          Scout Agent hat ähnliche Unternehmen gefunden. Bitte reviewen Sie die Vorschläge.
        </p>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending" value={stats?.pending || 0} />
        <StatCard label="Approved" value={stats?.approved || 0} />
        <StatCard label="Rejected" value={stats?.rejected || 0} />
        <StatCard label="Analyzed" value={stats?.companiesAnalyzed || 0} />
      </div>
      
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 bg-gray-100 flex justify-between items-center">
          <span>{selectedIds.length} ausgewählt</span>
          <div className="flex gap-2">
            <Button onClick={() => bulkApprove.mutate({ ids: selectedIds })}>
              Alle approven
            </Button>
            <Button variant="outline" onClick={() => setSelectedIds([])}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
      
      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions?.map(({ suggestion, sourceCompany }) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            sourceCompany={sourceCompany}
            isSelected={selectedIds.includes(suggestion.id)}
            onSelect={(selected) => {
              if (selected) {
                setSelectedIds([...selectedIds, suggestion.id]);
              } else {
                setSelectedIds(selectedIds.filter(id => id !== suggestion.id));
              }
            }}
            onApprove={() => approve.mutate({ id: suggestion.id })}
            onReject={() => reject.mutate({ id: suggestion.id })}
          />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function SuggestionCard({ suggestion, sourceCompany, isSelected, onSelect, onApprove, onReject }) {
  return (
    <div className={`border p-6 ${isSelected ? 'bg-blue-50' : ''}`}>
      <div className="flex gap-4">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1"
        />
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold">{suggestion.suggestedName}</h3>
              <p className="text-sm text-gray-600">
                {suggestion.country} | €{suggestion.revenueEur}M Umsatz | {suggestion.employeeCount} Mitarbeiter
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold">{suggestion.similarityScore}</div>
              <div className="text-xs text-gray-600">Similarity</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-semibold mb-1">Ähnlich zu:</div>
              <div className="text-sm">{sourceCompany?.name}</div>
            </div>
            
            <div>
              <div className="text-sm font-semibold mb-1">Produkte:</div>
              <div className="text-sm">{suggestion.products}</div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-sm font-semibold mb-1">Grund:</div>
            <div className="text-sm text-gray-700">{suggestion.reason}</div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={onApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              ✓ Approve
            </Button>
            
            <Button 
              onClick={onReject}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              ✗ Reject
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => window.open(suggestion.website, '_blank')}
            >
              Website öffnen →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.3 Navigation erweitern

```typescript
// client/src/pages/Home.tsx oder DashboardLayout

<Link to="/scout/review">
  Scout Review ({pendingCount})
</Link>
```

---

## Phase 6: Testing & Deployment

### 6.1 Lokales Testing

```bash
# 1. Dependencies installieren
pnpm add playwright node-cron

# 2. Playwright Browser installieren
pnpm exec playwright install chromium

# 3. Scout Agent manuell testen
pnpm tsx server/scout/index.ts

# 4. Frontend testen
pnpm dev
# Öffne http://localhost:3000/scout/review
```

### 6.2 Deployment Checklist

- [ ] Umgebungsvariablen setzen (OPENAI_API_KEY)
- [ ] Playwright in Production (Chromium installiert?)
- [ ] Cron Job aktivieren
- [ ] Error Monitoring (Sentry?)
- [ ] Rate Limiting für APIs

---

## Zusammenfassung

**Neue Datenbank-Tabellen:**
- `competitor_suggestions` (Vorschlagsliste)
- `scout_executions` (Execution Log)
- Erweiterte `corporations` (Profile-Felder)

**Backend:**
- DB Helpers in `server/db.ts`
- tRPC Router `scout` mit 10 Endpoints
- Scout Agent Service in `server/scout/`

**Frontend:**
- Neue Route `/scout/review`
- Review UI mit Bulk Actions
- Statistics Dashboard

**Automation:**
- Cron Job (wöchentlich)
- Automatisches Triggern von Hunter Agent nach Approval

**Nächste Schritte:**
1. Datenbank-Migration durchführen
2. Scout Agent Service implementieren
3. Frontend UI bauen
4. Mit 5-10 Firmen testen
5. Cron Job aktivieren

---

Soll ich mit der Implementierung beginnen?

