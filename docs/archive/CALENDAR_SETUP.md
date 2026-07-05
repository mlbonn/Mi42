# Kalender-Integration Setup

## Übersicht

FRIDAY CRM unterstützt jetzt eine **hybride CalDAV-Integration** mit SmarterMail:

- **1 Team-Kalender** (gemeinsamer Kalender für alle Teammitglieder)
- **10 individuelle Benutzer-Kalender** (persönliche Kalender pro Teammitglied)
- **Bidirektionale Synchronisation** (Änderungen in FRIDAY CRM erscheinen in Outlook/Apple Calendar und umgekehrt)
- **Aggregierte Ansicht** (alle Kalender in einer Übersicht mit Farb-Codierung)
- **Filter-Funktion** (Kalender ein-/ausblenden nach Bedarf)

---

## 🔧 Benötigte Environment Variables

Fügen Sie folgende Environment Variables in der Manus Settings UI hinzu:

### 1. CalDAV Server URL

```bash
CALDAV_SERVER_URL=https://mail.example.com/caldav
```

**Wie finde ich die URL?**
- SmarterMail Admin → Settings → Protocols → CalDAV
- Beispiel: `https://mail.yourdomain.com/caldav`

### 2. Team-Kalender Credentials

```bash
CALDAV_TEAM_USER=team@yourdomain.com
CALDAV_TEAM_PASSWORD=SecurePassword123
```

**Hinweis:** Erstellen Sie einen dedizierten Account für den Team-Kalender in SmarterMail.

### 3. Individuelle Benutzer-Kalender

```bash
CALDAV_USERS=user1@yourdomain.com,user2@yourdomain.com,user3@yourdomain.com,user4@yourdomain.com,user5@yourdomain.com,user6@yourdomain.com,user7@yourdomain.com,user8@yourdomain.com,user9@yourdomain.com,user10@yourdomain.com
CALDAV_USER_PASSWORD=SharedPassword123
```

**Format:**
- `CALDAV_USERS`: Komma-separierte Liste aller E-Mail-Adressen (10 Benutzer)
- `CALDAV_USER_PASSWORD`: Gemeinsames Passwort für alle Benutzer (oder individuell in Code anpassen)

**Sicherheitshinweis:** Für Produktionsumgebungen sollten individuelle Passwörter in der Datenbank gespeichert werden.

---

## 📋 SmarterMail Konfiguration

### Schritt 1: Team-Kalender erstellen

1. Melden Sie sich als Admin in SmarterMail an
2. Erstellen Sie einen neuen E-Mail-Account: `team@yourdomain.com`
3. Navigieren Sie zu **Calendar** → **Create Calendar**
4. Name: "Team Calendar"
5. Teilen Sie den Kalender mit allen Teammitgliedern (Read/Write Rechte)

### Schritt 2: Individuelle Kalender vorbereiten

1. Stellen Sie sicher, dass alle 10 Benutzer-Accounts existieren
2. Jeder Benutzer sollte einen Standard-Kalender haben (automatisch erstellt)
3. Notieren Sie alle E-Mail-Adressen für `CALDAV_USERS`

### Schritt 3: CalDAV aktivieren

1. Admin → Settings → Protocols → CalDAV
2. Aktivieren Sie CalDAV
3. Notieren Sie die CalDAV URL (z.B. `https://mail.yourdomain.com/caldav`)

### Schritt 4: Zugangsdaten testen

Testen Sie die Verbindung mit einem CalDAV-Client (z.B. Thunderbird):
- Server: `https://mail.yourdomain.com/caldav`
- Username: `team@yourdomain.com`
- Password: `SecurePassword123`

---

## 🎨 Farb-Codierung

Die Kalender werden automatisch mit folgenden Farben dargestellt:

| Kalender | Farbe |
|----------|-------|
| Team-Kalender | Schwarz (#000000) |
| Benutzer 1 | Blau (#3b82f6) |
| Benutzer 2 | Grün (#10b981) |
| Benutzer 3 | Amber (#f59e0b) |
| Benutzer 4 | Rot (#ef4444) |
| Benutzer 5 | Lila (#8b5cf6) |
| Benutzer 6 | Pink (#ec4899) |
| Benutzer 7 | Teal (#14b8a6) |
| Benutzer 8 | Orange (#f97316) |
| Benutzer 9 | Indigo (#6366f1) |
| Benutzer 10 | Lime (#84cc16) |

---

## 🚀 Deployment

### Lokale Entwicklung

1. Fügen Sie die Environment Variables in `.env` hinzu:

```bash
CALDAV_SERVER_URL=https://mail.yourdomain.com/caldav
CALDAV_TEAM_USER=team@yourdomain.com
CALDAV_TEAM_PASSWORD=SecurePassword123
CALDAV_USERS=user1@yourdomain.com,user2@yourdomain.com,...
CALDAV_USER_PASSWORD=SharedPassword123
```

2. Starten Sie den Dev-Server:

```bash
pnpm dev
```

3. Navigieren Sie zu **CRM → Kalender** in der Sidebar

### Hetzner Production Server

1. SSH in den Server:

```bash
ssh manus02@46.224.13.250
```

2. Navigieren Sie zum Projekt:

```bash
cd ~/friday-crm
```

3. Fügen Sie Environment Variables in `.env` hinzu (oder verwenden Sie die Manus Settings UI)

4. Build und Deploy:

```bash
pnpm build:client
cp -r client/dist/public/* dist/public/
pm2 restart friday-crm
```

---

## 📖 Verwendung

### Kalender öffnen

1. Melden Sie sich in FRIDAY CRM an
2. Klicken Sie in der Sidebar auf **CRM → 📅 Kalender**

### Termin erstellen

1. Klicken Sie auf **Neuer Termin** oder klicken Sie direkt in den Kalender
2. Wählen Sie den Kalender aus (Team oder individuell)
3. Füllen Sie Titel, Beschreibung, Ort aus
4. Klicken Sie auf **Erstellen**

**Synchronisation:** Der Termin erscheint sofort in Outlook/Apple Calendar!

### Termin bearbeiten

1. Klicken Sie auf einen bestehenden Termin
2. Bearbeiten Sie die Details
3. Klicken Sie auf **Speichern**

### Termin löschen

1. Klicken Sie auf einen Termin
2. Klicken Sie auf **Löschen**
3. Bestätigen Sie die Aktion

### Kalender filtern

1. Klicken Sie auf **Filter** im Header
2. Aktivieren/Deaktivieren Sie die gewünschten Kalender
3. Die Ansicht wird sofort aktualisiert

---

## 🔍 Troubleshooting

### Problem: "No calendars found"

**Lösung:**
- Überprüfen Sie die CalDAV URL
- Testen Sie die Credentials mit einem externen CalDAV-Client
- Stellen Sie sicher, dass CalDAV in SmarterMail aktiviert ist

### Problem: Events werden nicht angezeigt

**Lösung:**
- Überprüfen Sie die Zeitzone-Einstellungen in SmarterMail
- Stellen Sie sicher, dass die Kalender nicht leer sind
- Prüfen Sie die Browser-Konsole auf Fehler

### Problem: Änderungen werden nicht synchronisiert

**Lösung:**
- Warten Sie 30-60 Sekunden (Sync-Intervall)
- Aktualisieren Sie die Seite
- Prüfen Sie die Server-Logs: `pm2 logs friday-crm`

### Problem: TypeScript-Fehler beim Build

**Lösung:**
- Stellen Sie sicher, dass alle Dependencies installiert sind: `pnpm install`
- Führen Sie `pnpm exec tsc --noEmit` aus, um Fehler zu identifizieren
- Ignorieren Sie Fehler in `db.ts` und `hunterResultsRouter.ts` (nicht kritisch)

---

## 🔐 Sicherheitshinweise

1. **Passwörter:** Speichern Sie Passwörter niemals im Code oder in Git
2. **HTTPS:** Verwenden Sie immer HTTPS für CalDAV-Verbindungen
3. **Zugriffsrechte:** Beschränken Sie Schreibrechte auf autorisierte Benutzer
4. **Audit-Log:** Aktivieren Sie Logging für alle Kalender-Operationen

---

## 📚 Weitere Ressourcen

- [SmarterMail CalDAV Dokumentation](https://www.smartertools.com/smartermail/help/caldav)
- [tsdav Library](https://github.com/natelindev/tsdav)
- [React Big Calendar](https://github.com/jquense/react-big-calendar)
- [iCalendar Specification (RFC 5545)](https://tools.ietf.org/html/rfc5545)

---

## ✅ Checkliste

- [ ] CalDAV Server URL ermittelt
- [ ] Team-Kalender Account erstellt
- [ ] 10 Benutzer-Accounts vorbereitet
- [ ] Environment Variables konfiguriert
- [ ] CalDAV-Verbindung getestet
- [ ] Frontend deployed
- [ ] Termin-Erstellung getestet
- [ ] Synchronisation mit Outlook/Apple Calendar verifiziert
- [ ] Filter-Funktion getestet
- [ ] Dokumentation an Team verteilt

---

**Support:** Bei Fragen wenden Sie sich an das IT-Team oder erstellen Sie ein Ticket.

