# FRIDAY CRM - Placeholder Pages Analysis

## 📊 Übersicht

**Stand:** 27. Oktober 2025  
**Gesamt Seiten:** 26  
**Fertige Seiten:** 13  
**Placeholder Seiten:** 13

---

## ✅ Fertige Seiten (13)

### Core CRM (7 Seiten)
1. **Dashboard** (`/`) - Home.tsx ✅
2. **Konzerne** (`/corporations`) - Corporations.tsx ✅
3. **Konzern Detail** (`/corporations/:id`) - CorporationDetailNew.tsx ✅
4. **Firmen** (`/companies`) - Companies.tsx ✅
5. **Firmen Detail** (`/companies/:id`) - CompanyDetail.tsx ✅
6. **Kontakte** (`/contacts`) - Contacts.tsx ✅
7. **Kontakt Detail** (`/contacts/:id`) - ContactDetail.tsx ✅

### Scout Agent (3 Seiten)
8. **Scout Dashboard** (`/scout`) - Scout.tsx ✅
9. **Seed hinzufügen** (`/scout/seed`) - ScoutSeed.tsx ✅
10. **Review Queue** (`/scout/review`) - ScoutReview.tsx ✅

### Hunter Agent (3 Seiten)
11. **Hunter Dashboard** (`/hunter`) - HunterDashboard.tsx ✅
12. **Target Companies** (`/hunter/targets`) - HunterTargetCompanies.tsx ✅
13. **Review Queue** (`/hunter/review`) - HunterReview.tsx ✅

---

## 🚧 Placeholder Seiten (13)

### Scout Agent (3 Seiten)
1. **Job Queue** (`/scout/queue`) - ScoutQueuePage 🚧
   - **Beschreibung:** Übersicht über alle Scout Agent Jobs (Pending, Processing, Completed, Failed)
   - **Priorität:** HOCH (für Debugging und Monitoring)
   - **Aufwand:** 2-3 Stunden

2. **Discovery Methods** (`/scout/methods`) - ScoutMethodsPage 🚧
   - **Beschreibung:** Konfiguration der Discovery-Methoden (Wettbewerber, Verbände, Sortiment, Kunden, Presse)
   - **Priorität:** MITTEL (Settings-Seite)
   - **Aufwand:** 1-2 Stunden

3. **Statistiken** (`/scout/stats`) - ScoutStatsPage 🚧
   - **Beschreibung:** Detaillierte Statistiken und Analytics für Scout Agent Performance
   - **Priorität:** NIEDRIG (Nice-to-have)
   - **Aufwand:** 3-4 Stunden

### Hunter Agent (3 Seiten)
4. **Gefundene Kontakte** (`/hunter/found-contacts`) - HunterContactsPage 🚧
   - **Beschreibung:** Alle von Hunter Agent gefundenen Ansprechpartner mit E-Mail-Adressen und LinkedIn-Profilen
   - **Priorität:** HOCH (Kerntabelle für Hunter)
   - **Aufwand:** 2-3 Stunden

5. **Datenquellen** (`/hunter/data-sources`) - HunterSourcesPage 🚧
   - **Beschreibung:** Konfiguration von Datenquellen (Apollo.io, Hunter.io, LinkedIn Sales Navigator)
   - **Priorität:** MITTEL (Settings-Seite)
   - **Aufwand:** 1-2 Stunden

6. **Statistiken** (`/hunter/stats`) - HunterStatsPage 🚧
   - **Beschreibung:** Detaillierte Statistiken über Kontaktfindung und Verifizierung
   - **Priorität:** NIEDRIG (Nice-to-have)
   - **Aufwand:** 3-4 Stunden

### Outreach Agent (4 Seiten)
7. **E-Mail Drafts** (`/outreach/drafts`) - OutreachDraftsPage 🚧
   - **Beschreibung:** Von GPT-4 generierte E-Mail-Drafts zur manuellen Review
   - **Priorität:** HOCH (Kerntabelle für Outreach)
   - **Aufwand:** 2-3 Stunden

8. **Antworten** (`/outreach/responses`) - OutreachResponsesPage 🚧
   - **Beschreibung:** Eingehende E-Mail-Antworten und Lead-Qualifizierung
   - **Priorität:** HOCH (Kerntabelle für Outreach)
   - **Aufwand:** 3-4 Stunden

9. **Templates** (`/outreach/templates`) - OutreachTemplatesPage 🚧
   - **Beschreibung:** E-Mail-Templates für verschiedene Branchen und Use Cases
   - **Priorität:** MITTEL (Settings-Seite)
   - **Aufwand:** 2-3 Stunden

10. **Statistiken** (`/outreach/stats`) - OutreachStatsPage 🚧
    - **Beschreibung:** Detaillierte Statistiken über E-Mail-Performance (Open Rate, Response Rate, Conversion Rate)
    - **Priorität:** NIEDRIG (Nice-to-have)
    - **Aufwand:** 3-4 Stunden

### Analytics (3 Seiten)
11. **Sales Funnel** (`/analytics/funnel`) - AnalyticsFunnelPage 🚧
    - **Beschreibung:** Visualisierung des gesamten Sales Funnels von Lead-Generierung bis Deal Close
    - **Priorität:** MITTEL (Business Intelligence)
    - **Aufwand:** 4-5 Stunden

12. **Agent Performance** (`/analytics/agents`) - AnalyticsAgentsPage 🚧
    - **Beschreibung:** Vergleich der Performance aller AI Agents (Scout, Hunter, Outreach)
    - **Priorität:** NIEDRIG (Nice-to-have)
    - **Aufwand:** 3-4 Stunden

13. **ROI Analysis** (`/analytics/roi`) - AnalyticsROIPage 🚧
    - **Beschreibung:** Return on Investment Analyse für FRIDAY CRM und AI Agents
    - **Priorität:** NIEDRIG (Nice-to-have)
    - **Aufwand:** 4-5 Stunden

---

## 🎯 Priorisierte Roadmap

### Phase 1: Scout Agent Completion (5-7h) ⭐⭐⭐
**Ziel:** Scout Agent vollständig funktionsfähig machen

1. **Scout Job Queue** (2-3h) - HOCH
   - Real-time Job Status Table
   - Filter: Pending, Processing, Completed, Failed
   - Retry Failed Jobs Button
   - Job Logs Viewer
   - Auto-refresh (WebSocket oder Polling)

2. **Scout Discovery Methods** (1-2h) - MITTEL
   - Enable/Disable Toggles für jede Methode
   - Priority Slider (1-5)
   - API Key Validation Status
   - Test Discovery Button

3. **Scout Statistiken** (3-4h) - NIEDRIG
   - Discovery Rate Chart (Timeline)
   - Approval Rate Pie Chart
   - Top Performing Methods
   - Generation Tree Depth

**Impact:** Scout Agent produktionsreif, vollständiges Monitoring

---

### Phase 2: Hunter Agent Completion (6-9h) ⭐⭐⭐
**Ziel:** Hunter Agent vollständig funktionsfähig machen

1. **Hunter Gefundene Kontakte** (2-3h) - HOCH
   - Table mit allen gefundenen Kontakten
   - Columns: Name, Email, Title, Company, Confidence, Status
   - Filter: Email Status (Verified, Guessed, Unknown)
   - Bulk Actions: Approve, Reject, Export
   - Email Verification Badge

2. **Hunter Datenquellen** (1-2h) - MITTEL
   - Apollo.io Status (API Key, Credits, Last Sync)
   - Hunter.io Status (wenn integriert)
   - LinkedIn Sales Navigator Status
   - Test Connection Buttons
   - Usage Statistics

3. **Hunter Statistiken** (3-4h) - NIEDRIG
   - Contacts Found Chart (Timeline)
   - Email Verification Rate
   - LinkedIn Profile Coverage
   - Data Source Comparison

**Impact:** Hunter Agent produktionsreif, vollständige Transparenz

---

### Phase 3: Outreach Agent Completion (10-14h) ⭐⭐
**Ziel:** Outreach Agent vollständig funktionsfähig machen

1. **Outreach E-Mail Drafts** (2-3h) - HOCH
   - Table mit GPT-4 generierten Drafts
   - Preview Panel mit Variable Substitution
   - Edit Draft Modal
   - Approve/Reject Actions
   - Bulk Actions

2. **Outreach Antworten** (3-4h) - HOCH
   - Inbox-Style Table
   - Email Thread Viewer
   - Lead Qualification Tags
   - Reply Button (opens Email Client)
   - Auto-categorization (Interested, Not Interested, Out of Office)

3. **Outreach Templates** (2-3h) - MITTEL
   - Template Library
   - Create/Edit/Delete Templates
   - Variables Placeholder Guide
   - Industry-specific Templates
   - A/B Testing Setup

4. **Outreach Statistiken** (3-4h) - NIEDRIG
   - Open Rate Chart
   - Click Rate Chart
   - Response Rate Chart
   - Conversion Funnel
   - Best Performing Templates

**Impact:** Outreach Agent produktionsreif, vollständige E-Mail-Automatisierung

---

### Phase 4: Analytics (11-14h) ⭐
**Ziel:** Business Intelligence und Reporting

1. **Sales Funnel** (4-5h) - MITTEL
   - Funnel Visualization (Recharts/Plotly)
   - Stages: Lead → Contact → Demo → Proposal → Deal → Customer
   - Conversion Rates between stages
   - Time in Stage Analysis
   - Bottleneck Identification

2. **Agent Performance** (3-4h) - NIEDRIG
   - Scout: Discovery Rate, Approval Rate, Time per Discovery
   - Hunter: Contact Find Rate, Email Verification Rate, LinkedIn Coverage
   - Outreach: Open Rate, Response Rate, Conversion Rate
   - Comparison Charts
   - Trend Analysis

3. **ROI Analysis** (4-5h) - NIEDRIG
   - Cost per Lead (API Costs / Leads)
   - Cost per Deal (Total Costs / Deals)
   - Revenue per Agent
   - Time Savings (Manual vs Automated)
   - Break-even Analysis

**Impact:** Datenbasierte Entscheidungen, Performance-Tracking

---

## 📋 Implementierungs-Vorschlag

### Option A: "Feature Complete" (Scout + Hunter First) ⭐⭐⭐
**Fokus:** Vollständige Lead-Generierung

1. **Phase 1:** Scout Agent Completion (5-7h)
2. **Phase 2:** Hunter Agent Completion (6-9h)
3. **Phase 3:** Outreach Agent Completion (10-14h)
4. **Phase 4:** Analytics (11-14h)

**Gesamt:** 32-44 Stunden  
**Vorteil:** Vollständiger Lead-Gen Workflow (Scout → Hunter → Outreach)

---

### Option B: "Quick Wins" (Kerntabellen First) ⭐⭐
**Fokus:** Wichtigste Tabellen zuerst

1. **Scout Job Queue** (2-3h) - Monitoring
2. **Hunter Gefundene Kontakte** (2-3h) - Kontaktliste
3. **Outreach E-Mail Drafts** (2-3h) - Draft Review
4. **Outreach Antworten** (3-4h) - Inbox
5. **Sales Funnel** (4-5h) - Analytics
6. **Rest der Seiten** (Settings + Stats)

**Gesamt:** 13-18h für Kerntabellen, dann 19-26h für Rest  
**Vorteil:** Schnellere Sichtbarkeit der wichtigsten Features

---

### Option C: "Settings First" (Configuration) ⭐
**Fokus:** Konfiguration und Setup

1. **Scout Discovery Methods** (1-2h)
2. **Hunter Datenquellen** (1-2h)
3. **Outreach Templates** (2-3h)
4. **Dann Kerntabellen**
5. **Dann Analytics**

**Gesamt:** 4-7h Settings, dann 28-37h Rest  
**Vorteil:** Bessere Konfigurierbarkeit vor Feature-Nutzung

---

## 💡 Empfehlung

**Ich empfehle Option A: "Feature Complete"**

**Begründung:**
1. **Scout Agent** ist bereits zu 50% fertig (Dashboard + Review + Seed)
   - Job Queue fehlt für vollständiges Monitoring
   - Discovery Methods für Konfiguration
   - Stats für Performance-Tracking

2. **Hunter Agent** ist bereits zu 50% fertig (Dashboard + Targets + Review)
   - Gefundene Kontakte ist die Kerntabelle (MUSS)
   - Datenquellen für API-Management
   - Stats für Transparenz

3. **Outreach Agent** ist zu 25% fertig (Dashboard + Campaigns + Review + Sent)
   - Drafts und Antworten sind Kerntabellen (MUSS)
   - Templates für Wiederverwendbarkeit
   - Stats für Performance

4. **Analytics** ist komplett leer
   - Sales Funnel ist wichtigste Seite
   - Agent Performance für Vergleich
   - ROI für Business Case

**Reihenfolge:**
1. Scout Agent (5-7h) → Vollständig produktionsreif
2. Hunter Agent (6-9h) → Vollständig produktionsreif
3. Outreach Agent (10-14h) → Vollständig produktionsreif
4. Analytics (11-14h) → Business Intelligence

**Gesamt:** 32-44 Stunden für vollständiges System

---

## 🚀 Nächste Schritte

**Frage an dich:**

1. **Welche Option bevorzugst du?**
   - A: Feature Complete (Scout + Hunter + Outreach + Analytics)
   - B: Quick Wins (Kerntabellen zuerst)
   - C: Settings First (Konfiguration zuerst)

2. **Womit soll ich starten?**
   - Scout Job Queue (2-3h) - Monitoring
   - Hunter Gefundene Kontakte (2-3h) - Kontaktliste
   - Outreach E-Mail Drafts (2-3h) - Draft Review
   - Sales Funnel (4-5h) - Analytics

3. **Gibt es spezifische Features mit höherer Priorität?**
   - z.B. Scout Job Queue für Debugging
   - z.B. Hunter Kontakte für Übersicht
   - z.B. Outreach Drafts für Review

---

## 📊 Aufwandsschätzung pro Kategorie

| Kategorie | Placeholder Seiten | Geschätzter Aufwand |
|-----------|-------------------|---------------------|
| Scout Agent | 3 | 5-7h |
| Hunter Agent | 3 | 6-9h |
| Outreach Agent | 4 | 10-14h |
| Analytics | 3 | 11-14h |
| **GESAMT** | **13** | **32-44h** |

---

## 🎨 Design-Prinzipien (Notion-Style)

Alle neuen Seiten sollten dem Notion-Style folgen:

- **Background:** `bg-gray-50` (F7F6F3)
- **Cards:** `bg-white` mit `shadow-sm` und `rounded-lg`
- **Tables:** Kompakt mit `text-sm`, Checkboxes für Bulk-Actions
- **Fonts:** `text-xs` für Labels, `text-sm` für Content
- **Icons:** Lucide Icons konsistent verwenden
- **Pills:** `rounded-full` für Status/Tags
- **Spacing:** Kompakt mit `py-2` und `px-3`
- **Borders:** Transparent oder sehr subtle

---

**Bereit für Entscheidung!** 🚀

