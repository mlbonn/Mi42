# Scout Worker - Status Update

**Datum:** 25. Oktober 2025, 04:40 Uhr

---

## ✅ Implementiert

### Background Worker Daemon
- **Datei:** `server/scoutWorkerDaemon.ts` (118 Zeilen)
- **Features:**
  - Polling-basiert (30s Interval)
  - Automatische Queue-Verarbeitung
  - Graceful Shutdown (SIGINT/SIGTERM)
  - Worker-Statistiken (processCount, errorCount, uptime)
  - Konfigurierbar (POLLING_INTERVAL_MS, MAX_CONCURRENT_JOBS)

### Build-System
- **package.json** erweitert:
  - `pnpm build:server` baut jetzt auch scoutWorkerDaemon.js
  - `pnpm worker` startet den Daemon
- **Build-Output:**
  - dist/scoutWorkerDaemon.js (28.6kb)
  - dist/scoutWorker.js (26.4kb)
  - dist/_core/index.js (121.7kb)

### Deployment
- **Script:** `deploy-worker-hetzner.sh`
- **Hetzner Server:** Worker deployed auf 46.224.13.250
- **PID:** 86165 (läuft)
- **Logs:** ~/friday-crm-dev/worker.log

### Datenbank
- **scout_queue Tabelle:** ✅ Erstellt
- **scout_discovery_methods Tabelle:** ✅ Erstellt
- **Test-Seed:** ✅ Eingefügt (Microsoft)

---

## ❌ Problem

### Drizzle ORM Query schlägt fehl

**Fehler:**
```
Failed query: select `id`, `corporationId`, `seedType`, `seedData`, `priority`, `status`, `generation`, `parentId`, `discoveryMethod`, `scheduledAt`, `startedAt`, `completedAt`, `errorMessage`, `metadata` from `scout_queue` where `scout_queue`.`status` = ? order by `scout_queue`.`priority`, `scout_queue`.`generation`, `scout_queue`.`scheduledAt` limit ?
params: Pending,1
```

**Symptome:**
- Worker läuft kontinuierlich (PID 86165)
- Polling funktioniert (alle 30s)
- Datenbank-Verbindung OK (46.224.13.250:3306/friday_crm)
- OpenAI API konfiguriert
- Query schlägt fehl mit "Failed query"

**Mögliche Ursachen:**
1. **Spalten-Mapping:** Drizzle verwendet camelCase (corporationId), Tabelle hat möglicherweise andere Namen
2. **Fehlende Indizes:** Schema definiert Indizes (queue_status_idx, etc.), aber nicht erstellt
3. **Drizzle-Konfiguration:** Möglicherweise stimmt die Drizzle-Konfiguration nicht mit der Tabelle überein
4. **MySQL-Version:** Kompatibilitätsprobleme zwischen Drizzle und MySQL-Version

**Diagnose-Ergebnisse:**
- `SHOW TABLES LIKE 'scout%'` → 2 Tabellen gefunden ✅
- `DESCRIBE scout_queue` → 14 Spalten gefunden ✅
- `SELECT * FROM scout_queue LIMIT 1` → 1 Zeile gefunden ✅
- Drizzle Query → FAIL ❌

---

## 🔍 Nächste Schritte

### Option A: Drizzle Migration ausführen
```bash
cd /home/ubuntu/friday-crm
pnpm db:push
```
**Vorteil:** Erstellt Tabellen mit korrekten Indizes und Drizzle-Mapping  
**Nachteil:** Könnte bestehende Daten überschreiben

### Option B: Tabellen manuell anpassen
```sql
-- Indizes hinzufügen
CREATE INDEX queue_status_idx ON scout_queue(status);
CREATE INDEX queue_priority_idx ON scout_queue(priority);
CREATE INDEX queue_generation_idx ON scout_queue(generation);
CREATE INDEX queue_parent_idx ON scout_queue(parentId);
```

### Option C: Drizzle Debug Mode aktivieren
```typescript
// In server/db.ts
const db = drizzle(process.env.DATABASE_URL, {
  logger: true // Zeigt SQL-Queries
});
```

### Option D: Worker auf Sandbox testen
- Sandbox hat direkten Zugriff auf Datenbank
- Einfacheres Debugging
- Logs sofort sichtbar

---

## 💡 Empfehlung

**Kurzfristig:** Option D (Sandbox-Test) für schnelles Debugging

**Mittelfristig:** Option A (Drizzle Migration) für saubere Lösung

**Langfristig:** 
- PM2 für automatischen Worker-Restart
- Monitoring/Alerting für Worker-Fehler
- Separate Logging-Infrastruktur

---

## 📊 Worker-Konfiguration

```bash
# Environment Variables
DATABASE_URL='mysql://manus02:mIlrq2NQiGP88yLo@46.224.13.250:3306/friday_crm'
OPENAI_API_KEY='sk-proj-...'

# Worker Settings
POLLING_INTERVAL_MS=30000  # 30 Sekunden
MAX_CONCURRENT_JOBS=1      # 1 Job gleichzeitig

# Commands
./start-worker.sh   # Worker starten
./stop-worker.sh    # Worker stoppen
tail -f worker.log  # Logs anzeigen
```

---

## 🎯 Erwartetes Verhalten (nach Fix)

```
[Scout Worker] Checking queue... (processed: 0, errors: 0)
[Scout Worker] Processing manual seed: Microsoft (https://www.microsoft.com)
[Scout Worker] ✅ Job test-001 completed successfully
[Scout Worker] Checking queue... (processed: 1, errors: 0)
[Scout Worker] No pending jobs in queue
```


