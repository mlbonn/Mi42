const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

(async () => {
  const hash = await bcrypt.hash('Friday2024!', 12);
  console.log('Hash:', hash);
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'bluser',
    password: '1Ev3eZcJ8bO0o69O',
    database: 'friday_crm'
  });
  const [result] = await conn.execute('UPDATE users SET password = ? WHERE username = ?', [hash, 'ml@bl2020.com']);
  console.log('Updated:', result.affectedRows);
  const [rows] = await conn.execute('SELECT username, password FROM users WHERE username = ?', ['ml@bl2020.com']);
  console.log('Check:', rows[0]);
  await conn.end();
})();
