# FRIDAY CRM - Nächste Schritte

## 📊 Status Quo

**✅ Fertig:**
- Core CRM (Corporations, Companies, Contacts, Deals)
- Notion-Style UI für Companies und Contacts Listen
- Alle Borders entfernt
- Multi-Company Contact Assignment
- CRUD-Operationen vollständig
- Scout Worker Daemon (274 Zeilen, 30s Polling)
- Backup auf Hetzner: `~/backups/friday-crm-backup-20251026-162310.tar.gz` (67MB)

**🚧 Placeholder-Seiten (18 Seiten):**
- Scout: Queue, Methods, Stats (3 Seiten)
- Hunter: Targets, Contacts, Review, Sources, Stats (5 Seiten)
- Outreach: Campaigns, Drafts, Review, Sent, Responses, Templates, Stats (7 Seiten)
- Analytics: Funnel, Agents, ROI (3 Seiten)

---

## 🎯 Vorschlag: Priorisierte Roadmap

### Phase 1: UI Polish & Konsistenz (2-3h)
**Ziel:** Notion-Style auf alle Haupt-Seiten ausrollen

1. **Dashboard (Home.tsx)**
   - Notion-Style Cards mit Stats
   - Kompakte Tabellen für Recent Activities
   - Gray-50 Background

2. **Deals Pipeline (Deals.tsx)**
   - Kanban-Board im Notion-Style
   - Checkboxes für Bulk-Actions
   - Kompakte Deal-Cards

3. **Corporation Detail (CorporationDetailNew.tsx)**
   - Notion-Style Tabs
   - Kompakte Company-Liste mit Icons
   - Gray Background für Sections

4. **Company Detail (CompanyDetail.tsx)**
   - Notion-Style Contact-Liste
   - Kompakte Activity Timeline
   - Pills für Tags/Status

5. **Contact Detail (ContactDetail.tsx)**
   - Notion-Style Company-Zuordnungen
   - Kompakte Activity-Liste
   - Pills für Status/Tags

**Aufwand:** ~2-3 Stunden
**Impact:** Konsistente UI über alle Seiten

---

### Phase 2: Scout Agent Funktionalität (4-6h)
**Ziel:** Scout Agent vollständig funktionsfähig machen

1. **Scout Dashboard (Scout.tsx)**
   - Stats-Cards (Total Discovered, Pending Review, Approved, Rejected)
   - Recent Discoveries Table
   - Generation Tree Visualization

2. **Scout Review Queue (ScoutReview.tsx)**
   - Table mit allen Pending Corporations
   - Bulk Actions (Approve, Reject, Edit)
   - Filter nach Discovery Method
   - Preview-Panel mit Corporation Details

3. **Scout Queue Monitor (neue Seite)**
   - Job Queue Status (Pending, Processing, Completed, Failed)
   - Real-time Updates (WebSocket oder Polling)
   - Retry Failed Jobs
   - Job Logs

4. **Discovery Methods Config (neue Seite)**
   - Enable/Disable Methods
   - Priority Settings
   - API Key Validation

**Aufwand:** ~4-6 Stunden
**Impact:** Scout Agent produktionsreif

---

### Phase 3: Hunter Agent Funktionalität (6-8h)
**Ziel:** Automatische Kontaktsuche implementieren

1. **Hunter Dashboard (HunterDashboard.tsx)**
   - Stats-Cards (Contacts Found, Emails Verified, LinkedIn Profiles)
   - Recent Finds Table
   - Data Source Status

2. **Target Companies (HunterTargetCompanies.tsx)**
   - Liste aller Companies ohne Kontakte
   - Bulk-Select für Hunter Jobs
   - Target Roles Configuration
   - Start Hunter Job Button

3. **Hunter Review Queue (HunterReview.tsx)**
   - Table mit gefundenen Kontakten
   - Email Verification Status
   - LinkedIn Profile Links
   - Approve/Reject Actions

4. **Hunter Worker Daemon**
   - Background Job Processing
   - Apollo.io Integration
   - Hunter.io Integration
   - Email Verification (ZeroBounce)

**Aufwand:** ~6-8 Stunden
**Impact:** Automatische Kontaktfindung

---

### Phase 4: Outreach Agent Funktionalität (8-10h)
**Ziel:** E-Mail-Kampagnen automatisieren

1. **Outreach Dashboard (OutreachDashboard.tsx)**
   - Stats-Cards (Campaigns, Sent, Opens, Replies)
   - Recent Campaigns Table
   - Response Rate Charts

2. **Campaigns (OutreachCampaigns.tsx)**
   - Campaign Creation Form
   - Target Segment Selection
   - Template Selection
   - Follow-Up Sequence Config

3. **Email Drafts Review (OutreachReview.tsx)**
   - GPT-4 Generated Drafts
   - Edit/Approve/Reject
   - Preview with Variables
   - Bulk Actions

4. **Sent Emails (OutreachSent.tsx)**
   - Sent Email History
   - Open/Click Tracking
   - Reply Status
   - Filter by Campaign

5. **Outreach Worker Daemon**
   - GPT-4 Email Generation
   - SMTP Integration
   - Tracking Pixel Implementation
   - Reply Detection

**Aufwand:** ~8-10 Stunden
**Impact:** Vollständige Outreach-Automatisierung

---

### Phase 5: Analytics & Reporting (4-6h)
**Ziel:** Performance-Tracking und ROI-Analyse

1. **Sales Funnel (neue Seite)**
   - Funnel Visualization (Lead → Contact → Demo → Deal → Customer)
   - Conversion Rates
   - Time in Stage
   - Bottleneck Analysis

2. **Agent Performance (neue Seite)**
   - Scout: Discovery Rate, Approval Rate
   - Hunter: Contact Find Rate, Email Verification Rate
   - Outreach: Open Rate, Reply Rate, Conversion Rate
   - Comparison Charts

3. **ROI Analysis (neue Seite)**
   - Cost per Lead
   - Cost per Deal
   - Revenue per Agent
   - Time Savings

**Aufwand:** ~4-6 Stunden
**Impact:** Datenbasierte Entscheidungen

---

### Phase 6: Settings & Admin (3-4h)
**Ziel:** User Management und Integrationen

1. **User Management (neue Seite)**
   - User List (Admin, Sales Manager, External Sales, Partner)
   - Create/Edit/Delete Users
   - Role Assignment
   - Password Reset

2. **Partner Management (neue Seite)**
   - Partner List
   - Commission Models
   - Deal Assignment
   - Revenue Tracking

3. **Integrations (neue Seite)**
   - Zapier Webhooks
   - Make.com Integration
   - n8n Workflows
   - Power BI Connector
   - Excel Add-In

**Aufwand:** ~3-4 Stunden
**Impact:** Multi-User Support

---

## 🚀 Empfohlene Reihenfolge

### Option A: "Quick Wins" (UI First)
1. **Phase 1:** UI Polish (2-3h) → Sofort sichtbare Verbesserung
2. **Phase 2:** Scout Agent (4-6h) → Erste AI-Funktionalität live
3. **Phase 3:** Hunter Agent (6-8h) → Automatische Kontaktsuche
4. **Phase 4:** Outreach Agent (8-10h) → Vollständige Automatisierung
5. **Phase 5:** Analytics (4-6h) → Performance-Tracking
6. **Phase 6:** Settings (3-4h) → Multi-User Support

**Gesamt:** ~27-37 Stunden

### Option B: "Feature Complete" (AI First)
1. **Phase 2:** Scout Agent (4-6h) → Core AI-Funktionalität
2. **Phase 3:** Hunter Agent (6-8h) → Kontaktsuche
3. **Phase 4:** Outreach Agent (8-10h) → E-Mail-Automatisierung
4. **Phase 1:** UI Polish (2-3h) → Konsistente UI
5. **Phase 5:** Analytics (4-6h) → Reporting
6. **Phase 6:** Settings (3-4h) → Admin-Features

**Gesamt:** ~27-37 Stunden

---

## 💡 Sofort umsetzbare Quick Wins

### 1. Dashboard Redesign (30 min)
- Notion-Style Stats-Cards
- Recent Activities Table
- Gray-50 Background

### 2. Deals Pipeline Notion-Style (1h)
- Kanban-Board mit Checkboxes
- Kompakte Deal-Cards
- Drag & Drop

### 3. Mobile Button Fix (30 min)
- Touch Event Handler für Edit-Buttons
- Tested auf iPhone

### 4. Contact Duplicate Fix (30 min)
- Debouncing für Create-Mutation
- Submission State Management

### 5. TypeScript Errors Fix (30 min)
- Settings.tsx Index Signature
- seedUsersAndData.ts createdBy Field

**Gesamt Quick Wins:** ~3 Stunden

---

## 🎨 Design-Prinzipien (Notion-Style)

- **Background:** `bg-gray-50` (F7F6F3)
- **Cards:** `bg-white` mit `shadow-sm` und `rounded-lg`
- **Fonts:** `text-xs` für Labels, `text-sm` für Content, `text-base` für Headings
- **Spacing:** Kompakt mit `py-2` und `px-3`
- **Icons:** Lucide Icons (Building2, User, Mail, Phone, etc.)
- **Pills:** `rounded-full` mit `px-2 py-0.5` und Soft-Colors (bg-gray-100, bg-blue-50, etc.)
- **Checkboxes:** Für Bulk-Actions in allen Listen
- **Borders:** Transparent oder sehr subtle (`border-gray-100`)

---

## 📝 Nächste Schritte - Entscheidung

**Frage an dich:**

1. **Welche Option bevorzugst du?**
   - Option A: UI First (Quick Wins)
   - Option B: AI First (Feature Complete)

2. **Welche Phase soll ich als nächstes umsetzen?**
   - Phase 1: UI Polish (2-3h)
   - Phase 2: Scout Agent (4-6h)
   - Quick Wins (3h)

3. **Gibt es spezifische Features mit höherer Priorität?**
   - z.B. Mobile Button Fix
   - z.B. Scout Review Queue
   - z.B. Dashboard Redesign

---

## 🔧 Technische Schulden

- [ ] TypeScript Errors (Settings.tsx, seedUsersAndData.ts)
- [ ] Scout Worker MySQL Permissions (Hetzner Remote Access)
- [ ] Contact Creation Duplicates (React Strict Mode)
- [ ] Mobile Touch Events (Edit Buttons)
- [ ] Build Warnings (Chunk Size > 500KB)

---

**Backup Location:** `manus02@46.224.13.250:~/backups/friday-crm-backup-20251026-162310.tar.gz`

