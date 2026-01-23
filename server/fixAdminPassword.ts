import "dotenv/config";
import crypto from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { encryptPassword } from "./encryption";

function hashPassword(password: string): string {
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const encrypted = encryptPassword(password);
  return `${hash}|${encrypted}`;
}

async function fixAdminPassword() {
  console.log("[Fix] Updating admin user password...");
  
  const db = drizzle(process.env.DATABASE_URL || "");
  
  const password = "admin";
  const passwordHash = hashPassword(password);
  
  try {
    await db.update(users)
      .set({ passwordHash })
      .where(eq(users.email, "testuser1@friday-crm.de"));
    
    console.log("[Fix] Admin user password updated successfully!");
    console.log(`Email: testuser1@friday-crm.de`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("[Fix] Failed to update admin user:", error);
  }
  
  process.exit(0);
}

fixAdminPassword();
