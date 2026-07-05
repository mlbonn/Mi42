# Genesis World CRM: Felder mit rotem Kreuz

## Aus Screenshot 1 (Kontakt - Allgemein Tab)

**Felder mit rotem Kreuz (✗):**

1. **Stichwort 1** - Text
2. **Stichwort 2** - Text
3. **Groesse_MA** - Text (z.B. "groß")
4. **Industrie** - Text (z.B. "Building Boards, Drylining, Insulation")
5. **Stufe** - Text (z.B. "Producer")

---

## Aus Screenshot 2 (Kontakt - Verteiler Tab)

**Tabelle: "Die Adresse ist in folgenden Verteilern enthalten"**

Spalten:
- Stichwort (z.B. "alle KUNDEN mit @ für DSGVO", "B+L keine Werbung")
- Typ (z.B. "CAS geniesWi...")
- E-Mail-Adresse (z.B. "dorn.christoph@knauf.de")
- Verteilerstatus (z.B. "Aktiv", "In Vorbereitung")
- Status (z.B. "Angemeldet")

**Feld mit rotem Kreuz (✗):**
- **Verteiler** - Liste/Tabelle mit Verteiler-Zuordnungen

---

## Aus Screenshot 3 (Kontakt - Details Tab)

**Kontaktdaten:**
- Telefon (Geschäftlich): +49 9323 31-3520
- Telefon (Mobil): +49 172 8256728
- Telefon (Zentrale): +49 9323 31-0
- Fax (Zentrale): +49 9323 31-277

**Felder mit rotem Kreuz (✗):**

1. **Verantwortlicher** - Text (z.B. "Robin Huth")
2. **Funktion** - Text (z.B. "GL")
3. **Notizen** - Langtext (z.B. "Mitglied der Gruppengeschäftsführung Region Deutschland/Schweiz\nVorsitzender der Geschäftsleitung Knauf Gips KG")

**Weitere Felder (sichtbar, aber ohne rotes Kreuz):**
- Abteilung: "Verkauf"
- Kategorie: "Kunde"
- Schlagworte: "timber construction"

---

## Zusammenfassung: Neue Felder für FRIDAY CRM

### Contacts Tabelle

| Feld | Typ | Beschreibung | Genesis Feld |
|------|-----|--------------|--------------|
| keyword1 | TEXT | Stichwort 1 | Stichwort 1 |
| keyword2 | TEXT | Stichwort 2 | Stichwort 2 |
| companySize | TEXT | Unternehmensgröße | Groesse_MA |
| responsiblePerson | TEXT | Verantwortlicher | Verantwortlicher |
| function | TEXT | Funktion (z.B. GL) | Funktion |
| department | TEXT | Abteilung (z.B. Verkauf) | Abteilung |
| category | TEXT | Kategorie (z.B. Kunde) | Kategorie |
| tags | TEXT | Schlagworte (comma-separated) | Schlagworte |
| phoneBusiness | TEXT | Telefon (Geschäftlich) | Telefon (Geschäftlich) |
| phoneMobile | TEXT | Telefon (Mobil) | Telefon (Mobil) |
| phoneOffice | TEXT | Telefon (Zentrale) | Telefon (Zentrale) |
| faxOffice | TEXT | Fax (Zentrale) | Fax (Zentrale) |

**Hinweis:** `notes` existiert bereits in FRIDAY CRM

---

### Corporations Tabelle

| Feld | Typ | Beschreibung | Genesis Feld |
|------|-----|--------------|--------------|
| companySize | TEXT | Unternehmensgröße | Groesse_MA |
| stage | TEXT | Stufe (z.B. Producer) | Stufe |

**Hinweis:** `industry` existiert bereits in FRIDAY CRM

---

### Neue Tabelle: contact_distributors (Verteiler)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | VARCHAR(64) | Primary Key |
| contactId | VARCHAR(64) | Foreign Key → contacts.id |
| keyword | TEXT | Stichwort (z.B. "alle KUNDEN mit @ für DSGVO") |
| type | TEXT | Typ (z.B. "CAS geniesWi...") |
| email | TEXT | E-Mail-Adresse |
| distributorStatus | TEXT | Verteilerstatus (Aktiv, In Vorbereitung) |
| status | TEXT | Status (Angemeldet) |
| createdAt | TIMESTAMP | Erstellungsdatum |

---

## Import-Mapping

### Genesis → FRIDAY CRM

**Contacts:**
```
Genesis Field          → FRIDAY Field
─────────────────────────────────────────
Stichwort 1           → keyword1
Stichwort 2           → keyword2
Groesse_MA            → companySize
Verantwortlicher      → responsiblePerson
Funktion              → function
Abteilung             → department
Kategorie             → category
Schlagworte           → tags
Telefon (Geschäftlich)→ phoneBusiness
Telefon (Mobil)       → phoneMobile
Telefon (Zentrale)    → phoneOffice
Fax (Zentrale)        → faxOffice
Notizen               → notes (bereits vorhanden)
```

**Corporations:**
```
Genesis Field          → FRIDAY Field
─────────────────────────────────────────
Groesse_MA            → companySize
Industrie             → industry (bereits vorhanden)
Stufe                 → stage
```

**Verteiler:**
```
Genesis Verteiler Table → contact_distributors
─────────────────────────────────────────────────
Stichwort              → keyword
Typ                    → type
E-Mail-Adresse         → email
Verteilerstatus        → distributorStatus
Status                 → status
```

---

## Implementierungsreihenfolge

1. **Schema Update**: Neue Felder zu `contacts` und `corporations` hinzufügen
2. **Neue Tabelle**: `contact_distributors` erstellen
3. **Backend**: CRUD-Operationen für neue Felder
4. **Frontend**: Felder in Detail-Views einbauen
5. **Import**: Genesis CSV-Import erweitern

---

## Notizen

- **Telefonnummern**: Genesis hat separate Felder für Business/Mobile/Office/Fax
- **Verteiler**: Separate Tabelle nötig (1:n Beziehung Contact → Distributors)
- **Schlagworte**: Comma-separated String (später evtl. separate Tags-Tabelle)
- **Groesse_MA**: Sowohl bei Contacts als auch Corporations (Unternehmensgröße)

