/**
 * server/scripts/migratePasswordHash.ts
 *
 * Einmalige Migration: Trennt passwordHash (bcrypt|encrypted) in
 * passwordHash (nur bcrypt) und caldavPassword (nur encrypted).
 *
 * Ausführen: npx ts-node server/scripts/migratePasswordHash.ts
 * oder: node -e "require('./dist/scripts/migratePasswordHash.js')"
 */
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("[Migration] migratePasswordHash: Start");
  const db = await getDb();
  if (!db) {
    console.error("[Migration] Database not available");
    process.exit(1);
  }

  // Alle User mit kombiniertem passwordHash holen
  const result = await db.execute(
    sql`SELECT id, email, passwordHash, caldavPassword FROM users WHERE passwordHash LIKE '%|%'`
  );
  const users = result[0] as any[];
  console.log(`[Migration] Found ${users.length} user(s) with combined passwordHash`);

  let migrated = 0;
  let skipped = 0;

  for (const user of users) {
    const parts = (user.passwordHash as string).split("|");
    if (parts.length < 2) {
      skipped++;
      continue;
    }
    const bcryptHash = parts[0];
    const encryptedCalDAV = parts[1];

    // Nur migrieren wenn caldavPassword noch nicht gesetzt
    if (user.caldavPassword) {
      console.log(`  [Skip] ${user.email} – caldavPassword already set`);
      // Trotzdem passwordHash bereinigen
      await db.execute(
        sql`UPDATE users SET passwordHash = ${bcryptHash} WHERE id = ${user.id}`
      );
      migrated++;
      continue;
    }

    await db.execute(
      sql`UPDATE users SET passwordHash = ${bcryptHash}, caldavPassword = ${encryptedCalDAV} WHERE id = ${user.id}`
    );
    console.log(`  [OK] ${user.email} – migrated`);
    migrated++;
  }

  console.log(`[Migration] Done: ${migrated} migrated, ${skipped} skipped`);
  process.exit(0);
}

migrate().catch(err => {
  console.error("[Migration] Error:", err);
  process.exit(1);
});
