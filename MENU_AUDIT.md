# FRIDAY CRM - Menu Audit Report
**Datum:** 28. Oktober 2025  
**Status:** Systematische Durchsicht aller Menüpunkte

---

## 📊 Übersicht

### ✅ Vollständig implementiert (16 Seiten)
1. **Dashboard** (`/`) - Home.tsx
2. **Konzerne** (`/corporations`) - Corporations.tsx
3. **Konzern Detail** (`/corporations/:id`) - CorporationDetailNew.tsx
4. **Firmen** (`/companies`) - Companies.tsx
5. **Firma Detail** (`/companies/:id`) - CompanyDetail.tsx
6. **Kontakte** (`/contacts`) - Contacts.tsx
7. **Kontakt Detail** (`/contacts/:id`) - ContactDetail.tsx
8. **Pipeline** (`/deals`) - Deals.tsx
9. **My Deals** (`/my-deals`) - MyDeals.tsx (nur Staff+)
10. **Scout Dashboard** (`/scout`) - Scout.tsx
11. **Scout Seed** (`/scout/seed`) - ScoutSeed.tsx
12. **Scout Review** (`/scout/review`) - ScoutReview.tsx
13. **Hunter Dashboard** (`/hunter`) - HunterDashboard.tsx
14. **Hunter Targets** (`/hunter/targets`) - HunterTargetCompanies.tsx
15. **Hunter Review** (`/hunter/review`) - HunterReview.tsx
16. **Outreach Dashboard** (`/outreach`) - OutreachDashboard.tsx
17. **Outreach Campaigns** (`/outreach/campaigns`) - OutreachCampaigns.tsx
18. **Outreach Review** (`/outreach/review`) - OutreachReview.tsx
19. **Outreach Sent** (`/outreach/sent`) - OutreachSent.tsx
20. **Settings** (`/settings`) - Settings.tsx
21. **Users** (`/users`) - Users.tsx
22. **Docs** (`/docs`) - Docs.tsx

### 🚧 Placeholder-Seiten (16 Seiten)

#### Scout Agent (3 Platzhalter)
- `/scout/queue` - Scout Queue Page
- `/scout/methods` - Scout Methods Page
- `/scout/stats` - Scout Stats Page

#### Hunter Agent (3 Platzhalter)
- `/hunter/found-contacts` - Hunter Contacts Page
- `/hunter/data-sources` - Hunter Sources Page
- `/hunter/stats` - Hunter Stats Page

#### Outreach Agent (4 Platzhalter)
- `/outreach/drafts` - Outreach Drafts Page
- `/outreach/responses` - Outreach Responses Page
- `/outreach/templates` - Outreach Templates Page
- `/outreach/stats` - Outreach Stats Page

#### Analytics (3 Platzhalter)
- `/analytics/funnel` - Analytics Funnel Page
- `/analytics/agents` - Analytics Agents Page
- `/analytics/roi` - Analytics ROI Page

#### Settings (3 Platzhalter)
- `/settings/users` - Settings Users Page (Duplikat zu /users?)
- `/settings/partners` - Settings Partners Page
- `/settings/api` - Settings API Page
- `/settings/integrations` - Settings Integrations Page

---

## 🎯 Priorisierung nach Business Value

### 🔴 **KRITISCH - Sofort angehen (Kern-CRM-Funktionen)**

#### 1. **Outreach Drafts & Templates** (2-3h)
**Warum:** Outreach Agent ist zu 60% fertig, fehlt nur noch Draft-Management
- `/outreach/drafts` - Entwürfe vor dem Versand bearbeiten
- `/outreach/templates` - E-Mail-Vorlagen verwalten
- **Business Impact:** Ermöglicht vollständigen Outreach-Workflow

#### 2. **Outreach Responses** (2-3h)
**Warum:** Tracking von Antworten ist essentiell für Lead-Qualifizierung
- `/outreach/responses` - Antworten auf Outreach-Nachrichten
- Integration mit E-Mail-Postfach (IMAP/API)
- **Business Impact:** Schließt Feedback-Loop im Outreach-Prozess

#### 3. **Hunter Found Contacts** (1-2h)
**Warum:** Hunter Agent findet Kontakte, aber keine Übersicht
- `/hunter/found-contacts` - Alle gefundenen Kontakte anzeigen
- Filter: Status (Pending, Approved, Rejected), Quelle, Firma
- **Business Impact:** Ermöglicht Review aller Hunter-Ergebnisse

---

### 🟡 **WICHTIG - Mittelfristig (Analytics & Monitoring)**

#### 4. **Analytics Funnel** (3-4h)
**Warum:** Visualisierung des gesamten Sales-Funnels
- Stufen: Scout → Hunter → Outreach → Response → Deal
- Conversion-Rates zwischen Stufen
- **Business Impact:** Identifiziert Bottlenecks im Prozess

#### 5. **Analytics Agents** (2-3h)
**Warum:** Performance-Monitoring der AI Agents
- Scout: Discoveries/Tag, Approval-Rate, Generation-Tiefe
- Hunter: Contacts/Tag, Success-Rate, Datenquellen
- Outreach: Sent/Tag, Open-Rate, Response-Rate
- **Business Impact:** Optimierung der Agent-Performance

#### 6. **Scout Queue** (1-2h)
**Warum:** Transparenz über laufende Scout-Jobs
- Aktive Jobs, Warteschlange, Fehler
- Manuelles Retry/Cancel
- **Business Impact:** Debugging und Monitoring

---

### 🟢 **OPTIONAL - Langfristig (Nice-to-Have)**

#### 7. **Scout Methods & Stats** (1-2h)
- `/scout/methods` - Discovery-Methoden-Übersicht
- `/scout/stats` - Scout-Statistiken (bereits in Dashboard?)

#### 8. **Hunter Data Sources & Stats** (1-2h)
- `/hunter/data-sources` - Datenquellen-Übersicht (Apollo, LinkedIn, etc.)
- `/hunter/stats` - Hunter-Statistiken (bereits in Dashboard?)

#### 9. **Outreach Stats** (1h)
- `/outreach/stats` - Outreach-Statistiken (bereits in Dashboard?)

#### 10. **Analytics ROI** (3-4h)
- ROI-Berechnung: Kosten (API, Zeit) vs. Umsatz (Deals)
- **Business Impact:** Rechtfertigung der AI-Agent-Investition

#### 11. **Settings Subpages** (2-3h)
- `/settings/api` - API Keys Management (bereits in Settings?)
- `/settings/integrations` - Integrationen (Zapier, Webhooks)
- `/settings/partners` - Partner-Verwaltung (falls relevant)

---

## 📋 Empfohlene Reihenfolge (Quick Wins zuerst)

### **Sprint 1: Outreach Agent vervollständigen (6-8h)**
1. ✅ Outreach Drafts Page (2-3h)
2. ✅ Outreach Templates Page (2-3h)
3. ✅ Outreach Responses Page (2-3h)

**Ergebnis:** Vollständiger Outreach-Workflow von Template → Draft → Send → Response

---

### **Sprint 2: Hunter Agent vervollständigen (3-4h)**
4. ✅ Hunter Found Contacts Page (2-3h)
5. ✅ Hunter Queue Integration (1h)

**Ergebnis:** Vollständige Hunter-Übersicht mit allen gefundenen Kontakten

---

### **Sprint 3: Analytics Dashboard (6-8h)**
6. ✅ Analytics Funnel Page (3-4h)
7. ✅ Analytics Agents Page (2-3h)
8. ✅ Analytics ROI Page (optional, 3-4h)

**Ergebnis:** Vollständige Transparenz über gesamten Sales-Prozess

---

### **Sprint 4: Monitoring & Debugging (3-4h)**
9. ✅ Scout Queue Page (1-2h)
10. ✅ Hunter Data Sources Page (1h)
11. ✅ Outreach Stats Page (1h)

**Ergebnis:** Vollständiges Monitoring aller Background-Prozesse

---

## 🎯 **Meine Empfehlung: Top 3 Prioritäten**

### 1️⃣ **Outreach Drafts & Templates** (4-6h)
- **Warum:** Schließt Lücke im Outreach-Workflow
- **Impact:** Hoch - Ermöglicht vollständige Outreach-Kampagnen
- **Komplexität:** Mittel - UI + Backend für Draft-Management

### 2️⃣ **Outreach Responses** (2-3h)
- **Warum:** Tracking von Antworten ist essentiell
- **Impact:** Hoch - Schließt Feedback-Loop
- **Komplexität:** Mittel - E-Mail-Integration oder manuelle Eingabe

### 3️⃣ **Hunter Found Contacts** (2-3h)
- **Warum:** Hunter findet Kontakte, aber keine Übersicht
- **Impact:** Mittel - Bessere Übersicht über Hunter-Ergebnisse
- **Komplexität:** Niedrig - Einfache Liste mit Filtern

---

## 📊 Zusammenfassung

| Kategorie | Implementiert | Platzhalter | Gesamt |
|-----------|---------------|-------------|--------|
| **CRM** | 8 | 0 | 8 |
| **Scout Agent** | 3 | 3 | 6 |
| **Hunter Agent** | 3 | 3 | 6 |
| **Outreach Agent** | 4 | 4 | 8 |
| **Analytics** | 0 | 3 | 3 |
| **Settings** | 2 | 4 | 6 |
| **Sonstiges** | 2 | 0 | 2 |
| **GESAMT** | **22** | **17** | **39** |

**Fortschritt:** 56% der Seiten vollständig implementiert

---

## 🚀 Nächste Schritte

**Vorschlag für heute:**
1. Outreach Drafts Page implementieren (2-3h)
2. Outreach Templates Page implementieren (2-3h)

**Dann haben wir:**
- ✅ Vollständigen Outreach-Workflow
- ✅ 24/39 Seiten fertig (62%)
- ✅ Outreach Agent zu 75% fertig

