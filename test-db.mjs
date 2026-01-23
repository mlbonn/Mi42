import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

console.log("DATABASE_URL:", DATABASE_URL ? "Set (hidden)" : "NOT SET");

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set!");
  process.exit(1);
}

try {
  const db = drizzle(DATABASE_URL);
  
  console.log("\n1. Testing SHOW COLUMNS...");
  const columns = await db.execute(sql`SHOW COLUMNS FROM users`);
  console.log("Columns result:", columns);
  
  console.log("\n2. Testing SELECT with username...");
  try {
    const result = await db.execute(
      sql`SELECT id, username, password, name, email, role FROM users WHERE username = "admin" LIMIT 1`
    );
    console.log("Query successful! Result:", result);
  } catch (error) {
    console.error("Query failed:", error.message);
  }
  
  console.log("\n3. Testing SELECT without username...");
  const result2 = await db.execute(
    sql`SELECT id, name, email FROM users LIMIT 1`
  );
  console.log("Result:", result2);
  
  process.exit(0);
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
