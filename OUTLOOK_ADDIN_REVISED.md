# FRIDAY CRM - Outlook Add-In (Überarbeitetes Konzept)

**Version:** 2.0  
**Datum:** 29.10.2025  
**Status:** Finales Konzept

---

## 1. Kernfunktionen (fokussiert)

### ✅ Behalten

1. **Sidebar (Task Pane)** - Kontakt-Info anzeigen
2. **E-Mail-Historie** - Bisherige E-Mails mit Kontakt
3. **Notizen hinzufügen** - Ohne FRIDAY zu öffnen
4. **Kontakt-Suche** - In FRIDAY-Datenbank suchen

### ✅ Neu hinzufügen

5. **Kontakt aus Signatur erstellen** - E-Mail-Signatur parsen
6. **Manuelle Archivierung mit Suche** - Dialog zur Zuordnung

### ❌ Entfernen (vorerst nicht)

- ~~Deal-Status anzeigen~~
- ~~E-Mail-Vorlagen~~
- ~~Platzhalter automatisch ersetzen~~
- ~~Tracking (geöffnet/geklickt)~~

---

## 2. Feature-Details

### 2.1 Kontakt aus E-Mail-Signatur erstellen

**Szenario:** E-Mail von unbekanntem Absender mit Signatur

**Workflow:**

```
1. E-Mail öffnen in Outlook
   ↓
2. FRIDAY Add-In Sidebar zeigt:
   ⚠️ Kontakt nicht gefunden
   💡 E-Mail-Signatur erkannt
   ↓
3. Button: [Kontakt aus Signatur erstellen]
   ↓
4. Dialog öffnet sich mit vorausgefüllten Feldern:
   
   ┌─────────────────────────────────────┐
   │  Neuen Kontakt erstellen            │
   ├─────────────────────────────────────┤
   │  Name: [Max Mustermann]             │
   │  E-Mail: [max.mustermann@sika.com]  │
   │  Telefon: [+49 123 456789]          │
   │  Position: [Geschäftsführer]        │
   │  Firma: [Sika AG ▼]                 │
   │                                     │
   │  [Speichern] [Abbrechen]            │
   └─────────────────────────────────────┘
   
5. Kollege prüft/korrigiert Daten
   ↓
6. Klick "Speichern"
   ↓
7. Kontakt wird in FRIDAY erstellt
   ↓
8. E-Mail wird automatisch diesem Kontakt zugeordnet
   ↓
9. Sidebar aktualisiert sich und zeigt neuen Kontakt
```

**Signatur-Parser:**

Erkennt folgende Muster:

```
Max Mustermann
Geschäftsführer
Sika AG
Tel: +49 123 456789
E-Mail: max.mustermann@sika.com
```

oder

```
--
Max Mustermann | Geschäftsführer
Sika AG | www.sika.com
T: +49 123 456789 | E: max.mustermann@sika.com
```

**Extrahierte Felder:**
- Name (Vor- und Nachname)
- Position/Titel
- Firma
- Telefon
- E-Mail
- Website (optional)

---

### 2.2 Manuelle Archivierung mit Suche

**Szenario:** E-Mail soll manuell einem Kontakt/Firma zugeordnet werden

**Workflow:**

```
1. E-Mail öffnen in Outlook
   ↓
2. Klick auf Button "Archivieren" (in Ribbon)
   ↓
3. Dialog öffnet sich:
   
   ┌─────────────────────────────────────┐
   │  E-Mail archivieren                 │
   ├─────────────────────────────────────┤
   │  📧 Von: max.mustermann@sika.com    │
   │  📧 Betreff: Angebot Dachsanierung  │
   ├─────────────────────────────────────┤
   │  Zuordnen zu:                       │
   │                                     │
   │  ○ Kontakt                          │
   │  ○ Firma                            │
   │                                     │
   │  🔍 Suchen...                       │
   │  [Suchfeld]                         │
   ├─────────────────────────────────────┤
   │  Suchergebnisse:                    │
   │                                     │
   │  👤 Max Mustermann                  │
   │     Sika AG | Geschäftsführer       │
   │     max.mustermann@sika.com         │
   │     [Auswählen]                     │
   │                                     │
   │  👤 Anna Mustermann                 │
   │     Bauder GmbH | Einkaufsleiterin  │
   │     anna.mustermann@bauder.de       │
   │     [Auswählen]                     │
   ├─────────────────────────────────────┤
   │  [Abbrechen]                        │
   └─────────────────────────────────────┘
   
4. Kollege tippt im Suchfeld: "Mustermann"
   ↓
5. Ergebnisse werden angezeigt (Kontakte + Firmen)
   ↓
6. Kollege wählt "Max Mustermann" aus
   ↓
7. E-Mail wird gespeichert:
   - In FRIDAY-Datenbank
   - Verknüpft mit Kontakt
   - Anhänge in S3 hochgeladen
   ↓
8. Erfolgsmeldung: "E-Mail archiviert"
```

**Suche unterstützt:**
- **Kontakte:** Name, E-Mail, Telefon
- **Firmen:** Firmenname, Domain

**Optionen im Dialog:**
- ☑️ Anhänge mit archivieren (Standard: an)
- ☑️ Automatisch bei Antworten archivieren (Standard: aus)

---

### 2.3 Sidebar (Task Pane) - vereinfacht

**Layout:**

```
┌─────────────────────────────────────┐
│  FRIDAY CRM                    [×]  │
├─────────────────────────────────────┤
│  📧 Aktuelle E-Mail                 │
│  ───────────────────────────────    │
│  Von: max.mustermann@sika.com       │
│  Betreff: Angebot Dachsanierung     │
├─────────────────────────────────────┤
│  👤 Kontakt                         │
│  ───────────────────────────────    │
│  Max Mustermann                     │
│  Geschäftsführer                    │
│  Sika AG                            │
│  📞 +49 123 456789                  │
│  [Kontakt bearbeiten]               │
├─────────────────────────────────────┤
│  🏢 Firma                           │
│  ───────────────────────────────    │
│  Sika AG                            │
│  Industrie: Baustoffe               │
│  Mitarbeiter: 28.000                │
│  [Firma öffnen]                     │
├─────────────────────────────────────┤
│  📧 E-Mail-Historie (12)            │
│  ───────────────────────────────    │
│  📤 28.10. Angebot versendet        │
│  📥 15.10. Anfrage erhalten         │
│  📤 10.10. Follow-up                │
│  [Alle anzeigen]                    │
├─────────────────────────────────────┤
│  📝 Letzte Notizen                  │
│  ───────────────────────────────    │
│  25.10. Telefonat: Budget OK        │
│  20.10. Meeting: Technische Details │
│  [Notiz hinzufügen]                 │
├─────────────────────────────────────┤
│  ⚡ Aktionen                        │
│  ───────────────────────────────    │
│  [📧 Archivieren]                   │
│  [👤 Kontakt aus Signatur]          │
│  [📅 Termin erstellen]              │
└─────────────────────────────────────┘
```

**Wenn Kontakt nicht gefunden:**

```
┌─────────────────────────────────────┐
│  FRIDAY CRM                    [×]  │
├─────────────────────────────────────┤
│  📧 Aktuelle E-Mail                 │
│  ───────────────────────────────    │
│  Von: max.mustermann@sika.com       │
│  Betreff: Angebot Dachsanierung     │
├─────────────────────────────────────┤
│  ⚠️ Kontakt nicht gefunden          │
│  ───────────────────────────────    │
│  💡 E-Mail-Signatur erkannt:        │
│                                     │
│  Max Mustermann                     │
│  Geschäftsführer, Sika AG           │
│  +49 123 456789                     │
│                                     │
│  [Kontakt aus Signatur erstellen]   │
│  [Manuell suchen]                   │
└─────────────────────────────────────┘
```

---

## 3. Technische Implementierung

### 3.1 Signatur-Parser (signatureParser.ts)

```typescript
interface ParsedSignature {
  name?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export function parseEmailSignature(emailBody: string): ParsedSignature | null {
  // E-Mail-Body in Zeilen aufteilen
  const lines = emailBody.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Signatur-Start finden (meist nach "--" oder letzten 10 Zeilen)
  const signatureStart = findSignatureStart(lines);
  const signatureLines = lines.slice(signatureStart);
  
  const result: ParsedSignature = {};
  
  for (const line of signatureLines) {
    // Name erkennen (meist erste Zeile, nur Buchstaben)
    if (!result.name && /^[A-ZÄÖÜa-zäöüß\s]+$/.test(line) && line.split(' ').length >= 2) {
      result.name = line;
      const parts = line.split(' ');
      result.firstName = parts[0];
      result.lastName = parts.slice(1).join(' ');
      continue;
    }
    
    // Telefon erkennen
    if (!result.phone && /(\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,}/.test(line)) {
      const match = line.match(/(\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,}/);
      if (match) result.phone = match[0];
      continue;
    }
    
    // E-Mail erkennen
    if (!result.email && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(line)) {
      const match = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) result.email = match[0];
      continue;
    }
    
    // Website erkennen
    if (!result.website && /(www\.|https?:\/\/)/.test(line)) {
      const match = line.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
      if (match) result.website = match[0];
      continue;
    }
    
    // Position erkennen (Keywords: Geschäftsführer, Manager, Leiter, etc.)
    if (!result.position && /geschäftsführer|manager|leiter|direktor|vorstand|ceo|cto|cfo/i.test(line)) {
      result.position = line;
      continue;
    }
    
    // Firma erkennen (meist nach Position oder vor Kontaktdaten)
    if (!result.company && !result.position && line.length > 3 && line.length < 50) {
      // Heuristik: Zeile ohne Sonderzeichen, aber mit Großbuchstaben
      if (/^[A-ZÄÖÜ]/.test(line) && !/[@\+\d]/.test(line)) {
        result.company = line;
      }
    }
  }
  
  // Validierung: Mindestens Name oder E-Mail muss vorhanden sein
  if (!result.name && !result.email) {
    return null;
  }
  
  return result;
}

function findSignatureStart(lines: string[]): number {
  // Suche nach "--" oder "___" (typische Signatur-Trenner)
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('--') || lines[i].startsWith('___')) {
      return i + 1;
    }
  }
  
  // Fallback: Letzte 10 Zeilen
  return Math.max(0, lines.length - 10);
}
```

**Beispiel-Nutzung:**

```typescript
const emailBody = `
Hallo,

vielen Dank für Ihre Anfrage.

Mit freundlichen Grüßen

--
Max Mustermann
Geschäftsführer
Sika AG
Tel: +49 711 12345678
E-Mail: max.mustermann@sika.com
www.sika.com
`;

const parsed = parseEmailSignature(emailBody);
console.log(parsed);
// {
//   name: "Max Mustermann",
//   firstName: "Max",
//   lastName: "Mustermann",
//   position: "Geschäftsführer",
//   company: "Sika AG",
//   phone: "+49 711 12345678",
//   email: "max.mustermann@sika.com",
//   website: "www.sika.com"
// }
```

---

### 3.2 Manuelle Archivierung - Dialog (ArchiveDialog.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { fridayClient } from '../api/fridayClient';

interface ArchiveDialogProps {
  emailData: {
    from: string;
    subject: string;
    body: string;
    attachments: any[];
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function ArchiveDialog({ emailData, onClose, onSuccess }: ArchiveDialogProps) {
  const [searchType, setSearchType] = useState<'contact' | 'company'>('contact');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (searchType === 'contact') {
          const results = await fridayClient.contacts.search.query({ query: searchQuery });
          setSearchResults(results);
        } else {
          const results = await fridayClient.companies.search.query({ query: searchQuery });
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  async function handleArchive() {
    if (!selectedItem) return;

    setLoading(true);
    try {
      await fridayClient.emails.create.mutate({
        fromAddress: emailData.from,
        subject: emailData.subject,
        bodyHtml: emailData.body,
        contactId: searchType === 'contact' ? selectedItem.id : null,
        companyId: searchType === 'company' ? selectedItem.id : null,
        direction: 'inbound',
        sentAt: new Date(),
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Archive failed:', error);
      alert('Fehler beim Archivieren: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">E-Mail archivieren</h2>

        {/* E-Mail-Info */}
        <div className="bg-gray-50 p-3 rounded mb-4">
          <p className="text-sm text-gray-600">Von: {emailData.from}</p>
          <p className="text-sm text-gray-600">Betreff: {emailData.subject}</p>
        </div>

        {/* Typ-Auswahl */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Zuordnen zu:</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="contact"
                checked={searchType === 'contact'}
                onChange={(e) => setSearchType('contact')}
                className="mr-2"
              />
              Kontakt
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="company"
                checked={searchType === 'company'}
                onChange={(e) => setSearchType('company')}
                className="mr-2"
              />
              Firma
            </label>
          </div>
        </div>

        {/* Suchfeld */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Suchen:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchType === 'contact' ? 'Name oder E-Mail...' : 'Firmenname...'}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {/* Suchergebnisse */}
        <div className="mb-4 max-h-64 overflow-y-auto">
          {loading && <p className="text-sm text-gray-500">Suche läuft...</p>}
          
          {!loading && searchResults.length === 0 && searchQuery.length >= 2 && (
            <p className="text-sm text-gray-500">Keine Ergebnisse gefunden</p>
          )}
          
          {!loading && searchResults.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`border rounded p-3 mb-2 cursor-pointer hover:bg-gray-50 ${
                selectedItem?.id === item.id ? 'bg-blue-50 border-blue-500' : ''
              }`}
            >
              {searchType === 'contact' ? (
                <>
                  <p className="font-semibold">{item.firstName} {item.lastName}</p>
                  <p className="text-sm text-gray-600">{item.company?.name} | {item.position}</p>
                  <p className="text-sm text-gray-500">{item.email}</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">{item.industry}</p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleArchive}
            disabled={!selectedItem || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Speichern...' : 'Archivieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### 3.3 Kontakt aus Signatur erstellen (CreateContactFromSignature.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { fridayClient } from '../api/fridayClient';
import { parseEmailSignature } from '../utils/signatureParser';

interface CreateContactFromSignatureProps {
  emailBody: string;
  onClose: () => void;
  onSuccess: (contactId: string) => void;
}

export default function CreateContactFromSignature({ 
  emailBody, 
  onClose, 
  onSuccess 
}: CreateContactFromSignatureProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    companyId: '',
  });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Signatur parsen
    const parsed = parseEmailSignature(emailBody);
    
    if (parsed) {
      setFormData({
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        position: parsed.position || '',
        companyId: '',
      });

      // Firma suchen (wenn erkannt)
      if (parsed.company) {
        searchCompany(parsed.company);
      }
    }
  }, [emailBody]);

  async function searchCompany(companyName: string) {
    try {
      const results = await fridayClient.companies.search.query({ query: companyName });
      setCompanies(results);
      
      // Wenn exakte Übereinstimmung, automatisch auswählen
      const exact = results.find(c => c.name.toLowerCase() === companyName.toLowerCase());
      if (exact) {
        setFormData(prev => ({ ...prev, companyId: exact.id }));
      }
    } catch (error) {
      console.error('Company search failed:', error);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const contact = await fridayClient.contacts.create.mutate(formData);
      onSuccess(contact.id);
      onClose();
    } catch (error) {
      console.error('Contact creation failed:', error);
      alert('Fehler beim Erstellen: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Kontakt aus Signatur erstellen</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vorname</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nachname</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">E-Mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Telefon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Firma</label>
            <select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Firma auswählen...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.email}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            {loading ? 'Speichern...' : 'Kontakt erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Implementierungs-Phasen (überarbeitet)

### Phase 1: Basis-Add-In (2-3 Wochen)
- [ ] Projekt-Setup (Manifest, React, TypeScript)
- [ ] Task Pane UI (Sidebar)
- [ ] FRIDAY API Client (tRPC)
- [ ] Kontakt-Anzeige
- [ ] E-Mail-Historie
- [ ] Deployment auf Hetzner

### Phase 2: Signatur-Parser (1 Woche)
- [ ] Signatur-Parser implementieren
- [ ] "Kontakt aus Signatur erstellen" Dialog
- [ ] Firma-Suche und Zuordnung
- [ ] Testing mit verschiedenen Signatur-Formaten

### Phase 3: Manuelle Archivierung (1 Woche)
- [ ] Archivierungs-Dialog
- [ ] Kontakt/Firma-Suche
- [ ] E-Mail + Anhänge speichern
- [ ] Erfolgsmeldungen

### Phase 4: Notizen & Feinschliff (1 Woche)
- [ ] Notizen hinzufügen
- [ ] Termin erstellen
- [ ] Performance-Optimierung
- [ ] User-Testing

**Total: 5-6 Wochen**

---

## 5. Kosten (überarbeitet)

### Entwicklung
- **Phase 1:** 80-120 Stunden
- **Phase 2:** 40-60 Stunden
- **Phase 3:** 40-60 Stunden
- **Phase 4:** 20-40 Stunden
- **Total: 180-280 Stunden**

### Betrieb
- **Hosting:** €0 (bereits vorhanden)
- **SSL:** €0 (Let's Encrypt)
- **Lizenzen:** €0 (Open Source)

---

## 6. Zusammenfassung

### ✅ Fokussierte Features

1. **Kontakt-Info in Sidebar** - Automatisch angezeigt
2. **E-Mail-Historie** - Bisherige Kommunikation
3. **Notizen hinzufügen** - Ohne FRIDAY öffnen
4. **Kontakt aus Signatur erstellen** - Automatisches Parsen
5. **Manuelle Archivierung** - Mit Suche nach Kontakt/Firma

### ❌ Vorerst nicht implementiert

- Deal-Status
- E-Mail-Vorlagen
- Platzhalter-Engine
- Tracking

### 🎯 Nächste Schritte

1. **Grünes Licht?** Soll ich mit Phase 1 starten?
2. **Pilot-Test:** Wann mit 2-3 Kollegen testen?
3. **Prioritäten:** Welche Phase zuerst?

**Ich kann sofort starten!**

