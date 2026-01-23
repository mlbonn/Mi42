# FRIDAY CRM - Outlook Add-In Konzept

**Version:** 1.0  
**Datum:** 29.10.2025  
**Status:** Detailliertes Konzept

---

## 1. Vision

### Ziel
**"Arbeite in Outlook, nutze FRIDAY im Hintergrund"**

Mitarbeiter bleiben in ihrer gewohnten Outlook-Umgebung und haben alle FRIDAY CRM-Funktionen direkt verfügbar - ohne zwischen Anwendungen wechseln zu müssen.

### Kernprinzip
- ✅ **Outlook ist die Hauptanwendung** (E-Mail, Kalender, Kontakte)
- ✅ **FRIDAY ist die Datenbank** (CRM-Daten, Historie, Deals)
- ✅ **Add-In verbindet beide** (Sidebar, Buttons, Automatisierung)

---

## 2. Outlook Add-In Architektur

### 2.1 Technologie-Stack

**Microsoft Office Add-Ins Platform:**
```
┌─────────────────────────────────────────┐
│         Outlook Desktop/Web/Mobile      │
│  ┌───────────────────────────────────┐  │
│  │   FRIDAY Add-In (Task Pane)       │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  React + TypeScript         │  │  │
│  │  │  Office.js API              │  │  │
│  │  │  FRIDAY API Client          │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕
         HTTPS (tRPC/REST)
                    ↕
┌─────────────────────────────────────────┐
│      FRIDAY CRM Backend (Hetzner)       │
│  - tRPC API                             │
│  - Datenbank (MySQL)                    │
│  - S3 Storage                           │
└─────────────────────────────────────────┘
```

### 2.2 Add-In Typen

**Task Pane Add-In (empfohlen):**
- Sidebar rechts in Outlook
- Immer sichtbar während E-Mail-Bearbeitung
- Zugriff auf aktuelle E-Mail, Absender, Anhänge

**Compose Add-In:**
- Buttons beim E-Mail-Schreiben
- Vorlagen einfügen, Tracking aktivieren

**Read Add-In:**
- Buttons beim E-Mail-Lesen
- Kontakt speichern, Deal erstellen

---

## 3. Benutzer-Workflows

### 3.1 Workflow: E-Mail empfangen

**Szenario:** Kollege erhält E-Mail von potenziellem Kunden

```
1. E-Mail öffnen in Outlook
   ↓
2. FRIDAY Add-In Sidebar öffnet sich automatisch
   ↓
3. Add-In zeigt:
   ✅ Kontakt gefunden: "Max Mustermann (Bauder GmbH)"
   ✅ Letzte Interaktion: 15.10.2025 - Angebot versendet
   ✅ Offene Deals: "Dachsanierung Projekt XY" (€250.000)
   ✅ E-Mail-Historie: 12 E-Mails seit 2024
   ✅ Notizen: "Entscheidung bis Ende Oktober"
   ↓
4. Kollege klickt "E-Mail archivieren"
   ↓
5. E-Mail wird automatisch in FRIDAY gespeichert
   - Verknüpft mit Kontakt
   - Verknüpft mit Deal
   - Anhänge in S3 hochgeladen
   ↓
6. Kollege antwortet direkt in Outlook
   ↓
7. Antwort wird automatisch archiviert (via IMAP-Sync)
```

**Ergebnis:** Keine manuelle Eingabe in FRIDAY nötig!

---

### 3.2 Workflow: E-Mail an unbekannten Absender

**Szenario:** Neue Lead-E-Mail von unbekannter Firma

```
1. E-Mail öffnen in Outlook
   ↓
2. FRIDAY Add-In zeigt:
   ⚠️ Kontakt nicht gefunden
   💡 Firma erkannt: "Sika AG" (via Domain sika.com)
   ↓
3. Add-In bietet an:
   [Neuen Kontakt erstellen]
   [Firma zuordnen: Sika AG]
   [Ignorieren]
   ↓
4. Kollege klickt "Neuen Kontakt erstellen"
   ↓
5. Formular öffnet sich in Sidebar:
   - Name: "Max Mustermann" (automatisch aus E-Mail)
   - E-Mail: "max.mustermann@sika.com" (automatisch)
   - Firma: "Sika AG" (vorausgewählt)
   - Position: [Eingabefeld]
   - Telefon: [Eingabefeld]
   ↓
6. Kollege füllt Position aus, klickt "Speichern"
   ↓
7. Kontakt wird in FRIDAY erstellt
   ↓
8. E-Mail wird automatisch archiviert und verknüpft
```

**Ergebnis:** Kontakt erstellen ohne FRIDAY zu öffnen!

---

### 3.3 Workflow: E-Mail mit Vorlage versenden

**Szenario:** Kollege möchte Angebot versenden

```
1. "Neue E-Mail" in Outlook klicken
   ↓
2. FRIDAY Add-In Sidebar zeigt:
   📧 E-Mail-Vorlagen:
   - "Angebot Dachsanierung"
   - "Follow-up nach Meeting"
   - "Absage höflich"
   ↓
3. Kollege wählt "Angebot Dachsanierung"
   ↓
4. Add-In fragt:
   "Für welchen Kontakt?"
   [Suchfeld: "Max Mustermann"]
   ↓
5. Kollege wählt Kontakt aus
   ↓
6. Vorlage wird eingefügt mit Platzhaltern ersetzt:
   - {{Anrede}} → "Sehr geehrter Herr Mustermann"
   - {{Firma}} → "Bauder GmbH"
   - {{Projekt}} → "Dachsanierung Projekt XY"
   - {{Betrag}} → "€250.000"
   ↓
7. Kollege passt Text an, fügt Anhänge hinzu
   ↓
8. Kollege klickt "Senden"
   ↓
9. E-Mail wird versendet UND automatisch archiviert
   - In FRIDAY als "outbound" gespeichert
   - Verknüpft mit Kontakt + Deal
   - Tracking-Pixel eingefügt (optional)
```

**Ergebnis:** Vorlagen nutzen ohne FRIDAY zu öffnen!

---

### 3.4 Workflow: Deal erstellen aus E-Mail

**Szenario:** Kunde schreibt "Wir möchten bestellen"

```
1. E-Mail öffnen in Outlook
   ↓
2. FRIDAY Add-In zeigt Kontakt-Info
   ↓
3. Kollege klickt "Deal erstellen"
   ↓
4. Formular öffnet sich in Sidebar:
   - Titel: [Eingabefeld] (vorausgefüllt: "Bestellung Bauder GmbH")
   - Kontakt: "Max Mustermann" (automatisch)
   - Firma: "Bauder GmbH" (automatisch)
   - Wert: [Eingabefeld]
   - Phase: [Dropdown: Angebot, Verhandlung, Abschluss]
   - Notizen: [Textfeld]
   ↓
5. Kollege füllt Wert + Phase aus, klickt "Speichern"
   ↓
6. Deal wird in FRIDAY erstellt
   ↓
7. E-Mail wird automatisch mit Deal verknüpft
```

**Ergebnis:** Deal erstellen ohne FRIDAY zu öffnen!

---

### 3.5 Workflow: Notiz hinzufügen

**Szenario:** Telefonat mit Kunde, Kollege möchte Notiz speichern

```
1. Outlook öffnen (egal welche Ansicht)
   ↓
2. FRIDAY Add-In Sidebar öffnen
   ↓
3. Kontakt suchen: "Max Mustermann"
   ↓
4. Klick auf "Notiz hinzufügen"
   ↓
5. Textfeld öffnet sich:
   [Notiz eingeben...]
   ↓
6. Kollege schreibt: "Telefonat 29.10.: Entscheidung verschoben auf 15.11."
   ↓
7. Klick "Speichern"
   ↓
8. Notiz wird in FRIDAY gespeichert
   - Verknüpft mit Kontakt
   - Zeitstempel automatisch
```

**Ergebnis:** Notizen speichern ohne FRIDAY zu öffnen!

---

## 4. Add-In Features (detailliert)

### 4.1 Sidebar-Ansicht (Task Pane)

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
│  Umsatz: €10.5 Mrd                  │
│  [Firma öffnen]                     │
├─────────────────────────────────────┤
│  💼 Offene Deals (2)                │
│  ───────────────────────────────    │
│  ✅ Dachsanierung Projekt XY        │
│     €250.000 | Verhandlung          │
│  ⏳ Wartungsvertrag 2025            │
│     €50.000 | Angebot               │
│  [Neuer Deal]                       │
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
│  [📧 E-Mail archivieren]            │
│  [💼 Deal erstellen]                │
│  [📅 Termin erstellen]              │
│  [📎 Anhänge hochladen]             │
└─────────────────────────────────────┘
```

---

### 4.2 E-Mail-Vorlagen (Compose Mode)

**Button in Outlook-Ribbon:**
```
[FRIDAY Vorlagen ▼]
```

**Dropdown-Menü:**
```
📧 E-Mail-Vorlagen
├─ Angebote
│  ├─ Angebot Dachsanierung
│  ├─ Angebot Wartungsvertrag
│  └─ Angebot Beratung
├─ Follow-ups
│  ├─ Follow-up nach Meeting
│  ├─ Follow-up nach Angebot
│  └─ Follow-up nach Demo
├─ Absagen
│  ├─ Absage höflich
│  └─ Absage mit Alternative
└─ Sonstiges
   ├─ Terminbestätigung
   └─ Rechnung
```

**Platzhalter-System:**
```
Sehr geehrter {{Anrede}} {{Nachname}},

vielen Dank für Ihr Interesse an {{Produkt}}.

Gerne unterbreiten wir Ihnen ein Angebot für {{Projekt}}:

Leistungsumfang:
{{Leistungen}}

Gesamtpreis: {{Betrag}} (netto)

Mit freundlichen Grüßen
{{MeinName}}
{{MeineTelefon}}
```

**Automatische Ersetzung:**
- `{{Anrede}}` → "Herr" / "Frau" (aus Kontakt)
- `{{Nachname}}` → "Mustermann"
- `{{Firma}}` → "Bauder GmbH"
- `{{Projekt}}` → aus Deal-Titel
- `{{Betrag}}` → aus Deal-Wert
- `{{MeinName}}` → aus Outlook-Profil

---

### 4.3 Schnellaktionen (Context Menu)

**Rechtsklick auf E-Mail:**
```
┌─────────────────────────────────┐
│ Antworten                       │
│ Weiterleiten                    │
│ ─────────────────────────────── │
│ FRIDAY CRM                      │
│ ├─ 📧 E-Mail archivieren        │
│ ├─ 👤 Kontakt erstellen         │
│ ├─ 💼 Deal erstellen            │
│ ├─ 📅 Termin erstellen          │
│ └─ 📎 Anhänge in Deal speichern │
└─────────────────────────────────┘
```

---

### 4.4 Automatische Archivierung

**Trigger:**
1. **E-Mail gesendet** → automatisch archivieren
2. **E-Mail empfangen** → automatisch archivieren (wenn Kontakt bekannt)
3. **Anhang hinzugefügt** → automatisch in S3 hochladen

**Konfiguration (in Add-In Einstellungen):**
```
✅ Alle gesendeten E-Mails archivieren
✅ Alle empfangenen E-Mails archivieren (nur bekannte Kontakte)
☐ Alle empfangenen E-Mails archivieren (auch unbekannte)
✅ Anhänge automatisch hochladen
✅ Tracking-Pixel einfügen (geöffnet/geklickt)
```

---

### 4.5 Kontakt-Suche

**Suchfeld in Sidebar:**
```
┌─────────────────────────────────┐
│ 🔍 Kontakt suchen...            │
└─────────────────────────────────┘
```

**Suche nach:**
- Name (Vor- und Nachname)
- E-Mail-Adresse
- Firma
- Telefonnummer

**Ergebnisse:**
```
📍 Suchergebnisse für "Mustermann"

👤 Max Mustermann
   Sika AG | Geschäftsführer
   max.mustermann@sika.com
   [Auswählen]

👤 Anna Mustermann
   Bauder GmbH | Einkaufsleiterin
   anna.mustermann@bauder.de
   [Auswählen]
```

---

### 4.6 Deal-Übersicht

**Ansicht in Sidebar:**
```
💼 Meine Deals (15)

Filter: [Alle ▼] [Sortieren: Wert ▼]

✅ Dachsanierung Projekt XY
   Bauder GmbH | €250.000
   Phase: Verhandlung
   Nächster Schritt: Angebot nachfassen
   [Details] [Bearbeiten]

⏳ Wartungsvertrag 2025
   Sika AG | €50.000
   Phase: Angebot
   Nächster Schritt: Termin vereinbaren
   [Details] [Bearbeiten]

🔴 Beratung Flachdach
   Knauf Gips | €15.000
   Phase: Qualifizierung
   Nächster Schritt: Technische Klärung
   [Details] [Bearbeiten]
```

---

### 4.7 Anhänge-Management

**Szenario:** E-Mail mit PDF-Angebot erhalten

**Add-In zeigt:**
```
📎 Anhänge (2)

📄 Angebot_Dachsanierung.pdf (1.2 MB)
   [In Deal speichern] [Herunterladen]

📊 Kalkulation.xlsx (450 KB)
   [In Deal speichern] [Herunterladen]
```

**Klick auf "In Deal speichern":**
```
Deal auswählen:
☐ Dachsanierung Projekt XY (€250.000)
☐ Wartungsvertrag 2025 (€50.000)
☐ [Neuer Deal]

[Speichern] [Abbrechen]
```

**Ergebnis:**
- Anhang wird in S3 hochgeladen
- Verknüpfung in FRIDAY-Datenbank gespeichert
- In Deal-Detail-Seite sichtbar

---

### 4.8 Kalender-Integration

**Termin erstellen aus E-Mail:**

**Szenario:** E-Mail enthält "Meeting am 15.11. um 14 Uhr"

**Add-In erkennt Datum/Zeit und bietet an:**
```
📅 Termin erkannt!

Datum: 15.11.2025, 14:00 Uhr
Dauer: 1 Stunde (anpassbar)
Teilnehmer: Max Mustermann (max.mustermann@sika.com)
Betreff: Meeting Dachsanierung

[Termin erstellen] [Ignorieren]
```

**Klick auf "Termin erstellen":**
- Termin wird in Outlook-Kalender erstellt
- Automatisch in FRIDAY synchronisiert (via CalDAV)
- Verknüpft mit Kontakt + Deal

---

### 4.9 Tracking & Analytics

**E-Mail-Tracking (optional):**

**Beim Versenden:**
```
✅ Tracking aktivieren
   ☐ Öffnungs-Tracking (Pixel)
   ☐ Link-Klick-Tracking
```

**In Sidebar nach Versand:**
```
📊 E-Mail-Status

📤 Angebot versendet (28.10.2025, 10:30)
   ✅ Zugestellt
   ✅ Geöffnet (28.10.2025, 11:45)
   ✅ Link geklickt (28.10.2025, 11:47)
   ⏳ Keine Antwort (seit 1 Tag)

💡 Empfehlung: Follow-up senden
   [Follow-up-Vorlage einfügen]
```

---

## 5. Technische Implementierung

### 5.1 Projekt-Struktur

```
friday-crm/
├─ outlook-addin/
│  ├─ manifest.xml              # Add-In Manifest
│  ├─ src/
│  │  ├─ taskpane/
│  │  │  ├─ App.tsx             # React Haupt-Komponente
│  │  │  ├─ ContactView.tsx     # Kontakt-Ansicht
│  │  │  ├─ DealView.tsx        # Deal-Ansicht
│  │  │  ├─ EmailHistory.tsx    # E-Mail-Historie
│  │  │  ├─ TemplateSelector.tsx # Vorlagen-Auswahl
│  │  │  └─ QuickActions.tsx    # Schnellaktionen
│  │  ├─ commands/
│  │  │  ├─ archiveEmail.ts     # E-Mail archivieren
│  │  │  ├─ createContact.ts    # Kontakt erstellen
│  │  │  ├─ createDeal.ts       # Deal erstellen
│  │  │  └─ insertTemplate.ts   # Vorlage einfügen
│  │  ├─ api/
│  │  │  └─ fridayClient.ts     # FRIDAY API Client (tRPC)
│  │  └─ utils/
│  │     ├─ emailParser.ts      # E-Mail-Daten extrahieren
│  │     ├─ templateEngine.ts   # Platzhalter ersetzen
│  │     └─ contactMatcher.ts   # Kontakt-Zuordnung
│  ├─ assets/
│  │  ├─ icon-32.png
│  │  ├─ icon-64.png
│  │  └─ icon-128.png
│  ├─ package.json
│  ├─ webpack.config.js
│  └─ tsconfig.json
```

---

### 5.2 Manifest (manifest.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">
  
  <Id>a1b2c3d4-e5f6-7890-abcd-ef1234567890</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>FRIDAY CRM</ProviderName>
  <DefaultLocale>de-DE</DefaultLocale>
  <DisplayName DefaultValue="FRIDAY CRM"/>
  <Description DefaultValue="CRM-Integration für Outlook"/>
  
  <IconUrl DefaultValue="https://friday-crm.yourdomain.com/assets/icon-64.png"/>
  <HighResolutionIconUrl DefaultValue="https://friday-crm.yourdomain.com/assets/icon-128.png"/>
  
  <SupportUrl DefaultValue="https://friday-crm.yourdomain.com/support"/>
  
  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>
  
  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="1.1"/>
    </Sets>
  </Requirements>
  
  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://friday-crm.yourdomain.com/outlook-addin/taskpane.html"/>
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
    <Form xsi:type="ItemEdit">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://friday-crm.yourdomain.com/outlook-addin/taskpane.html"/>
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>
  
  <Permissions>ReadWriteMailbox</Permissions>
  
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read"/>
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Edit"/>
  </Rule>
  
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/mailappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Requirements>
      <bt:Sets DefaultMinVersion="1.3">
        <bt:Set Name="Mailbox"/>
      </bt:Sets>
    </Requirements>
    
    <Hosts>
      <Host xsi:type="MailHost">
        <DesktopFormFactor>
          <FunctionFile resid="Commands.Url"/>
          
          <ExtensionPoint xsi:type="MessageReadCommandSurface">
            <OfficeTab id="TabDefault">
              <Group id="msgReadGroup">
                <Label resid="GroupLabel"/>
                <Control xsi:type="Button" id="msgReadOpenPaneButton">
                  <Label resid="TaskpaneButton.Label"/>
                  <Supertip>
                    <Title resid="TaskpaneButton.Label"/>
                    <Description resid="TaskpaneButton.Tooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16"/>
                    <bt:Image size="32" resid="Icon.32x32"/>
                    <bt:Image size="80" resid="Icon.80x80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <SourceLocation resid="Taskpane.Url"/>
                  </Action>
                </Control>
                
                <Control xsi:type="Button" id="msgReadArchiveButton">
                  <Label resid="ArchiveButton.Label"/>
                  <Supertip>
                    <Title resid="ArchiveButton.Label"/>
                    <Description resid="ArchiveButton.Tooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16"/>
                    <bt:Image size="32" resid="Icon.32x32"/>
                    <bt:Image size="80" resid="Icon.80x80"/>
                  </Icon>
                  <Action xsi:type="ExecuteFunction">
                    <FunctionName>archiveEmail</FunctionName>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
          
          <ExtensionPoint xsi:type="MessageComposeCommandSurface">
            <OfficeTab id="TabDefault">
              <Group id="msgComposeGroup">
                <Label resid="GroupLabel"/>
                <Control xsi:type="Button" id="msgComposeInsertTemplateButton">
                  <Label resid="TemplateButton.Label"/>
                  <Supertip>
                    <Title resid="TemplateButton.Label"/>
                    <Description resid="TemplateButton.Tooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16"/>
                    <bt:Image size="32" resid="Icon.32x32"/>
                    <bt:Image size="80" resid="Icon.80x80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <SourceLocation resid="Taskpane.Url"/>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="https://friday-crm.yourdomain.com/assets/icon-16.png"/>
        <bt:Image id="Icon.32x32" DefaultValue="https://friday-crm.yourdomain.com/assets/icon-32.png"/>
        <bt:Image id="Icon.80x80" DefaultValue="https://friday-crm.yourdomain.com/assets/icon-80.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Commands.Url" DefaultValue="https://friday-crm.yourdomain.com/outlook-addin/commands.html"/>
        <bt:Url id="Taskpane.Url" DefaultValue="https://friday-crm.yourdomain.com/outlook-addin/taskpane.html"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GroupLabel" DefaultValue="FRIDAY CRM"/>
        <bt:String id="TaskpaneButton.Label" DefaultValue="FRIDAY öffnen"/>
        <bt:String id="ArchiveButton.Label" DefaultValue="Archivieren"/>
        <bt:String id="TemplateButton.Label" DefaultValue="Vorlage einfügen"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="TaskpaneButton.Tooltip" DefaultValue="FRIDAY CRM Sidebar öffnen"/>
        <bt:String id="ArchiveButton.Tooltip" DefaultValue="E-Mail in FRIDAY archivieren"/>
        <bt:String id="TemplateButton.Tooltip" DefaultValue="E-Mail-Vorlage aus FRIDAY einfügen"/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
```

---

### 5.3 React Haupt-Komponente (App.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { Office } from '@microsoft/office-js';
import { fridayClient } from './api/fridayClient';
import ContactView from './ContactView';
import DealView from './DealView';
import EmailHistory from './EmailHistory';
import QuickActions from './QuickActions';

interface EmailData {
  from: string;
  subject: string;
  body: string;
  attachments: Office.AttachmentDetails[];
}

export default function App() {
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [contact, setContact] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Office.onReady(() => {
      loadEmailData();
    });
  }, []);

  async function loadEmailData() {
    const item = Office.context.mailbox.item;
    
    if (!item) return;
    
    // E-Mail-Daten extrahieren
    const from = item.from?.emailAddress || '';
    const subject = item.subject || '';
    
    // Body asynchron laden
    item.body.getAsync(Office.CoercionType.Text, async (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const emailData = {
          from,
          subject,
          body: result.value,
          attachments: item.attachments || [],
        };
        
        setEmailData(emailData);
        
        // Kontakt in FRIDAY suchen
        try {
          const contact = await fridayClient.contacts.findByEmail.query({ email: from });
          setContact(contact);
          
          if (contact) {
            // Deals laden
            const deals = await fridayClient.deals.getByContact.query({ contactId: contact.id });
            setDeals(deals);
          }
        } catch (error) {
          console.error('Failed to load contact:', error);
        } finally {
          setLoading(false);
        }
      }
    });
  }

  if (loading) {
    return <div className="p-4">Lade FRIDAY-Daten...</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">FRIDAY CRM</h1>
      </header>
      
      <main className="p-4 space-y-4">
        {emailData && (
          <div className="bg-gray-50 p-3 rounded">
            <h3 className="font-semibold text-sm">Aktuelle E-Mail</h3>
            <p className="text-sm text-gray-600">Von: {emailData.from}</p>
            <p className="text-sm text-gray-600">Betreff: {emailData.subject}</p>
          </div>
        )}
        
        {contact ? (
          <>
            <ContactView contact={contact} />
            <DealView deals={deals} contactId={contact.id} />
            <EmailHistory contactId={contact.id} />
          </>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
            <p className="text-sm">⚠️ Kontakt nicht gefunden</p>
            <button
              onClick={() => createContact(emailData!.from)}
              className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Neuen Kontakt erstellen
            </button>
          </div>
        )}
        
        <QuickActions emailData={emailData} contact={contact} />
      </main>
    </div>
  );
}

async function createContact(email: string) {
  // Kontakt-Erstellungs-Dialog öffnen
  // ...
}
```

---

### 5.4 E-Mail archivieren (archiveEmail.ts)

```typescript
import { Office } from '@microsoft/office-js';
import { fridayClient } from '../api/fridayClient';
import { uploadAttachmentToS3 } from '../utils/s3Upload';

export async function archiveEmail() {
  const item = Office.context.mailbox.item;
  
  if (!item) {
    console.error('No email item found');
    return;
  }
  
  try {
    // E-Mail-Daten extrahieren
    const from = item.from?.emailAddress || '';
    const to = item.to?.map(t => t.emailAddress) || [];
    const subject = item.subject || '';
    const messageId = item.internetMessageId || '';
    const sentAt = item.dateTimeCreated || new Date();
    
    // Body laden
    const body = await new Promise<string>((resolve) => {
      item.body.getAsync(Office.CoercionType.Html, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value);
        } else {
          resolve('');
        }
      });
    });
    
    // Anhänge hochladen
    const attachmentIds: string[] = [];
    for (const attachment of item.attachments) {
      const attachmentData = await getAttachmentContent(attachment.id);
      const s3Result = await uploadAttachmentToS3(attachment.name, attachmentData);
      
      const savedAttachment = await fridayClient.emailAttachments.create.mutate({
        filename: attachment.name,
        mimeType: attachment.contentType,
        size: attachment.size,
        s3Key: s3Result.key,
        s3Url: s3Result.url,
      });
      
      attachmentIds.push(savedAttachment.id);
    }
    
    // E-Mail in FRIDAY speichern
    await fridayClient.emails.create.mutate({
      messageId,
      fromAddress: from,
      toAddresses: to,
      subject,
      bodyHtml: body,
      sentAt,
      direction: 'inbound',
      attachmentIds,
    });
    
    // Erfolgsmeldung
    Office.context.mailbox.item?.notificationMessages.addAsync('archiveSuccess', {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: 'E-Mail erfolgreich in FRIDAY archiviert',
      icon: 'icon-16',
      persistent: false,
    });
    
  } catch (error) {
    console.error('Failed to archive email:', error);
    
    Office.context.mailbox.item?.notificationMessages.addAsync('archiveError', {
      type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
      message: 'Fehler beim Archivieren: ' + error.message,
    });
  }
}

async function getAttachmentContent(attachmentId: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    Office.context.mailbox.item?.getAttachmentContentAsync(attachmentId, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value.content);
      } else {
        reject(new Error('Failed to get attachment content'));
      }
    });
  });
}
```

---

### 5.5 Vorlage einfügen (insertTemplate.ts)

```typescript
import { Office } from '@microsoft/office-js';
import { fridayClient } from '../api/fridayClient';
import { replaceTemplatePlaceholders } from '../utils/templateEngine';

export async function insertTemplate(templateId: string, contactId: string) {
  try {
    // Vorlage aus FRIDAY laden
    const template = await fridayClient.emailTemplates.getById.query({ id: templateId });
    
    // Kontakt-Daten laden
    const contact = await fridayClient.contacts.getById.query({ id: contactId });
    
    // Platzhalter ersetzen
    const subject = replaceTemplatePlaceholders(template.subject, contact);
    const body = replaceTemplatePlaceholders(template.body, contact);
    
    // In Outlook einfügen
    const item = Office.context.mailbox.item;
    
    if (!item) return;
    
    // Betreff setzen
    item.subject.setAsync(subject);
    
    // Body setzen
    item.body.setAsync(body, { coercionType: Office.CoercionType.Html });
    
    // Empfänger setzen
    item.to.setAsync([contact.email]);
    
    // Erfolgsmeldung
    item.notificationMessages.addAsync('templateInserted', {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: `Vorlage "${template.name}" eingefügt`,
      icon: 'icon-16',
      persistent: false,
    });
    
  } catch (error) {
    console.error('Failed to insert template:', error);
  }
}
```

---

### 5.6 Template Engine (templateEngine.ts)

```typescript
interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  company: {
    name: string;
    industry: string;
  };
  deals?: {
    title: string;
    value: number;
  }[];
}

export function replaceTemplatePlaceholders(text: string, contact: Contact): string {
  const placeholders: Record<string, string> = {
    '{{Anrede}}': contact.firstName ? 'Herr' : 'Frau', // Vereinfacht
    '{{Vorname}}': contact.firstName || '',
    '{{Nachname}}': contact.lastName || '',
    '{{Email}}': contact.email || '',
    '{{Firma}}': contact.company?.name || '',
    '{{Branche}}': contact.company?.industry || '',
    '{{Projekt}}': contact.deals?.[0]?.title || '',
    '{{Betrag}}': contact.deals?.[0]?.value ? formatCurrency(contact.deals[0].value) : '',
    '{{MeinName}}': getUserName(),
    '{{MeineTelefon}}': getUserPhone(),
    '{{MeineEmail}}': getUserEmail(),
  };
  
  let result = text;
  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return result;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function getUserName(): string {
  return Office.context.mailbox.userProfile.displayName || '';
}

function getUserEmail(): string {
  return Office.context.mailbox.userProfile.emailAddress || '';
}

function getUserPhone(): string {
  // Aus FRIDAY-User-Profil laden
  return '+49 123 456789'; // Placeholder
}
```

---

## 6. Deployment & Installation

### 6.1 Hosting

**Add-In muss öffentlich erreichbar sein:**

```
https://friday-crm.yourdomain.com/outlook-addin/
├─ taskpane.html
├─ commands.html
├─ assets/
│  ├─ icon-16.png
│  ├─ icon-32.png
│  ├─ icon-64.png
│  └─ icon-128.png
└─ manifest.xml
```

**Deployment:**
1. Build erstellen: `pnpm run build:outlook-addin`
2. Auf Hetzner hochladen: `/var/www/friday-crm/outlook-addin/`
3. Nginx konfigurieren (HTTPS erforderlich!)

---

### 6.2 Installation (Zentral via Admin)

**Option A: Microsoft 365 Admin Center (empfohlen)**

1. Admin meldet sich an: https://admin.microsoft.com
2. Navigiere zu: **Einstellungen → Integrierte Apps → Add-Ins hochladen**
3. Manifest hochladen: `manifest.xml`
4. Bereitstellung konfigurieren:
   - **Benutzer:** Alle Benutzer / Bestimmte Gruppen
   - **Automatisch installieren:** Ja
5. Speichern

**Ergebnis:** Add-In erscheint automatisch in Outlook für alle Benutzer!

---

**Option B: Manuell (pro Benutzer)**

1. Outlook öffnen
2. **Datei → Add-Ins verwalten**
3. **Benutzerdefinierte Add-Ins → Aus Datei hinzufügen**
4. `manifest.xml` auswählen
5. Installieren

---

### 6.3 Konfiguration

**Erste Anmeldung:**

1. Add-In öffnen in Outlook
2. Login-Dialog erscheint:
   ```
   ┌─────────────────────────────────┐
   │  FRIDAY CRM Anmeldung           │
   ├─────────────────────────────────┤
   │  E-Mail: [agent32@bl2020.com]   │
   │  Passwort: [••••••••]           │
   │                                 │
   │  [Anmelden]                     │
   └─────────────────────────────────┘
   ```
3. Nach Login: Token in LocalStorage gespeichert
4. Add-In ist bereit!

---

## 7. Vorteile für Kollegen

### ✅ Zeitersparnis

**Vorher (ohne Add-In):**
1. E-Mail in Outlook lesen (30 Sek)
2. FRIDAY öffnen (10 Sek)
3. Kontakt suchen (20 Sek)
4. E-Mail manuell kopieren/einfügen (60 Sek)
5. Anhänge herunterladen + hochladen (120 Sek)
**Total: 240 Sekunden (4 Minuten)**

**Nachher (mit Add-In):**
1. E-Mail in Outlook lesen (30 Sek)
2. Klick auf "Archivieren" (2 Sek)
**Total: 32 Sekunden**

**Ersparnis: 87% weniger Zeit!**

---

### ✅ Weniger Fehler

- Keine manuelle Zuordnung → keine Fehler
- Keine vergessenen E-Mails → vollständige Historie
- Keine verlorenen Anhänge → alles automatisch gespeichert

---

### ✅ Besserer Überblick

- Kontakt-Info direkt in Outlook
- Deal-Status sofort sichtbar
- E-Mail-Historie auf einen Blick
- Nächste Schritte klar erkennbar

---

## 8. Implementierungs-Phasen

### Phase 1: Basis-Add-In (3-4 Wochen)
- [x] Projekt-Setup (Manifest, React, TypeScript)
- [ ] Task Pane UI (Sidebar)
- [ ] FRIDAY API Client (tRPC)
- [ ] Kontakt-Anzeige
- [ ] E-Mail archivieren (Button)
- [ ] Deployment auf Hetzner
- [ ] Installation im Microsoft 365 Admin Center

### Phase 2: Erweiterte Features (2-3 Wochen)
- [ ] E-Mail-Vorlagen
- [ ] Template Engine (Platzhalter)
- [ ] Deal-Ansicht
- [ ] E-Mail-Historie
- [ ] Anhänge-Management
- [ ] Schnellaktionen (Kontakt/Deal erstellen)

### Phase 3: Automatisierung (1-2 Wochen)
- [ ] Automatische Archivierung (beim Senden/Empfangen)
- [ ] Automatische Kontakt-Zuordnung
- [ ] Kalender-Integration (Termin aus E-Mail)
- [ ] Tracking (Öffnungen, Klicks)

### Phase 4: Optimierung (1 Woche)
- [ ] Performance-Optimierung
- [ ] Offline-Modus (LocalStorage-Cache)
- [ ] Fehlerbehandlung
- [ ] User-Testing + Feedback

**Total: 7-10 Wochen**

---

## 9. Kosten & Ressourcen

### Entwicklung
- **Phase 1:** 120-160 Stunden
- **Phase 2:** 80-120 Stunden
- **Phase 3:** 40-80 Stunden
- **Phase 4:** 20-40 Stunden
- **Total: 260-400 Stunden**

### Betrieb
- **Hosting:** Bereits vorhanden (Hetzner)
- **SSL-Zertifikat:** Bereits vorhanden (Let's Encrypt)
- **Microsoft 365:** Bereits vorhanden
- **Zusatzkosten: €0/Monat**

### Lizenzen
- **Office.js:** Kostenlos (Microsoft)
- **React:** Kostenlos (MIT)
- **TypeScript:** Kostenlos (Apache 2.0)
- **Keine Lizenzkosten!**

---

## 10. Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Microsoft API-Änderungen | Niedrig | Hoch | Versionierung, regelmäßige Updates |
| Add-In-Performance langsam | Mittel | Mittel | Caching, Lazy Loading |
| Benutzer-Akzeptanz niedrig | Niedrig | Hoch | User-Testing, Schulungen |
| HTTPS-Zertifikat abgelaufen | Niedrig | Hoch | Auto-Renewal (Let's Encrypt) |
| FRIDAY API down | Niedrig | Hoch | Offline-Modus, Retry-Logik |

---

## 11. Alternativen

### Option: Power Automate (Microsoft Flow)

**Pro:**
- No-Code-Lösung
- Einfache Workflows

**Contra:**
- Keine UI in Outlook
- Begrenzte Logik
- Keine Vorlagen-Engine

**Empfehlung:** Nur für einfache Automatisierungen (z.B. "E-Mail archivieren bei bestimmtem Betreff")

---

### Option: Zapier/Make

**Pro:**
- Schnelle Integration
- Viele Konnektoren

**Contra:**
- Kosten: $20-100/Monat
- Keine Outlook-UI
- Vendor Lock-in

**Empfehlung:** Nicht geeignet für diese Anforderung

---

## 12. Zusammenfassung & Empfehlung

### ✅ Outlook Add-In ist die beste Lösung!

**Warum:**
1. ✅ Kollegen bleiben in Outlook (keine Kontext-Wechsel)
2. ✅ Automatische Archivierung (keine manuelle Arbeit)
3. ✅ Vollständige CRM-Integration (Kontakte, Deals, Historie)
4. ✅ E-Mail-Vorlagen mit Platzhaltern (Zeitersparnis)
5. ✅ Keine zusätzlichen Kosten (nur Entwicklung)
6. ✅ Zentrale Installation via Admin (kein User-Aufwand)

**Kombination mit IMAP-Sync:**
- Add-In für **aktive Arbeit** (E-Mails schreiben, Vorlagen, Deals)
- IMAP-Sync für **Backup** (alle E-Mails archivieren, auch ohne Add-In)

**Nächste Schritte:**
1. Grünes Licht für Entwicklung?
2. Welche Features sind Priorität? (Phase 1 zuerst?)
3. Wann soll Pilot-Test starten? (mit 2-3 Kollegen)

**Ich kann sofort starten!**

