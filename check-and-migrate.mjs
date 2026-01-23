import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  
  // Find all users
  console.log("=== All Users ===");
  const usersResult = await db.execute(sql`SELECT id, name, email, username FROM users`);
  const users = usersResult[0];
  console.log(users);
  
  // Count corporations
  console.log("\\n=== Corporations ===");
  const corpsResult = await db.execute(sql`SELECT COUNT(*) as count, assignedTo FROM corporations GROUP BY assignedTo`);
  console.log(corpsResult[0]);
  
  // Count contacts
  console.log("\\n=== Contacts ===");
  const contactsResult = await db.execute(sql`SELECT COUNT(*) as count, assignedTo FROM contacts GROUP BY assignedTo`);
  console.log(contactsResult[0]);
  
  // Migrate data to admin-001
  console.log("\\n=== Migrating data to admin-001 ===");
  
  const updateCorps = await db.execute(sql`UPDATE corporations SET assignedTo = "admin-001" WHERE assignedTo != "admin-001"`);
  console.log(`Updated ${updateCorps[0].affectedRows || 0} corporations`);
  
  const updateContacts = await db.execute(sql`UPDATE contacts SET assignedTo = "admin-001" WHERE assignedTo != "admin-001"`);
  console.log(`Updated ${updateContacts[0].affectedRows || 0} contacts`);
  
  console.log("\\n=== Migration complete! ===");
}

main().catch(console.error);
