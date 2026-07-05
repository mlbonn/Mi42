# Fehlende Features & Quick Wins

## ✅ Bereits implementiert
- Login/Logout (Username/Password)
- User-Rollen (Admin, Manager, Sales, Partner)
- Konzerne-Liste & Detail
- Company-Detail-Seite
- Contact-Detail-Seite
- Navigation Konzern → Firma → Kontakt
- Scout Agent (Dashboard, Seed, Review Queue)
- Hunter Agent (Dashboard, Targets, Review Queue)
- Outreach Agent (Dashboard, Campaigns, Review Queue, Sent Emails)

---

## 🟢 Einfach zu entwickeln (1-3 Stunden)

### 1. **Kontakte in Company-Detail anzeigen** (1h)
**Problem:** Company-Detail zeigt "Keine Kontakte vorhanden", obwohl Kontakte existieren
**Lösung:** 
- Backend: `contacts.listByCompany` Query hinzufügen
- Frontend: Kontakte in Sidebar anzeigen (wie Companies in Corporation-Detail)
**Aufwand:** 1 Stunde

### 2. **Breadcrumb in Contact-Detail vervollständigen** (30min)
**Problem:** Breadcrumb zeigt nur "Konzerne > Kontaktname"
**Lösung:** 
- Company und Corporation aus Datenbank laden
- Breadcrumb: Konzerne > SAP SE > SAP Deutschland > Max Mustermann
**Aufwand:** 30 Minuten

### 3. **"Alle anzeigen" Links in Corporation-Detail** (30min)
**Problem:** "Alle anzeigen" bei Companies/Contacts/Deals funktioniert nicht
**Lösung:** 
- Links zu `/companies?corporationId=...` hinzufügen
- Gefilterte Listen-Seiten erstellen
**Aufwand:** 30 Minuten

### 4. **Kontakte-Liste-Seite** (2h)
**Problem:** Keine zentrale Übersicht aller Kontakte
**Lösung:** 
- Neue Seite `/contacts` mit Tabelle
- Filter: Firma, Konzern, Position
- Suche nach Name, E-Mail
**Aufwand:** 2 Stunden

### 5. **Firmen-Liste-Seite** (2h)
**Problem:** Keine zentrale Übersicht aller Firmen
**Lösung:** 
- Neue Seite `/companies` mit Tabelle
- Filter: Konzern, Land, Umsatz
- Suche nach Name
**Aufwand:** 2 Stunden

### 6. **Deal-Pipeline-Seite** (3h)
**Problem:** "Pipeline anzeigen" Button auf Dashboard führt nirgendwo hin
**Lösung:** 
- Kanban-Board mit Stages (Lead, Qualified, Proposal, Won, Lost)
- Drag & Drop zum Stage wechseln
- Deal-Cards mit Wert und Firma
**Aufwand:** 3 Stunden

---

## 🟡 Mittlerer Aufwand (4-8 Stunden)

### 7. **Kontakt erstellen/bearbeiten** (4h)
- Formular für neue Kontakte
- Zuordnung zu Firma/Konzern
- Validierung (E-Mail, Telefon)

### 8. **Firma erstellen/bearbeiten** (4h)
- Formular für neue Firmen
- Zuordnung zu Konzern
- Umsatz, Land, Branche

### 9. **Deal erstellen/bearbeiten** (5h)
- Formular für neue Deals
- Zuordnung zu Firma/Konzern/Kontakt
- Stage, Wert, Wahrscheinlichkeit

### 10. **Aktivitäten erstellen** (4h)
- E-Mail, Call, Meeting, Note
- Zuordnung zu Kontakt/Firma/Konzern
- Timeline-Anzeige

### 11. **Globale Suche** (6h)
- Suche über Konzerne, Firmen, Kontakte, Deals
- Autocomplete mit Ergebnissen
- Keyboard-Navigation (Cmd+K)

---

## 🔴 Komplexer (8+ Stunden)

### 12. **E-Mail-Integration** (40h)
- Browser-Extension für Gmail/Outlook
- E-Mail-Archivierung
- Signatur-Parsing (GPT-4)
- Kontakterkennung

### 13. **Kalender-Integration** (30h)
- Outlook/Google Calendar Sync
- Termin-Erstellung aus CRM
- Teams/Meet Links

### 14. **Chatbot** (25h)
- Kontextbezogener GPT-4 Chatbot
- E-Mail/Telefon-Erfassung
- Kontaktanlage

### 15. **E-Mail Bounce-Handling** (20h)
- Out-of-Office Erkennung
- Mitarbeiter-Wechsel Detection
- Automatische Kontakt-Updates

---

## 🎯 Empfehlung: Nächste Schritte

**Quick Wins (heute machbar):**
1. Kontakte in Company-Detail anzeigen (1h)
2. Breadcrumb vervollständigen (30min)
3. Kontakte-Liste-Seite (2h)
4. Firmen-Liste-Seite (2h)

**Gesamt: 5,5 Stunden** → Vollständige Navigation + Listen

**Danach:**
- Deal-Pipeline (3h) → Kernfunktion für Sales
- CRUD-Formulare (13h) → Daten selbst pflegen
- Globale Suche (6h) → UX-Boost

**Gesamt für MVP-Vervollständigung: ~27 Stunden**

