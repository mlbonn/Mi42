import { config } from \"dotenv\";
import mysql from \"mysql2/promise\";
import bcrypt from \"bcryptjs\";

config();

async function createUser() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const hash = await bcrypt.hash(\"Rheinrhein##11\", 12);
  const userId = \"ml-\" + Date.now();
  
  await conn.execute(
    \"INSERT INTO users (id, username, password, name, email, role) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), username = VALUES(username)\",
    [userId, \"ml@bl2020.com\", hash, \"ML Admin\", \"ml@bl2020.com\", \"admin\"]
  );
  
  console.log(\"✅ User created successfully!\");
  console.log(\"Username/Email: ml@bl2020.com\");
  console.log(\"Password: Rheinrhein##11\");
  console.log(\"Role: admin\");
  
  await conn.end();
}

createUser().catch(console.error);
EOFUSER
node create-ml-user.mjs
