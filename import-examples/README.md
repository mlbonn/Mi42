# FRIDAY CRM: Import aus Genesis World CRM

## CSV-Format

Erstellen Sie folgende CSV-Dateien aus Ihrem Genesis World CRM:

### 1. corporations.csv

```csv
name,headquarters_country,total_revenue_eur,industry,website,linkedin_url,status,priority,notes
Saint-Gobain Group,FR,51000000000,Building Materials,https://www.saint-gobain.com,https://www.linkedin.com/company/saint-gobain,Customer,High,Weltmarktführer
Knauf Group,DE,15000000000,Building Materials,https://www.knauf.com,https://www.linkedin.com/company/knauf,Contacted,High,Demo geplant
```

**Spalten:**
- `name` (required): Konzernname
- `headquarters_country` (required): ISO 3166-1 alpha-2 Code (z.B. DE, FR, US)
- `total_revenue_eur` (optional): Umsatz in EUR (ohne Kommas)
- `industry` (optional): Branche
- `website` (optional): Website-URL
- `linkedin_url` (optional): LinkedIn-URL
- `status` (optional): Target, Contacted, Demo, Negotiation, Customer
- `priority` (optional): Low, Medium, High
- `notes` (optional): Notizen

---

### 2. companies.csv

```csv
corporation_name,name,legal_form,country,city,revenue_eur,products,website
Saint-Gobain Group,Saint-Gobain Rigips GmbH,GmbH,DE,Düsseldorf,1200000000,"[""Drywall"",""Insulation""]",https://www.rigips.de
Saint-Gobain Group,Saint-Gobain Weber GmbH,GmbH,DE,Düsseldorf,800000000,"[""Mortar"",""Facades""]",https://www.de.weber
```

**Spalten:**
- `corporation_name` (required): Konzernname (muss in corporations.csv existieren)
- `name` (required): Firmenname
- `legal_form` (optional): GmbH, AG, SA, Ltd, Inc, etc.
- `country` (optional): ISO 3166-1 alpha-2 Code
- `city` (optional): Stadt
- `revenue_eur` (optional): Umsatz in EUR
- `products` (optional): JSON Array als String
- `website` (optional): Website-URL

---

### 3. contacts.csv

```csv
first_name,last_name,job_title,phone,linkedin_url,decision_maker,contact_status,notes
Dr. Thomas,Müller,Head of Market Research,+49 211 5503 100,https://www.linkedin.com/in/thomas-mueller,true,Hot,Hauptansprechpartner
Anna,Schmidt,Strategic Planning Manager,+49 211 5503 200,https://www.linkedin.com/in/anna-schmidt,false,Warm,Nutzt GBM
```

**Spalten:**
- `first_name` (required): Vorname
- `last_name` (required): Nachname
- `job_title` (optional): Jobtitel
- `phone` (optional): Telefonnummer
- `linkedin_url` (optional): LinkedIn-URL
- `decision_maker` (optional): true/false
- `contact_status` (optional): Cold, Warm, Hot
- `notes` (optional): Notizen

---

### 4. contact_company_relations.csv

```csv
contact_first_name,contact_last_name,company_name,email,position,is_primary
Dr. Thomas,Müller,Saint-Gobain Rigips GmbH,thomas.mueller@rigips.de,Head of Market Research,true
Dr. Thomas,Müller,Saint-Gobain Weber GmbH,thomas.mueller@weber.de,Board Member,false
Anna,Schmidt,Saint-Gobain Rigips GmbH,anna.schmidt@rigips.de,Strategic Planning Manager,true
```

**Spalten:**
- `contact_first_name` (required): Vorname (muss in contacts.csv existieren)
- `contact_last_name` (required): Nachname (muss in contacts.csv existieren)
- `company_name` (required): Firmenname (muss in companies.csv existieren)
- `email` (required): E-Mail-Adresse
- `position` (optional): Position in dieser Firma
- `is_primary` (optional): true/false (Haupt-E-Mail)

---

### 5. activities.csv (optional)

```csv
corporation_name,company_name,contact_first_name,contact_last_name,activity_type,activity_date,subject,content,direction,outcome,created_by
Saint-Gobain Group,Saint-Gobain Rigips GmbH,Dr. Thomas,Müller,Email,2025-01-15,Follow-Up: GBM Renewal,Hallo Dr. Müller...,Outbound,Positive,Sales Team
Saint-Gobain Group,Saint-Gobain Rigips GmbH,Dr. Thomas,Müller,Call,2025-01-20,Renewal bestätigt,Telefonat...,Inbound,Positive,Sales Team
```

**Spalten:**
- `corporation_name` (optional): Konzernname
- `company_name` (optional): Firmenname
- `contact_first_name` (optional): Vorname
- `contact_last_name` (optional): Nachname
- `activity_type` (required): Email, Call, Meeting, Demo, Other
- `activity_date` (required): ISO 8601 (z.B. 2025-01-15)
- `subject` (required): Betreff
- `content` (optional): Inhalt
- `direction` (optional): Inbound, Outbound
- `outcome` (optional): Positive, Negative, Neutral
- `created_by` (optional): Ersteller

---

## Import ausführen

### 1. CSV-Dateien vorbereiten

Exportieren Sie Ihre Daten aus Genesis World CRM in die oben genannten CSV-Formate.

### 2. Dateien hochladen

Legen Sie alle CSV-Dateien in einen Ordner, z.B. `/home/ubuntu/genesis-export/`

### 3. Import starten

```bash
cd /home/ubuntu/friday-crm
pnpm tsx server/import.ts /home/ubuntu/genesis-export/
```

### 4. Ausgabe prüfen

```
🚀 Starting import from Genesis World CRM...

📊 Importing corporations from /home/ubuntu/genesis-export/corporations.csv...
✅ Imported 50 corporations

🏢 Importing companies from /home/ubuntu/genesis-export/companies.csv...
✅ Imported 120 companies

👤 Importing contacts from /home/ubuntu/genesis-export/contacts.csv...
✅ Imported 300 contacts

🔗 Importing contact-company relations from /home/ubuntu/genesis-export/contact_company_relations.csv...
✅ Imported 450 contact-company relations

📧 Importing activities from /home/ubuntu/genesis-export/activities.csv...
✅ Imported 1200 activities

✅ Import completed successfully!
```

---

## Fehlerbehandlung

### Warnung: Corporation not found

```
⚠️  Corporation not found: XYZ Corp
```

**Lösung:** Stellen Sie sicher, dass der `corporation_name` in `companies.csv` exakt dem `name` in `corporations.csv` entspricht.

### Warnung: Contact not found

```
⚠️  Contact not found: John Doe
```

**Lösung:** Stellen Sie sicher, dass `contact_first_name` und `contact_last_name` in `contact_company_relations.csv` exakt den Werten in `contacts.csv` entsprechen.

### Warnung: Company not found

```
⚠️  Company not found: ABC GmbH
```

**Lösung:** Stellen Sie sicher, dass der `company_name` in `contact_company_relations.csv` exakt dem `name` in `companies.csv` entspricht.

---

## Tipps

### Excel → CSV Export

1. Excel öffnen
2. Datei → Speichern unter
3. Format: CSV UTF-8 (Comma delimited) (.csv)
4. **Wichtig:** Encoding muss UTF-8 sein

### Genesis World CRM Export

Falls Genesis World CRM keinen direkten CSV-Export bietet:

1. Daten in Excel exportieren
2. Spalten umbenennen (siehe oben)
3. Als CSV speichern

### Duplikate vermeiden

Führen Sie den Import nur einmal aus. Falls Sie erneut importieren müssen:

```bash
# Datenbank leeren (Vorsicht!)
pnpm drizzle-kit drop
pnpm db:push
```

---

## Nächste Schritte

Nach erfolgreichem Import:

1. FRIDAY CRM öffnen: https://crm.bl2020.com
2. Login mit Manus OAuth
3. Konzerne prüfen: Konzerne → Liste
4. Deals erstellen: Pipeline → Neuer Deal
5. Aktivitäten hinzufügen: Corporation Detail → Aktivitäten

---

## Support

Bei Problemen:
- Import-Skript: `/home/ubuntu/friday-crm/server/import.ts`
- Seed-Beispiel: `/home/ubuntu/friday-crm/server/seed.ts`
- Dokumentation: `/home/ubuntu/friday-crm/DEPLOYMENT.md`

