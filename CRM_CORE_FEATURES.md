# FRIDAY CRM - Fehlende Grundfunktionen

## Aktuelle Situation

**Vorhanden:**
- ✅ Konzerne (Corporations) - Liste + Detail View
- ✅ Deals (Pipeline) - Kanban Board
- ✅ Globale Suche
- ✅ Sidebar Navigation

**Fehlt:**
- ❌ **Companies (Firmen)** - Eigene Liste + Detail View
- ❌ **Contacts (Kontakte)** - Eigene Liste + Detail View
- ❌ **Activity-Akte** - Kommunikationshistorie pro Konzern/Firma/Kontakt
- ❌ **Sammel-Akte** - Aggregierte Aktivitäten über alle Kontakte einer Firma

---

## Fehlende Grundfunktionen

### 1. Companies (Firmen) Liste

**Anforderungen:**
- Eigene Seite `/companies`
- Lange Liste (100-1.000+ Firmen)
- Extra Suchfeld (unabhängig von globaler Suche)
- Filter: Land, Konzern, Umsatz
- Sortierung: Name, Umsatz, Land
- Spalten: Name, Konzern, Land, Stadt, Umsatz, Produkte

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Firmen                                                  │
│ Ihre Unternehmen im Überblick                          │
├─────────────────────────────────────────────────────────┤
│ [Suche...] [Filter: Konzern] [Filter: Land] [Sort]    │
├─────────────────────────────────────────────────────────┤
│ Name          | Konzern      | Land | Umsatz | Details │
│ Knauf Gips KG | Knauf Group  | DE   | €2.5B  | [→]    │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Contacts (Kontakte) Liste

**Anforderungen:**
- Eigene Seite `/contacts`
- Lange Liste (500-5.000+ Kontakte)
- Extra Suchfeld (Name, E-Mail, Position)
- Filter: Firma, Konzern, Funktion
- Sortierung: Name, Firma, Position
- Spalten: Name, Position, Firma, E-Mail, Telefon, Letzte Aktivität

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Kontakte                                                        │
│ Ihre Ansprechpartner im Überblick                             │
├─────────────────────────────────────────────────────────────────┤
│ [Suche...] [Filter: Firma] [Filter: Funktion] [Sort]         │
├─────────────────────────────────────────────────────────────────┤
│ Name           | Position    | Firma        | E-Mail | Details│
│ Christoph Dorn | GL          | Knauf Gips   | c.d@   | [→]   │
│ ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Activity-Akte (Kommunikationshistorie)

**Anforderungen:**
- Erscheint **unterhalb oder neben** der Detail-Ansicht
- Zeigt alle E-Mails, Calls, Meetings, Notes
- Filter: Typ (E-Mail, Call, Meeting, Note)
- Filter: Zeitraum (Letzte 7 Tage, 30 Tage, 90 Tage, Alle)
- Sortierung: Neueste zuerst
- **Kontakt-Akte:** Nur Aktivitäten mit diesem Kontakt
- **Firmen-Akte:** Aktivitäten mit allen Kontakten dieser Firma
- **Sammel-Akte (Konzern):** Aktivitäten mit allen Kontakten aller Firmen des Konzerns

**Layout (2-Spalten):**
```
┌──────────────────────────┬──────────────────────────────┐
│ Konzern: Saint-Gobain    │ Aktivitäten (Sammel-Akte)   │
│                          │                              │
│ [Key Facts]              │ [Filter: Typ] [Zeitraum]    │
│ Umsatz: €51B             │                              │
│ Land: FR                 │ ┌──────────────────────────┐│
│                          │ │ ✉ E-Mail                 ││
│ [Tabs]                   │ │ 16.11.2024 13:37         ││
│ • Übersicht              │ │ Von: Martin Langen       ││
│ • Firmen (12)            │ │ An: Christoph Dorn       ││
│ • Kontakte (45)          │ │ Betreff: GBM Demo        ││
│ • Deals (3)              │ │ [Details anzeigen]       ││
│                          │ └──────────────────────────┘│
│                          │ ┌──────────────────────────┐│
│                          │ │ ☎ Call                   ││
│                          │ │ 15.11.2024 10:15         ││
│                          │ │ Mit: Robin Huth          ││
│                          │ │ Dauer: 25 Min            ││
│                          │ │ Outcome: Positive        ││
│                          │ └──────────────────────────┘│
└──────────────────────────┴──────────────────────────────┘
```

**Layout (Unterhalb):**
```
┌─────────────────────────────────────────────────────────┐
│ Firma: Knauf Gips KG                                    │
│ [Key Facts] [Tabs: Übersicht, Kontakte, Deals]         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Aktivitäten (Firmen-Akte)                              │
│ [Filter: Typ] [Zeitraum: Letzte 30 Tage]              │
├─────────────────────────────────────────────────────────┤
│ ✉ E-Mail | 16.11.2024 | Von: M. Langen → C. Dorn      │
│ ☎ Call   | 15.11.2024 | Mit: R. Huth (25 Min)         │
│ 📅 Meeting| 10.11.2024 | GBM Demo (Positive)           │
└─────────────────────────────────────────────────────────┘
```

---

## Implementierungsplan

### Phase 1: Companies (Firmen)
1. **Backend:** `companies.list` API erweitern (Pagination, Filter)
2. **Frontend:** `/companies` Seite mit Tabelle
3. **Frontend:** `/companies/:id` Detail View mit Activity-Akte

### Phase 2: Contacts (Kontakte)
1. **Backend:** `contacts.list` API (Pagination, Filter)
2. **Frontend:** `/contacts` Seite mit Tabelle
3. **Frontend:** `/contacts/:id` Detail View mit Activity-Akte

### Phase 3: Activity-Akte
1. **Backend:** `activities.listByContact`, `activities.listByCompany`, `activities.listByCorporation`
2. **Frontend:** `ActivityAkte` Component (wiederverwendbar)
3. **Integration:** In Corporation, Company, Contact Detail Views

### Phase 4: Sammel-Akte
1. **Backend:** Aggregation-Query für Konzern-Aktivitäten
2. **Frontend:** Toggle "Nur diese Firma" vs. "Alle Firmen des Konzerns"

---

## Datenmodell (bereits vorhanden)

```
corporations (Konzerne)
  ↓ 1:N
companies (Firmen)
  ↓ N:M (via contactCompanyRelations)
contacts (Kontakte)
  ↓ 1:N
activities (E-Mails, Calls, Meetings, Notes)
```

**Aktivitäten-Zuordnung:**
- `activities.contactId` → Kontakt
- `activities.companyId` → Firma (optional)
- `activities.corporationId` → Konzern (optional)

---

## UI/UX Prinzipien

1. **Konsistenz:** Gleiche Tabellen-Layouts für Konzerne, Firmen, Kontakte
2. **Performance:** Pagination (50 Zeilen/Seite), Lazy Loading
3. **Suche:** Lokale Suche in Liste (unabhängig von globaler Suche)
4. **Activity-Akte:** Immer sichtbar (unterhalb oder rechts)
5. **Monochrom:** Schwarz/Weiß/Grau + minimale Farbakzente (Status)

---

## Nächste Schritte

1. Phase 1 implementieren (Companies Liste + Detail + Akte)
2. Phase 2 implementieren (Contacts Liste + Detail + Akte)
3. Phase 3: Activity-Akte in alle Detail Views integrieren
4. Testen mit Genesis World CRM Import (100 Firmen, 500 Kontakte)

