# FRIDAY CRM: Implementierungsplan

## ✅ Abgeschlossen (Checkpoint 654a33d5)

### Backend
- [x] Datenbank-Schema (dreistufige Hierarchie: Corporation → Company → Contact)
- [x] User-Rollen (admin, sales_manager, external_sales, partner)
- [x] SQLAlchemy Models (MySQL/PostgreSQL kompatibel)
- [x] CRUD-Operationen für alle Entitäten
- [x] Permission-System (canUserAccessCorporation)
- [x] tRPC Router mit allen Endpoints
- [x] Commission-Tracking für externe Sales
- [x] Dashboard-Stats

### Frontend
- [x] Monochrom minimalistisches Design (Schwarz/Weiß/Grau)
- [x] Home/Dashboard
- [x] Corporations-Liste mit Suche
- [x] Corporation-Detail mit Tabs (Companies, Deals, Activities, Notes)
- [x] Sales-Pipeline (Kanban-View)
- [x] My Deals (für externe Sales-Mitarbeiter)
- [x] Navigation & Header
- [x] Auth-Integration (Manus OAuth)

---

## 🚧 Noch zu implementieren

### 1. Import-Prozess (Genesis World CRM)

**Priorität:** Hoch  
**Geschätzte Zeit:** 2-3 Stunden

#### Aufgaben:
- [ ] CSV-Import-Skript für Corporations
- [ ] CSV-Import-Skript für Companies
- [ ] CSV-Import-Skript für Contacts (mit N:M Relations)
- [ ] E-Mail-Import aus MBOX/EML-Dateien
- [ ] Import-UI im Frontend (Admin-Panel)
- [ ] Validierung & Error-Handling

#### Dateien:
- `server/import/importCorporations.ts`
- `server/import/importCompanies.ts`
- `server/import/importContacts.ts`
- `server/import/importEmails.ts`
- `client/src/pages/admin/Import.tsx`

---

### 2. CRUD-Formulare (Create/Edit)

**Priorität:** Hoch  
**Geschätzte Zeit:** 3-4 Stunden

#### Aufgaben:
- [ ] Corporation Create/Edit Dialog
- [ ] Company Create/Edit Dialog
- [ ] Contact Create/Edit Dialog
- [ ] Deal Create/Edit Dialog
- [ ] Activity Create Dialog
- [ ] Form-Validierung (Zod)
- [ ] Optimistic Updates

#### Dateien:
- `client/src/components/forms/CorporationForm.tsx`
- `client/src/components/forms/CompanyForm.tsx`
- `client/src/components/forms/ContactForm.tsx`
- `client/src/components/forms/DealForm.tsx`
- `client/src/components/forms/ActivityForm.tsx`

---

### 3. User-Management (Admin)

**Priorität:** Mittel  
**Geschätzte Zeit:** 2-3 Stunden

#### Aufgaben:
- [ ] User-Liste (Admin-Panel)
- [ ] User erstellen/bearbeiten
- [ ] Account-Assignments (externe Sales → Corporations)
- [ ] Rollen-Verwaltung
- [ ] User deaktivieren/aktivieren

#### Dateien:
- `client/src/pages/admin/Users.tsx`
- `client/src/components/admin/UserForm.tsx`
- `client/src/components/admin/AssignAccounts.tsx`
- `server/routers/admin.ts` (erweitern)

---

### 4. AI Agent Integration

**Priorität:** Mittel  
**Geschätzte Zeit:** 4-6 Stunden

#### Aufgaben:
- [ ] LinkedIn-Scraping für Lead-Anreicherung
- [ ] Pressemitteilungs-Monitoring (News API)
- [ ] E-Mail-Template-System
- [ ] AI-generierte Personalisierung (OpenAI)
- [ ] Outreach-Tracking (Öffnungen, Klicks)
- [ ] AI Dashboard (Engagement-Metriken)

#### Dateien:
- `server/ai/leadEnrichment.ts`
- `server/ai/newsMonitoring.ts`
- `server/ai/emailGeneration.ts`
- `server/ai/outreachTracking.ts`
- `client/src/pages/AIAgent.tsx`

---

### 5. Partner-Management

**Priorität:** Niedrig  
**Geschätzte Zeit:** 2-3 Stunden

#### Aufgaben:
- [ ] Partner-Liste
- [ ] Partner Create/Edit
- [ ] Partner-Deals zuordnen
- [ ] Revenue Share Berechnung
- [ ] Zahlungs-Tracking
- [ ] Partner-Dashboard

#### Dateien:
- `client/src/pages/Partners.tsx`
- `client/src/components/partners/PartnerForm.tsx`
- `client/src/components/partners/PartnerDashboard.tsx`

---

### 6. Produkt-Usage-Integration (GBM)

**Priorität:** Niedrig  
**Geschätzte Zeit:** 2-3 Stunden

#### Aufgaben:
- [ ] GBM-Datenbank-Connector
- [ ] Login-Tracking
- [ ] Feature-Usage-Tracking
- [ ] Upsell-Signale (>80% Limit)
- [ ] Usage-Dashboard im CRM

#### Dateien:
- `server/integrations/gbm.ts`
- `client/src/components/usage/UsageChart.tsx`

---

### 7. Deployment (Hetzner Server)

**Priorität:** Hoch  
**Geschätzte Zeit:** 1-2 Stunden

#### Aufgaben:
- [ ] Hetzner Server Setup (Docker oder direkt)
- [ ] MySQL/PostgreSQL Datenbank
- [ ] Environment Variables
- [ ] SSL-Zertifikat (Let's Encrypt)
- [ ] Domain-Konfiguration
- [ ] Backup-Strategie

#### Schritte:
1. Server bereitstellen (Ubuntu 22.04)
2. Node.js installieren
3. MySQL installieren
4. Projekt clonen
5. Dependencies installieren (`pnpm install`)
6. Environment Variables setzen
7. Datenbank migrieren (`pnpm db:push`)
8. Build (`pnpm build`)
9. PM2 oder systemd Service
10. Nginx Reverse Proxy

---

### 8. Datenbank-Migration (PostgreSQL → MS SQL Server)

**Priorität:** Niedrig (später)  
**Geschätzte Zeit:** 1-2 Stunden

#### Aufgaben:
- [ ] Connection String ändern
- [ ] SQLAlchemy Dialect testen
- [ ] Schema-Migration
- [ ] Daten-Migration

#### Hinweis:
Bereits vorbereitet durch SQLAlchemy ORM. Nur Connection String in `.env` ändern:

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost/friday_crm

# MS SQL Server
DATABASE_URL=mssql+pyodbc://user:password@server/database?driver=ODBC+Driver+17+for+SQL+Server
```

---

## 📋 Nächste Schritte (Empfohlen)

1. **Import-Prozess** (Genesis World CRM Daten übernehmen)
2. **CRUD-Formulare** (Corporations, Companies, Contacts, Deals erstellen/bearbeiten)
3. **Deployment** (Hetzner Server)
4. **User-Management** (Externe Sales-Mitarbeiter anlegen)
5. **AI Agent** (Lead-Anreicherung & Outreach)
6. **Partner-Management** (McKinsey, BCG, etc.)
7. **GBM-Integration** (Produkt-Usage)

---

## 🔧 Technische Notizen

### Datenbank-Portabilität
- SQLAlchemy ORM abstrahiert DB-spezifische Syntax
- Keine PostgreSQL-spezifischen Features verwendet
- JSON statt Arrays für Kompatibilität

### Kein Docker
- Direktes Deployment auf Server
- PM2 für Process Management
- Nginx als Reverse Proxy

### Frontend
- Vanilla JavaScript (kein React-spezifisches Build)
- Monochrom Design (Schwarz/Weiß/Grau)
- Keine Rundungen (border-radius: 0)

### User-Rollen
- **admin**: Vollzugriff
- **sales_manager**: Sales-Funktionen, kein User-Management
- **external_sales**: Nur zugewiesene Accounts, Commission-Tracking
- **partner**: Nur eigene Partner-Deals

---

## 📞 Support

Bei Fragen oder Problemen:
- Dokumentation: `/home/ubuntu/friday-crm/README.md`
- User-Rollen: `/home/ubuntu/friday-crm/USER_ROLES.md`
- Spezifikation: `/home/ubuntu/friday_crm_final_spec.md`

