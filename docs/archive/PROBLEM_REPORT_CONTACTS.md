# Problem Report: Kontakte werden nicht in Company-Detail angezeigt

**Datum:** 22. Oktober 2025  
**Betroffenes System:** FRIDAY CRM  
**Datenbank:** MySQL (izfextz9vvhjxdq4iqt2sn)  
**Schweregrad:** Hoch (Kernfunktion funktioniert nicht)

---

## Problem-Beschreibung

Die Company-Detail-Seite zeigt **0 Kontakte** an, obwohl laut Datenbank Kontakte vorhanden sein sollten.

**Erwartetes Verhalten:**  
Company "Robert Bosch GmbH Deutschland" (ID: `8ae7f083-a627-4a10-a774-c38cc3114f15`) sollte 6 Kontakte anzeigen.

**Tatsächliches Verhalten:**  
Frontend zeigt "Keine Kontakte vorhanden" (0 Kontakte).

---

## Datenbank-Schema

### Tabellen

1. **`companies`** - Firmen
   - `id` VARCHAR(64) PRIMARY KEY
   - `name` VARCHAR(255)
   - `corporationId` VARCHAR(64) - Verknüpfung zu Konzern

2. **`contacts`** - Kontakte
   - `id` VARCHAR(64) PRIMARY KEY
   - `firstName` VARCHAR(100)
   - `lastName` VARCHAR(100)
   - ... weitere Felder

3. **`contact_company_relations`** - N:M Relation zwischen Kontakten und Firmen
   - `id` VARCHAR(64) PRIMARY KEY
   - `contactId` VARCHAR(64) NOT NULL - FK zu contacts.id
   - `companyId` VARCHAR(64) NOT NULL - FK zu companies.id
   - `email` VARCHAR(255) - E-Mail für diese Firma
   - `position` VARCHAR(255) - Position in dieser Firma
   - `isPrimary` BOOLEAN - Hauptfirma des Kontakts
   - `createdAt` TIMESTAMP

### Indizes
- `ccr_contact_idx` auf `contactId`
- `ccr_company_idx` auf `companyId`

---

## Reproduktion des Problems

### 1. Aggregate-Query (funktioniert, zeigt 6 Kontakte)

```sql
SELECT 
  c.id, 
  c.name, 
  COUNT(ccr.contactId) as contact_count
FROM companies c
LEFT JOIN contact_company_relations ccr ON ccr.companyId = c.id
WHERE c.id = '8ae7f083-a627-4a10-a774-c38cc3114f15'
GROUP BY c.id, c.name;
```

**Ergebnis:** `contact_count = 6` ✅

### 2. Direct-Query (funktioniert NICHT, zeigt 0 Kontakte)

```sql
SELECT ccr.*, c.firstName, c.lastName
FROM contact_company_relations ccr
INNER JOIN contacts c ON c.id = ccr.contactId
WHERE ccr.companyId = '8ae7f083-a627-4a10-a774-c38cc3114f15';
```

**Ergebnis:** 0 Rows ❌

### 3. Backend-Funktion (funktioniert NICHT)

**Datei:** `server/db.ts` (Zeile 232-248)

```typescript
export async function getContactsByCompany(companyId: string) {
  const db = await getDb();
  if (!db) return [];

  const relations = await db
    .select({
      contact: contacts,
      relation: contactCompanyRelations,
    })
    .from(contactCompanyRelations)
    .innerJoin(contacts, eq(contactCompanyRelations.contactId, contacts.id))
    .where(eq(contactCompanyRelations.companyId, companyId));

  return relations.map(r => ({
    ...r.contact,
    email: r.relation.email,
    position: r.relation.position,
  }));
}
```

**Test-Aufruf:**
```bash
cd /home/ubuntu/friday-crm
node_modules/.bin/tsx -e "
import { getContactsByCompany } from './server/db';
const contacts = await getContactsByCompany('8ae7f083-a627-4a10-a774-c38cc3114f15');
console.log('Contacts:', contacts.length);
"
```

**Ergebnis:** `Contacts: 0` ❌

---

## Paradox

**Das ist das Kernproblem:**

- **Aggregate-Query mit COUNT():** Gibt 6 zurück
- **Direct-Query mit SELECT:** Gibt 0 zurück
- **Beide Queries nutzen die gleiche Tabelle und companyId**

**Mögliche Ursachen:**

1. **Dateninkonsistenz:**
   - `contact_company_relations` Tabelle hat Rows, aber `contactId` oder `companyId` sind NULL/leer
   - COUNT zählt auch NULL-Werte, aber JOIN schlägt fehl

2. **Encoding/Whitespace-Problem:**
   - Company-ID hat unsichtbare Zeichen (Leerzeichen, Tabs, etc.)
   - Aggregate-Query matched trotzdem, aber exakte WHERE-Clause nicht

3. **Drizzle ORM Problem:**
   - Schema-Mapping ist falsch
   - Tabellen-Name stimmt nicht überein (camelCase vs snake_case)

4. **Foreign Key Constraint fehlt:**
   - Rows existieren in `contact_company_relations`, aber `contactId` zeigt auf nicht-existierende Kontakte
   - COUNT zählt Rows, aber JOIN findet keine matches

---

## Zu prüfende Queries

### Query 1: Prüfe contact_company_relations Rows direkt

```sql
SELECT * 
FROM contact_company_relations 
WHERE companyId = '8ae7f083-a627-4a10-a774-c38cc3114f15';
```

**Erwartung:** Sollte 6 Rows zurückgeben

### Query 2: Prüfe ob contactId valide ist

```sql
SELECT 
  ccr.id,
  ccr.contactId,
  ccr.companyId,
  c.id as contact_exists,
  c.firstName,
  c.lastName
FROM contact_company_relations ccr
LEFT JOIN contacts c ON c.id = ccr.contactId
WHERE ccr.companyId = '8ae7f083-a627-4a10-a774-c38cc3114f15';
```

**Erwartung:** Sollte zeigen ob `contact_exists` NULL ist (= Kontakt existiert nicht)

### Query 3: Prüfe auf Whitespace/Encoding-Probleme

```sql
SELECT 
  id,
  name,
  LENGTH(id) as id_length,
  HEX(id) as id_hex
FROM companies
WHERE name LIKE '%Robert Bosch%Deutschland%';
```

**Erwartung:** `id_length` sollte 36 sein (UUID), `id_hex` sollte keine unerwarteten Bytes haben

### Query 4: Prüfe alle Companies mit Kontakten

```sql
SELECT 
  c.id, 
  c.name,
  COUNT(ccr.id) as relation_count,
  COUNT(DISTINCT ccr.contactId) as unique_contacts,
  COUNT(CASE WHEN co.id IS NOT NULL THEN 1 END) as valid_contacts
FROM companies c
LEFT JOIN contact_company_relations ccr ON ccr.companyId = c.id
LEFT JOIN contacts co ON co.id = ccr.contactId
WHERE c.id = '8ae7f083-a627-4a10-a774-c38cc3114f15'
GROUP BY c.id, c.name;
```

**Erwartung:** 
- `relation_count` = Anzahl Rows in contact_company_relations
- `unique_contacts` = Anzahl eindeutige contactIds
- `valid_contacts` = Anzahl contactIds die tatsächlich in contacts existieren

---

## Test-Scripts

Alle Test-Scripts liegen in `/home/ubuntu/friday-crm/`:

1. **`testContacts.ts`** - Testet `getContactsByCompany()` Backend-Funktion
2. **`testContactsRaw.ts`** - Testet raw SQL mit Drizzle
3. **`findCompaniesWithContacts.ts`** - Zeigt alle Companies mit Kontakten (Aggregate)
4. **`testExactQuery.ts`** - Testet Direct-Query mit INNER JOIN

**Ausführen:**
```bash
cd /home/ubuntu/friday-crm
node_modules/.bin/tsx testContacts.ts
```

---

## Nächste Schritte

1. **Führe Query 1-4 aus** und dokumentiere Ergebnisse
2. **Prüfe Foreign Keys:** Existieren FK-Constraints zwischen den Tabellen?
3. **Prüfe Datenintegrität:** Gibt es "verwaiste" Rows in `contact_company_relations`?
4. **Prüfe Drizzle-Schema:** Stimmt Schema-Definition mit tatsächlicher DB-Struktur überein?
5. **Falls Daten inkonsistent:** Bereinige DB und führe Seed-Script neu aus

---

## Kontakt

Bei Fragen zu Code oder Schema:
- Schema-Definition: `/home/ubuntu/friday-crm/drizzle/schema.ts` (Zeile 142-153)
- DB-Funktionen: `/home/ubuntu/friday-crm/server/db.ts` (Zeile 232+)
- Seed-Script: `/home/ubuntu/friday-crm/server/seedCompaniesContacts.ts`

