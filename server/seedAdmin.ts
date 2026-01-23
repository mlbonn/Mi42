import "dotenv/config";
import crypto from "crypto";
import * as db from "./db";

function hashPassword(password: string): string {
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  const { encryptPassword } = require('./encryption');
  const encryptedPassword = encryptPassword(password);
  return `${hash}|${encryptedPassword}`;
}

async function seedAdmin() {
  console.log("[Seed] Creating admin user...");

  const adminId = "admin-" + crypto.randomUUID();
  const email = "admin@friday-crm.com";
  const password = "admin";
  const passwordHash = hashPassword(password);

  try {
    await db.createUserWithPassword({
      id: adminId,
      email,
      name: "Admin User",
      passwordHash,
      role: "admin",
      lastSignedIn: new Date(),
    });

    console.log("[Seed] Admin user created successfully!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error("[Seed] Failed to create admin user:", error);
  }

  process.exit(0);
}

seedAdmin();

