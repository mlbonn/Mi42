import { getDb } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function columnExists(db: any, tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = ${tableName} 
          AND COLUMN_NAME = ${columnName}`
    );
    const rows = result[0] as unknown as any[];
    return rows && rows.length > 0;
  } catch (error) {
    return false;
  }
}

export async function runMigrations() {
  console.log("[MIGRATION] Starting database migrations...");
  
  const db = await getDb();
  if (!db) {
    console.error("[MIGRATION] Database not available");
    return;
  }

  try {
    // Add username column if not exists
    console.log("[MIGRATION] Checking username column...");
    const hasUsername = await columnExists(db, "users", "username");
    if (!hasUsername) {
      console.log("[MIGRATION] Adding username column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN username VARCHAR(100)`);
      console.log("[MIGRATION] ✓ username column added");
    } else {
      console.log("[MIGRATION] ✓ username column already exists");
    }

    // Add password column if not exists
    console.log("[MIGRATION] Checking password column...");
    const hasPassword = await columnExists(db, "users", "password");
    if (!hasPassword) {
      console.log("[MIGRATION] Adding password column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN password VARCHAR(255)`);
      console.log("[MIGRATION] ✓ password column added");
    } else {
      console.log("[MIGRATION] ✓ password column already exists");
    }

    // Check if admin user exists
    console.log("[MIGRATION] Checking for admin user...");
    const result = await db.execute(sql`SELECT id FROM users WHERE id = "admin-001" LIMIT 1`);
    const users = result[0] as unknown as any[];

    if (!users || users.length === 0) {
      // Create admin user
      console.log("[MIGRATION] Creating admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 12);
      
      await db.execute(sql`
        INSERT INTO users (id, username, password, name, email, role) 
        VALUES ("admin-001", "admin", ${hashedPassword}, "Administrator", "admin@friday-crm.local", "admin")
      `);
      console.log("[MIGRATION] ✓ Admin user created (username: admin, password: admin123)");
    } else {
      console.log("[MIGRATION] Admin user already exists");
      
      // Update admin user with username and password
      console.log("[MIGRATION] Updating admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await db.execute(sql`
        UPDATE users 
        SET username = "admin", password = ${hashedPassword}
        WHERE id = "admin-001"
      `);
      console.log("[MIGRATION] ✓ Admin user updated");
    }

    console.log("[MIGRATION] All migrations completed successfully!");
  } catch (error: any) {
    console.error("[MIGRATION] Migration failed:", error.message);
    throw error;
  }
}
