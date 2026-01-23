import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  // Find all users
  console.log("=== All Users ===");
  const usersResult = await db.execute(sql`SELECT id, name, email, username FROM users`);
  console.log(usersResult[0]);
  
  // Count corporations
  console.log("\\n=== Corporations by User ===");
  const corpsResult = await db.execute(sql`SELECT COUNT(*) as count, assignedTo FROM corporations GROUP BY assignedTo`);
  console.log(corpsResult[0]);
  
  // Count contacts
  console.log("\\n=== Contacts by User ===");
  const contactsResult = await db.execute(sql`SELECT COUNT(*) as count, assignedTo FROM contacts GROUP BY assignedTo`);
  console.log(contactsResult[0]);
  
  // Migrate data to admin-001
  console.log("\\n=== Migrating data to admin-001 ===");
  
  const updateCorps = await db.execute(sql`UPDATE corporations SET assignedTo = "admin-001" WHERE assignedTo != "admin-001" OR assignedTo IS NULL`);
  console.log(`Updated ${updateCorps[0].affectedRows || 0} corporations`);
  
  const updateContacts = await db.execute(sql`UPDATE contacts SET assignedTo = "admin-001" WHERE assignedTo != "admin-001" OR assignedTo IS NULL`);
  console.log(`Updated ${updateContacts[0].affectedRows || 0} contacts`);
  
  await connection.end();
  console.log("\\n=== Migration complete! ===");
}

main().catch(console.error);
