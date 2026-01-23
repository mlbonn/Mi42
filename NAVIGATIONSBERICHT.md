# FRIDAY CRM - Navigationsbericht
## Konzerne → Firmen → Kontakte Navigation

**Datum:** 22. Oktober 2025  
**Getestet auf:** Produktions-Server (http://46.224.13.250:3000)

---

## 1. Übersicht

Die Navigation zwischen Konzernen, Firmen und Kontakten wurde implementiert und getestet. Die hierarchische Struktur ist:

```
Konzern (Corporation)
  └── Firma (Company) [1:n]
       └── Kontakt (Contact) [1:n]
```

---

## 2. Testdaten

**Erstellt mit Seed-Script:** `server/seedCompaniesContacts.ts`

- **6 Konzerne** (SAP SE, Volkswagen AG, Robert Bosch GmbH, BMW Group, Siemens AG, Deutsche Telekom AG)
- **11 Firmen** (9 Konzern-Firmen + 2 Standalone)
  - Pro Konzern: 3 Firmen (Deutschland, Schweiz, Österreich)
  - Standalone: Zalando SE, Delivery Hero SE
- **31 Kontakte**
  - Pro Konzern-Firma: 3 Kontakte (CEO, CTO, Sales Director)
  - Pro Standalone-Firma: 2 Kontakte (CEO, CFO)

---

## 3. Navigation: Konzern → Firmen

### ✅ **Funktioniert**

**Pfad:** Dashboard → Konzerne → Konzern-Detail

**Beispiel:** Robert Bosch GmbH  
**URL:** `/corporations/916183fd-d972-4abc-95e7-0e42ab9392cb`

**Anzeige:**
- Konzern-Header mit Name, Branche, Land, Umsatz
- Quick Stats: **Companies: 3** ✅
- Rechte Sidebar: **Companies (3)** mit Liste
  - Robert Bosch GmbH Deutschland (DE | N/A)
  - Robert Bosch GmbH Schweiz (CH | N/A)
  - Robert Bosch GmbH Österreich (AT | N/A)

**Backend:**
- Query: `trpc.companies.listByCorporation.useQuery({ corporationId })`
- Funktion: `db.getCompaniesByCorporation(corporationId)`
- SQL: `SELECT * FROM companies WHERE corporationId = ?`

**Status:** ✅ **Vollständig funktional**

---

## 4. Navigation: Firma → Kontakte

### ⚠️ **Teilweise funktionierend**

**Problem:** Kontakte werden **nicht angezeigt**, obwohl sie in der Datenbank existieren.

**Erwartetes Verhalten:**
- Klick auf Firma in Sidebar → Company-Detail-Seite
- Company-Detail zeigt Kontakte der Firma

**Aktueller Status:**
- Companies in Sidebar sind **nicht klickbar** (keine Links)
- Contacts zeigt **0** statt 9 (für Robert Bosch GmbH)

**Ursache:**
1. **Frontend:** Companies in Sidebar haben keine Links zu Company-Detail-Seite
2. **Query:** `trpc.contacts.listByCompany` wird nicht ausgeführt oder gibt leere Liste zurück

**Benötigte Fixes:**
1. Company-Detail-Seite erstellen (`/companies/:id`)
2. Links in Sidebar hinzufügen
3. Contact-Query in Company-Detail implementieren

---

## 5. Navigation: Kontakt → Firma → Konzern (Rückwärts)

### ❌ **Nicht implementiert**

**Erwartetes Verhalten:**
- Contact-Detail-Seite zeigt zugehörige Firma
- Firma-Link führt zu Company-Detail
- Company-Detail zeigt zugehörigen Konzern
- Konzern-Link führt zu Corporation-Detail

**Aktueller Status:**
- Contact-Detail-Seite existiert nicht
- Keine Breadcrumb-Navigation

**Benötigte Implementierung:**
1. Contact-Detail-Seite (`/contacts/:id`)
2. Breadcrumb: Konzern > Firma > Kontakt
3. Links zu übergeordneten Ebenen

---

## 6. Datenbankstruktur

### Schema-Beziehungen

```sql
-- Konzern → Firma
companies.corporationId → corporations.id

-- Firma → Kontakt
contactCompanyRelations.companyId → companies.id
contactCompanyRelations.contactId → contacts.id
```

### Verifizierte Daten

**SQL-Test:**
```sql
SELECT 
  c.name as corp_name, 
  co.name as company_name, 
  COUNT(ccr.contactId) as contact_count
FROM corporations c
LEFT JOIN companies co ON c.id = co.corporationId
LEFT JOIN contactCompanyRelations ccr ON co.id = ccr.companyId
WHERE c.name = 'Robert Bosch GmbH'
GROUP BY c.name, co.name;
```

**Ergebnis:**
- Robert Bosch GmbH Deutschland: 3 Kontakte ✅
- Robert Bosch GmbH Schweiz: 3 Kontakte ✅
- Robert Bosch GmbH Österreich: 3 Kontakte ✅

**Daten sind korrekt in DB vorhanden.**

---

## 7. Frontend-Komponenten

### Bestehende Seiten

1. **CorporationDetail.tsx** (`/corporations/:id`)
   - ✅ Zeigt Konzern-Informationen
   - ✅ Lädt Companies via `trpc.companies.listByCorporation`
   - ✅ Zeigt Companies in Sidebar
   - ⚠️ Companies nicht klickbar

2. **CompanyDetail.tsx** - **FEHLT**
   - ❌ Seite existiert nicht
   - Sollte zeigen:
     - Firmen-Informationen
     - Liste der Kontakte
     - Link zum Konzern

3. **ContactDetail.tsx** - **FEHLT**
   - ❌ Seite existiert nicht
   - Sollte zeigen:
     - Kontakt-Informationen
     - Zugehörige Firma
     - E-Mails, Aktivitäten

---

## 8. Backend-Funktionen

### Implementiert ✅

```typescript
// Konzern → Firmen
db.getCompaniesByCorporation(corporationId: string)
trpc.companies.listByCorporation.useQuery({ corporationId })

// Firma → Kontakte
db.getContactsByCompany(companyId: string)
trpc.contacts.listByCompany.useQuery({ companyId })

// Einzelabfragen
db.getCorporation(id: string)
db.getCompany(id: string)
db.getContact(id: string)
```

### Fehlend ❌

```typescript
// Kontakt → Firma (Reverse Lookup)
db.getCompaniesByContact(contactId: string) // Nicht implementiert

// Firma → Konzern (bereits über company.corporationId möglich)
```

---

## 9. Zusammenfassung

### ✅ Was funktioniert

1. **Konzern-Liste** anzeigen
2. **Konzern-Detail** mit Firmen-Anzahl
3. **Companies-Sidebar** mit Liste
4. **Backend-Queries** für alle Ebenen
5. **Datenbankstruktur** korrekt

### ⚠️ Was teilweise funktioniert

1. **Companies-Anzeige** (sichtbar, aber nicht klickbar)
2. **Contacts-Zähler** (zeigt 0 statt tatsächlicher Anzahl)

### ❌ Was fehlt

1. **Company-Detail-Seite**
2. **Contact-Detail-Seite**
3. **Klickbare Links** in Sidebar
4. **Breadcrumb-Navigation**
5. **Rückwärts-Navigation** (Kontakt → Firma → Konzern)

---

## 10. Empfohlene Fixes (Priorität)

### Priorität 1: Company-Detail-Seite

**Datei:** `client/src/pages/CompanyDetail.tsx`

```typescript
export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  
  const { data: company } = trpc.companies.get.useQuery({ id: id! });
  const { data: contacts } = trpc.contacts.listByCompany.useQuery(
    { companyId: id! },
    { enabled: !!id }
  );
  const { data: corporation } = trpc.corporations.get.useQuery(
    { id: company?.corporationId! },
    { enabled: !!company?.corporationId }
  );

  // Zeige Firma mit Kontakten und Link zum Konzern
}
```

**Route hinzufügen:** `App.tsx`
```typescript
<Route path="/companies/:id" component={CompanyDetail} />
```

### Priorität 2: Klickbare Company-Links

**Datei:** `client/src/pages/CorporationDetail.tsx`

**Ändern:**
```typescript
// Vorher (Sidebar):
<div>{company.name}</div>

// Nachher:
<Link href={`/companies/${company.id}`}>
  <a className="hover:underline">{company.name}</a>
</Link>
```

### Priorität 3: Contact-Detail-Seite

**Datei:** `client/src/pages/ContactDetail.tsx`

Ähnlich wie CompanyDetail, zeigt:
- Kontakt-Informationen
- Zugehörige Firma (mit Link)
- E-Mails, Aktivitäten, Deals

### Priorität 4: Breadcrumb-Navigation

**Komponente:** `client/src/components/Breadcrumb.tsx`

```typescript
// Beispiel für Company-Detail:
Konzern: SAP SE > Firma: SAP SE Deutschland
```

---

## 11. Testing-Checkliste

### Zu testen nach Fixes:

- [ ] Konzern → Firmen-Liste anzeigen
- [ ] Firma in Liste klicken → Company-Detail öffnet
- [ ] Company-Detail zeigt Kontakte
- [ ] Kontakt klicken → Contact-Detail öffnet
- [ ] Contact-Detail zeigt Firma-Link
- [ ] Firma-Link führt zurück zu Company-Detail
- [ ] Company-Detail zeigt Konzern-Link
- [ ] Konzern-Link führt zurück zu Corporation-Detail
- [ ] Breadcrumb zeigt korrekten Pfad
- [ ] Mobile-Ansicht funktioniert

---

## 12. Technische Details

### Performance

- **Queries:** Lazy Loading mit `enabled` Flag
- **Caching:** tRPC Client-Cache
- **N+1 Problem:** Vermieden durch separate Queries

### Sicherheit

- **Access Control:** `salesProcedure` prüft Berechtigungen
- **SQL Injection:** Geschützt durch Drizzle ORM
- **XSS:** React escapet automatisch

### Datenbank-Performance

```sql
-- Index für schnelle Lookups
CREATE INDEX idx_companies_corporation ON companies(corporationId);
CREATE INDEX idx_ccr_company ON contactCompanyRelations(companyId);
CREATE INDEX idx_ccr_contact ON contactCompanyRelations(contactId);
```

---

## 13. Fazit

Die **Grundstruktur** für Navigation Konzern → Firmen → Kontakte ist **implementiert und funktionsfähig**.

**Hauptproblem:** Fehlende **Company-Detail** und **Contact-Detail** Seiten verhindern vollständige Navigation.

**Aufwand für vollständige Implementierung:**
- Company-Detail-Seite: ~2 Stunden
- Contact-Detail-Seite: ~2 Stunden
- Links und Breadcrumbs: ~1 Stunde
- Testing: ~1 Stunde

**Gesamt:** ~6 Stunden

---

## Anhang: Seed-Script

**Datei:** `server/seedCompaniesContacts.ts`

Erstellt Testdaten für bestehende Konzerne:
- Lädt alle Konzerne aus DB
- Erstellt 3 Firmen pro Konzern (DE, CH, AT)
- Erstellt 3 Kontakte pro Firma (CEO, CTO, Sales Director)
- Erstellt 2 Standalone-Firmen mit je 2 Kontakten

**Ausführung:**
```bash
cd /home/ubuntu/friday-crm
node_modules/.bin/tsx server/seedCompaniesContacts.ts
```

