/**
 * devReset.ts - Development utility to reset admin password
 * Usage: npx ts-node server/devReset.ts <new-password>
 * NEVER run in production.
 */
import bcrypt from "bcryptjs";
import { getDb } from "./db";

async function resetAdminPassword(newPassword: string) {
  if (process.env.NODE_ENV === "production") {
    console.error("ERROR: devReset.ts must not run in production!");
    process.exit(1);
  }
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  const hash = await bcrypt.hash(newPassword, 12);
  const { users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const result = await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.role, "admin"));
  console.log("Admin password reset. Rows affected:", (result as any).rowsAffected ?? "unknown");
  process.exit(0);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npx ts-node server/devReset.ts <new-password>");
  process.exit(1);
}
resetAdminPassword(arg).catch(console.error);
