const mysql = require('mysql2/promise');
require('dotenv/config');

async function test() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all users with passwordHash containing |
  const [rows] = await conn.execute('SELECT id, email, LEFT(passwordHash, 50) as pwHash FROM users WHERE passwordHash LIKE ?', ['%|%']);
  
  console.log('Users with encrypted passwords:', rows.length);
  rows.forEach(u => {
    console.log('  -', u.email, '(hash preview:', u.pwHash, ')');
  });
  
  await conn.end();
}

test().catch(console.error);

