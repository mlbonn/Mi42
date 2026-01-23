import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);
  
  console.log("=== Corporations Table Structure ===");
  const corpsStructure = await db.execute(sql`SHOW COLUMNS FROM corporations`);
  console.log(corpsStructure[0]);
  
  console.log("\\n=== Contacts Table Structure ===");
  const contactsStructure = await db.execute(sql`SHOW COLUMNS FROM contacts`);
  console.log(contactsStructure[0]);
  
  console.log("\\n=== Sample Corporation ===");
  const sampleCorp = await db.execute(sql`SELECT * FROM corporations LIMIT 1`);
  console.log(sampleCorp[0]);
  
  console.log("\\n=== Sample Contact ===");
  const sampleContact = await db.execute(sql`SELECT * FROM contacts LIMIT 1`);
  console.log(sampleContact[0]);
  
  await connection.end();
}

main().catch(console.error);
