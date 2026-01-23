import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

async function hashPasswords() {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "bluser",
    password: "1Ev3eZcJ8bO0o69O",
    database: "friday_crm"
  });
  
  // Hash admin123
  const adminHash = await bcrypt.hash("admin123", 10);
  console.log("admin123 hash:", adminHash);
  
  // Hash Friday2024
  const mlHash = await bcrypt.hash("Friday2024", 10);
  console.log("Friday2024 hash:", mlHash);
  
  // Update database
  await conn.execute("UPDATE users SET password = ? WHERE username = 'admin' OR email = 'admin@friday-crm.local'", [adminHash]);
  console.log("admin password updated");
  
  await conn.execute("UPDATE users SET password = ? WHERE email = 'ml@bl2020.com'", [mlHash]);
  console.log("ml@bl2020.com password updated");
  
  await conn.end();
  console.log("Done!");
}

hashPasswords().catch(console.error);
