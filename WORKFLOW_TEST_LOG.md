# FRIDAY CRM - Workflow Test Log

**Test:** Firma → Kontakt → Konzern → Zuordnung  
**Datum:** 2025-10-22  
**Tester:** Manus

---

## Test-Schritte

1. ✅ Login erfolgreich (Admin User)
2. ⏳ Firma "James Hardie, Düsseldorf" anlegen
3. ⏳ Kontakt "Peter Salz" (peter@JH-test.de) anlegen
4. ⏳ Konzern "JH Australia, Sydney" anlegen
5. ⏳ Firma dem Konzern zuordnen

---

## Fehler-Log

### Schritt 2: Firma anlegen

**Problem:** Keine "Firma anlegen"-Funktion im Dashboard sichtbar.

**Analyse:** 
- Dashboard zeigt nur "Konzerne anzeigen" und "Pipeline anzeigen"
- Firmen-Verwaltung fehlt im Hauptmenü
- Muss über Konzern → Firma anlegen gehen?

**Lösung:** Navigiere zu Firmen-Liste (/companies) und prüfe ob "+ Firma"-Button existiert.

---



**Status:** Firmen-Liste gefunden (/companies)

**Problem:** Kein "+ Firma anlegen"-Button sichtbar!

**Sichtbare Elemente:**
- Suchfeld
- Filter (Konzern, Land)
- Sortierung
- Tabelle mit Firmen
- "Details"-Buttons

**Erwartung:** Button "+ Firma" oder "+ Neue Firma" oben rechts

**Nächster Schritt:** Prüfe ob Button außerhalb Viewport oder fehlt im Code.

---



**Fehler #1 bestätigt:** "+ Firma"-Button fehlt in Companies.tsx!

**Code-Analyse:** Companies.tsx hat nur:
- Suchfeld
- Filter (Konzern, Land)
- Sortierung
- Tabelle

**Fehlende Funktionalität:**
- Button zum Anlegen neuer Firmen
- Formular/Modal für Firma-Erstellung

**Lösung:** Füge "+ Neue Firma"-Button und Create-Modal hinzu.

---

### Schritt 2a: Firma-Erstellung implementieren

**Implementierung läuft...**

---



**Fehler #1 behoben:** "+ Neue Firma"-Button hinzugefügt!

**Implementierung:**
- Dialog-Modal mit Formular
- Felder: Name, Stadt, Land, Konzern (optional)
- Validation: Name, Stadt, Land erforderlich
- tRPC Mutation: `companies.create`

**Test:** Lade Seite neu und teste Button.

---



✅ **Fehler #1 behoben und getestet:** "+ Neue Firma"-Button ist sichtbar!

**Screenshot:** Button oben rechts neben "Firmen"-Überschrift.

**Weiter mit Test:** Klicke Button und lege "James Hardie, Düsseldorf" an.

---

### Schritt 2b: Firma anlegen (James Hardie, Düsseldorf)

**Test läuft...**

---



**Fehler #2:** React Error beim Klick auf "Neue Firma"!

**Fehlermeldung:**
```
Error: A <Select.Item /> must have a value prop that is not an empty string.
This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
```

**Ursache:** Select-Component (Konzern-Auswahl) hat `<SelectItem value="">Kein Konzern</SelectItem>` mit leerem String.

**Lösung:** Entferne "Kein Konzern"-Option oder nutze speziellen Wert wie "none".

**Behebung läuft...**

---



**Fehler #2 behoben:** Leeres SelectItem entfernt.

**Änderung:** "Kein Konzern"-Option gelöscht. Konzern bleibt optional (leer = kein Konzern).

**Test:** Lade Seite neu und klicke "Neue Firma" erneut.

---



### Schritt 1: Firma anlegen ✅

**Aktion:** Formular ausgefüllt und "Firma anlegen" geklickt
- Name: James Hardie
- Stadt: Düsseldorf
- Land: DE
- Konzern: (leer)

**Ergebnis:** Dialog geschlossen, Firmen-Liste angezeigt.

**Problem:** James Hardie erscheint NICHT in der Liste!

**Vermutung:** 
1. Backend-Error (nicht sichtbar)
2. Liste wird nicht neu geladen
3. Company wurde nicht erstellt

**Nächster Schritt:** Prüfe Console für Fehler und schaue in DB.

---



**Fehler #3:** Company wurde erstellt, aber Liste zeigt sie nicht!

**DB-Check:** ✅ James Hardie existiert in DB!
```
id: [UUID]
name: James Hardie
city: Düsseldorf
country: DE
corporationId: null
```

**Problem:** React-Query cached alte Liste oder invalidation fehlt.

**Lösung:** Füge `invalidateQueries` nach Company-Erstellung hinzu.

**Behebung läuft...**

---



**Fehler #3 behoben:** Query-Invalidation hinzugefügt.

**Änderung:** `utils.companies.list.invalidate()` nach erfolgreicher Erstellung.

**Test:** Erstelle neue Firma erneut und prüfe ob sie in Liste erscheint.

---



### Schritt 2: Kontakt anlegen

**Navigation:** James Hardie Detail-Seite geöffnet ✅

**Seite zeigt:**
- Breadcrumb: Konzerne > James Hardie
- Stats: 0 Kontakte, 0 Deals, 0 Aktivitäten
- Tab "Kontakte (0)" aktiv
- Button "+ Kontakt hinzufügen" sichtbar ✅

**Nächster Schritt:** Klicke "+ Kontakt hinzufügen"

---



**Fehler #4:** "+ Kontakt hinzufügen"-Button reagiert nicht!

**Aktion:** Button geklickt, aber kein Dialog öffnet sich.

**Vermutung:** 
1. onClick-Handler fehlt
2. Dialog-Component nicht implementiert
3. JavaScript-Error

**Lösung:** Prüfe CompanyDetail.tsx und implementiere Contact-Creation-Dialog.

**Behebung läuft...**

---



**Fehler #4 behoben:** Contact-Creation-Dialog implementiert!

**Änderungen:**
1. Dialog-Imports hinzugefügt
2. useState für newContact und isCreateContactOpen
3. createContactMutation mit Query-Invalidation
4. Formular mit 5 Feldern (Vorname, Nachname, E-Mail, Telefon, Position)
5. Validation (Vorname, Nachname, E-Mail required)

**Test:** Reload page und teste Dialog.

---



**Schritt 2 läuft:** Formular ausgefüllt ✅

**Daten:**
- Vorname: Peter
- Nachname: Salz
- E-Mail: peter@JH-test.de

**Button "Kontakt anlegen" ist aktiv** (schwarz statt grau).

**Nächster Schritt:** Klicke "Kontakt anlegen"

---



**Schritt 2:** Dialog geschlossen, aber Kontakt erscheint NICHT!

**Status:** Immer noch "Keine Kontakte vorhanden" (0)

**Problem:** Gleich wie bei Company - Query-Invalidation oder Backend-Error.

**Prüfung:** Schaue in DB ob Kontakt erstellt wurde.

---

