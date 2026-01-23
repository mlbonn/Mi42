import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function addColumnIfNotExists(connection, table, column, definition) {
  try {
    // Check if column exists
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    
    if (rows[0].count === 0) {
      await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`✅ Added ${column} to ${table}`);
      return true;
    } else {
      console.log(`⏭️  ${column} already exists in ${table}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding ${column} to ${table}:`, error.message);
    throw error;
  }
}

async function runMigration() {
  console.log("Connecting to database...");
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("Running audit trail migration...\\n");

  try {
    // Add audit columns to contacts
    await addColumnIfNotExists(connection, "contacts", "createdBy", "VARCHAR(64)");
    await addColumnIfNotExists(connection, "contacts", "updatedBy", "VARCHAR(64)");

    // Add audit columns to companies
    await addColumnIfNotExists(connection, "companies", "createdBy", "VARCHAR(64)");
    await addColumnIfNotExists(connection, "companies", "updatedBy", "VARCHAR(64)");

    // Add audit columns to corporations
    await addColumnIfNotExists(connection, "corporations", "createdBy", "VARCHAR(64)");
    await addColumnIfNotExists(connection, "corporations", "updatedBy", "VARCHAR(64)");

    // Add audit columns to activities
    await addColumnIfNotExists(connection, "activities", "createdBy", "VARCHAR(64)");
    await addColumnIfNotExists(connection, "activities", "updatedBy", "VARCHAR(64)");

    // Add audit columns to deals
    await addColumnIfNotExists(connection, "deals", "createdBy", "VARCHAR(64)");
    await addColumnIfNotExists(connection, "deals", "updatedBy", "VARCHAR(64)");

    console.log("\\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("\\n❌ Migration failed:", error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
