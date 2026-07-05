# FRIDAY CRM

Ein internes CRM-System für Vertrieb, Scouting und Outreach.

## Stack

- **Frontend:** React + TypeScript + TailwindCSS + shadcn/ui
- **Backend:** Node.js + tRPC + Drizzle ORM
- **Datenbank:** MySQL (TiDB-kompatibel)
- **Auth:** JWT + serverseitige Sessions (bcrypt, AES-256-GCM)
- **Deployment:** Hetzner Server 46.224.13.250, PM2

## Setup

```bash
cp .env.example .env
# .env befüllen (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, CREDENTIAL_ENCRYPTION_KEY)
pnpm install
pnpm db:push
pnpm dev
```

## Build & Deploy

```bash
pnpm build
pm2 restart friday-crm
```

## Struktur

```
client/          React Frontend
server/          tRPC Backend
  _core/         Express-App, Router-Registry, Auth-Middleware
  services/      SmarterMail, CalDAV, E-Mail
  credentialService.ts  AES-256-GCM Verschlüsselung (einzige Quelle)
  devReset.ts    Dev-Reset (NODE_ENV!=production + ALLOW_DEV_RESET=true)
drizzle/         Schema + Migrations
scripts/         Dauerhafte Hilfsskripte
docs/            Dokumentation
  archive/       Veraltete Reports und Konzepte
```

## Dokumentation

- [DEPLOYMENT.md](DEPLOYMENT.md) – Hetzner-Deployment-Prozess
- [HETZNER_DEPLOYMENT.md](HETZNER_DEPLOYMENT.md) – Server-Konfiguration
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) – Datenbankschema
- [USER_ROLES.md](USER_ROLES.md) – Rollen und Berechtigungen
- [CRM_CORE_FEATURES.md](CRM_CORE_FEATURES.md) – Feature-Übersicht

## Sicherheitshinweise

- Keine Backup-Kopien im Arbeitsverzeichnis anlegen (`.gitignore` schützt `*.bak`, `*.backup`, `backup_*`)
- Vor riskanten Änderungen committen, nicht kopieren
- `devReset.ts` nur in Entwicklungsumgebungen mit `ALLOW_DEV_RESET=true`
- Alle Credentials in `.env` (nie committen)
