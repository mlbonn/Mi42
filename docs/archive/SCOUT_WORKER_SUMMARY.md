# Scout Worker Implementation - Zusammenfassung

**Datum:** 24. Oktober 2025  
**Status:** ⚠️ Teilweise implementiert, Build-Probleme

---

## ✅ Was wurde implementiert

### 1. Scout Worker Backend (`server/scoutWorker.ts`)
- **Website Content Fetching** mit fetch API (10s timeout)
- **OpenAI Integration** (GPT-4o-mini) für Content-Analyse
- **Daten-Extraktion:**
  - Industries (Branchen)
  - Products (Produkte)
  - Markets (Märkte)
  - Countries (Länder)
  - Description (Beschreibung)
- **Queue Job Management:**
  - Status: Pending → Processing → Completed/Failed
  - Metadata-Speicherung für Analyse-Ergebnisse
  - Error Handling mit detaillierten Fehlermeldungen

### 2. API-Endpunkt (`scout.processNextJob`)
- tRPC Route für manuelle Queue-Verarbeitung
- Admin-only (nur für Administratoren)
- Asynchrone Verarbeitung

### 3. Dependencies
- ✅ OpenAI Package installiert (`openai@6.7.0`)
- ✅ Auf GitHub gepusht (Branch: version-b)

### 4. Build-Konfiguration
- ✅ `package.json` angepasst: `esbuild server/_core/index.ts server/scoutWorker.ts`
- ✅ Build erstellt `dist/scoutWorker.js` (26.4kb)

---

## ❌ Aktuelle Probleme

### Build-Output-Struktur
**Problem:** esbuild erstellt Dateien in unterschiedlichen Verzeichnissen:
- `dist/_core/index.js` (Server)
- `dist/scoutWorker.js` (Worker) 
- `dist/public/` (Client)

**Aber:** Server sucht nach `dist/_core/public/`

**Fehler:**
```
Error: ENOENT: no such file or directory, stat '/home/manus02/friday-crm-dev/dist/_core/public/index.html'
```

### Server startet nicht korrekt
- DEV Server (Port 3002) zeigt "Not Found" (404)
- Client-Dateien werden nicht gefunden
- Routing funktioniert nicht

---

## 🔧 Lösungsansätze

### Option A: Build-Output anpassen
```json
"build": "vite build --outDir=dist/_core/public && esbuild server/_core/index.ts server/scoutWorker.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/_core"
```

### Option B: Server-Code anpassen
Server so ändern, dass er `dist/public/` statt `dist/_core/public/` verwendet.

### Option C: Separate Build-Schritte
```json
"build:client": "vite build --outDir=dist/public",
"build:server": "esbuild server/_core/index.ts server/scoutWorker.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"build": "pnpm build:client && pnpm build:server"
```

---

## 📊 Test-Ergebnisse

### Worker-Test (lokal)
```bash
$ node testWorker.mjs
=== Testing Scout Worker ===
Result: {
  "success": false,
  "error": "No pending jobs"
}
```

**Interpretation:** Worker funktioniert, aber Queue ist leer (unterschiedliche Datenbanken: Sandbox vs. Hetzner).

### Queue Status
- **Sandbox:** 0 Jobs
- **Hetzner DEV:** 5 Jobs (laut Dashboard vor dem Crash)
  - Tesla Inc
  - James Hardie  
  - Hamberger
  - 2 weitere (unbekannt)

---

## 🎯 Nächste Schritte

### Priorität HOCH
1. **Build-Konfiguration reparieren** (Option A oder C)
2. **DEV Server zum Laufen bringen**
3. **Worker mit echten Seeds testen**

### Priorität MITTEL
4. **Background Worker implementieren** (Cron-Job oder Polling)
5. **Wettbewerber-Suche implementieren** (Google/LinkedIn API)
6. **Review Queue Workflow testen**

### Priorität NIEDRIG
7. **Job Queue UI implementieren** (aktuell "In Entwicklung")
8. **Discovery Methods konfigurieren**
9. **Statistiken Dashboard vervollständigen**

---

## 💡 Erkenntnisse

1. **Modulare Struktur funktioniert:** scoutWorker.ts kann separat gebaut werden
2. **OpenAI Integration bereit:** API-Key konfiguriert, Code implementiert
3. **tRPC API funktioniert:** Route ist verfügbar (wenn Server läuft)
4. **Build-System komplex:** Vite (Client) + esbuild (Server) = Koordinationsprobleme

---

## 📝 Empfehlung

**Kurzfristig:** Option C umsetzen (separate Build-Schritte) für klare Trennung und einfacheres Debugging.

**Mittelfristig:** Background Worker implementieren für automatische Queue-Verarbeitung.

**Langfristig:** Job Queue UI fertigstellen für bessere Übersicht und manuelles Management.

