# FRIDAY CRM - Scout Agent Analyse

**Datum:** 26. Oktober 2025  
**Status:** Teilweise implementiert, nicht produktionsreif

---

## 📊 Aktueller Stand

### ✅ Implementiert & Funktionsfähig

#### 1. **Frontend UI (100%)**
- **Scout Dashboard** (`Scout.tsx`)
  - Queue Stats (Total, Pending, Processing)
  - Pending Review Count
  - Total Discovered Count
  - Active Methods Count
  - Generationen-Baum Tabelle
  - Neueste Vorschläge Liste
  - Navigation zu Seed/Review/Methods

- **Scout Review Queue** (`ScoutReview.tsx`)
  - Suggestions Table mit Checkboxen
  - Bulk Actions (Approve/Reject)
  - Generation Filter
  - Individual Approve/Reject Buttons
  - Website-Links zur Verifizierung

- **Scout Seed Form** (`ScoutSeed.tsx`)
  - Manuelle Eingabe (Name + Website)
  - LinkedIn-URL Import
  - Pressemeldung-URL Import
  - Auto-normalisierung von URLs

#### 2. **Backend API (100%)**
- **tRPC Router** (`scoutRouter.ts`)
  - `addToQueue`: Seed zur Queue hinzufügen
  - `getQueueJobs`: Queue Jobs abrufen
  - `getQueueStats`: Queue Statistiken
  - `deleteQueueJob`: Job löschen
  - `getDiscoveryMethods`: Methods abrufen
  - `updateDiscoveryMethod`: Method konfigurieren
  - `getSuggestions`: Vorschläge abrufen
  - `approveSuggestion`: Einzeln approven
  - `rejectSuggestion`: Einzeln rejecten
  - `bulkApprove`: Bulk Approve
  - `bulkReject`: Bulk Reject
  - `getGenerationStats`: Generationen-Statistiken

#### 3. **Database Layer (100%)**
- **Scout Queue Table** (`scoutQueue`)
  - id, seedType, seedData, priority, status
  - generation, parentId, discoveryMethod
  - createdAt, startedAt, completedAt, errorMessage

- **Discovery Methods Table** (`discoveryMethods`)
  - id, name, description, enabled, priority, config

- **Corporations Scout Fields**
  - scoutStatus: "Not Analyzed" | "Pending" | "Approved" | "Rejected"
  - scoutGeneration: 0-5
  - scoutParentId: string | null
  - discoveryMethod: string | null
  - discoveredAt: Date | null

#### 4. **Background Worker (80%)**
- **Scout Worker Daemon** (`scoutWorkerDaemon.ts`)
  - ✅ 30s Polling Interval
  - ✅ Single Job Processing
  - ✅ Error Handling
  - ✅ Graceful Shutdown
  - ✅ Worker Statistics
  - ⚠️ **NICHT GESTARTET** (nur compiled, nicht running)

- **Scout Worker** (`scoutWorker.ts`)
  - ✅ processNextQueueJob()
  - ✅ Job Status Updates
  - ⚠️ **AI-Integration fehlt** (OpenAI GPT-4 Calls)

---

## ❌ Nicht Implementiert / Fehlt

### 1. **Worker Deployment**
**Problem:** Scout Worker Daemon ist compiled aber läuft nicht

**Lösung:**
```bash
# Auf Hetzner Server:
cd ~/friday-crm
PORT=3003 nohup node dist/scoutWorkerDaemon.js > scout-worker.log 2>&1 &

# Oder als systemd Service:
sudo systemctl enable friday-scout-worker
sudo systemctl start friday-scout-worker
```

**Status:** ⚠️ **KRITISCH** - Worker muss laufen für Automatisierung

---

### 2. **AI-Integration (GPT-4)**
**Problem:** scoutWorker.ts hat keine OpenAI Integration

**Was fehlt:**
- LinkedIn Profile Scraping & Analysis
- Competitor Discovery via GPT-4
- Website Analysis
- Press Release Parsing
- Company Data Extraction

**Implementierung erforderlich:**
```typescript
// In scoutWorker.ts
import OpenAI from 'openai';

async function analyzeCompanyWebsite(url: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  // 1. Scrape Website Content
  const content = await scrapeWebsite(url);
  
  // 2. GPT-4 Analysis
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: 'Analyze company website and extract: competitors, products, markets, customers'
    }, {
      role: 'user',
      content: content
    }]
  });
  
  // 3. Parse Response & Create Suggestions
  return parseCompetitors(response);
}
```

**Status:** ⚠️ **KRITISCH** - Kern-Funktionalität fehlt

---

### 3. **Discovery Methods Implementation**
**Problem:** Methods sind in DB aber nicht implementiert

**Fehlende Methods:**
1. **Competitor Analysis** (Priority 1)
   - Website scraping
   - GPT-4 competitor extraction
   - Top-15-Märkte Analyse

2. **Association Discovery** (Priority 2)
   - Verbände & Organisationen
   - Mitgliederlisten scrapen

3. **Product Range Analysis** (Priority 3)
   - Produktkataloge analysieren
   - Ähnliche Hersteller finden

4. **Customer Discovery** (Priority 4)
   - Referenzkunden analysieren
   - Ähnliche Kunden finden

5. **Press Release Analysis** (Priority 5)
   - Pressemeldungen parsen
   - Erwähnte Firmen extrahieren

**Status:** ⚠️ **HOCH** - Nur Struktur vorhanden, keine Logik

---

### 4. **Data Enrichment**
**Problem:** Keine automatische Anreicherung von Corporation-Daten

**Was fehlt:**
- LinkedIn Company Profile Scraping
- Revenue/Employee Count via APIs
- Industry Classification
- Contact Discovery (→ Hunter Agent)

**Integration erforderlich:**
- Apollo.io API
- LinkedIn Sales Navigator API
- Hunter.io API

**Status:** ⚠️ **MITTEL** - Nice-to-have, nicht kritisch

---

### 5. **Queue Monitoring UI**
**Problem:** Placeholder-Seite für Queue Monitor

**Was fehlt:**
- Real-time Queue Status
- Job Logs Viewer
- Retry Failed Jobs
- Worker Health Status

**Implementierung:**
```tsx
// ScoutQueue.tsx (neue Seite)
- Job List (Pending, Processing, Completed, Failed)
- Filter by Status/Generation
- Retry Button für Failed Jobs
- Worker Stats (Uptime, Processed, Errors)
- Real-time Updates (WebSocket oder Polling)
```

**Status:** ⚠️ **NIEDRIG** - Optional, für Debugging hilfreich

---

### 6. **Discovery Methods Config UI**
**Problem:** Placeholder-Seite für Methods Configuration

**Was fehlt:**
- Enable/Disable Methods
- Priority Settings
- API Key Validation
- Method-specific Config

**Implementierung:**
```tsx
// ScoutMethods.tsx (neue Seite)
- Methods List mit Toggle Switches
- Priority Slider (1-10)
- Config Forms (API Keys, Parameters)
- Test Method Button
```

**Status:** ⚠️ **NIEDRIG** - Optional, kann über DB direkt gemacht werden

---

## 🚀 Empfohlene Nächste Schritte

### Phase 1: Worker Deployment (30 min) ⚡ **KRITISCH**
1. Scout Worker Daemon auf Hetzner starten
2. Logs prüfen (scout-worker.log)
3. Verify Polling funktioniert
4. Test Job Processing

**Aufwand:** 30 Minuten  
**Impact:** Worker läuft im Hintergrund

---

### Phase 2: Minimal AI Integration (2-3h) ⚡ **KRITISCH**
1. **Website Scraping**
   - Puppeteer/Playwright Integration
   - HTML → Text Extraction
   - Error Handling

2. **GPT-4 Competitor Discovery**
   - Prompt Engineering
   - Response Parsing
   - Corporation Creation

3. **Test mit 1 Seed**
   - Knauf Gips KG → Competitors
   - Verify Queue Processing
   - Check Suggestions

**Aufwand:** 2-3 Stunden  
**Impact:** Erste echte Discoveries

---

### Phase 3: Discovery Methods (4-6h) ⚠️ **HOCH**
1. **Competitor Analysis Method**
   - Top-15-Märkte Logic
   - Multi-Country Discovery
   - Generation Tracking

2. **Press Release Method**
   - URL Parsing
   - Company Name Extraction
   - Duplicate Detection

3. **LinkedIn Method**
   - Profile Scraping
   - Company Data Extraction
   - Competitor Links

**Aufwand:** 4-6 Stunden  
**Impact:** Vollständige Discovery Pipeline

---

### Phase 4: Queue Monitor UI (2h) ⚠️ **MITTEL**
1. ScoutQueue.tsx Page
2. Real-time Updates
3. Retry Failed Jobs
4. Worker Health Dashboard

**Aufwand:** 2 Stunden  
**Impact:** Besseres Monitoring

---

### Phase 5: Data Enrichment (3-4h) ⚠️ **MITTEL**
1. Apollo.io Integration
2. LinkedIn API Integration
3. Auto-Enrichment Pipeline
4. Hunter Agent Trigger

**Aufwand:** 3-4 Stunden  
**Impact:** Bessere Datenqualität

---

## 🎯 Minimal Viable Scout Agent (MVP)

**Ziel:** Scout Agent funktionsfähig in 3-4 Stunden

**Scope:**
1. ✅ Worker Deployment (30 min)
2. ✅ Website Scraping (1h)
3. ✅ GPT-4 Competitor Discovery (1-2h)
4. ✅ Test & Debug (30 min)

**Out of Scope:**
- Discovery Methods Config UI
- Queue Monitor UI
- Data Enrichment
- LinkedIn/Press Methods

**Ergebnis:**
- Scout Worker läuft
- Seed → Competitors funktioniert
- Suggestions erscheinen in Review Queue
- Approve → Nächste Generation

---

## 📝 Technische Schulden

### 1. **MySQL Remote Access**
**Problem:** Scout Worker auf Hetzner kann nicht auf MySQL zugreifen

**Lösung:**
```sql
-- Auf MySQL Server:
CREATE USER 'friday_worker'@'46.224.13.250' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON friday_crm.* TO 'friday_worker'@'46.224.13.250';
FLUSH PRIVILEGES;
```

**Status:** ⚠️ **KRITISCH** - Ohne DB-Zugriff kein Worker

---

### 2. **OpenAI API Key**
**Problem:** OPENAI_API_KEY muss auf Hetzner Server verfügbar sein

**Lösung:**
```bash
# In .env auf Hetzner:
OPENAI_API_KEY=sk-...
```

**Status:** ⚠️ **KRITISCH** - Ohne API Key keine AI

---

### 3. **Error Handling**
**Problem:** Keine Retry-Logic für Failed Jobs

**Lösung:**
- Exponential Backoff
- Max Retries (3x)
- Dead Letter Queue

**Status:** ⚠️ **MITTEL** - Kann später optimiert werden

---

### 4. **Rate Limiting**
**Problem:** Keine Rate Limits für OpenAI API

**Lösung:**
- Token Counting
- Request Throttling
- Cost Tracking

**Status:** ⚠️ **NIEDRIG** - Erst bei Scale relevant

---

## 💡 Empfehlung

**Start mit Phase 1 + 2:**
1. Worker Deployment (30 min)
2. Minimal AI Integration (2-3h)

**Gesamt:** ~3 Stunden für funktionsfähigen Scout Agent

**Danach:**
- Testen mit echten Seeds
- Iterativ verbessern
- Discovery Methods hinzufügen

**Frage an dich:** Soll ich mit Phase 1 (Worker Deployment) starten?

