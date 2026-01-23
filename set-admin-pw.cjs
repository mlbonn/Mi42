const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

async function setPassword() {
  const password = "a1b2c";
  const hash = await bcrypt.hash(password, 10);
  
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "bluser",
    password: "1Ev3eZcJ8bO0o69O",
    database: "friday_crm"
  });
  
  await conn.execute(
    "UPDATE users SET password = ? WHERE username = 'admin'",
    [hash]
  );
  
  console.log("✅ Password set:", hash);
  await conn.end();
}

setPassword().catch(console.error);
