import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '46.224.13.250',
  port: 3306,
  user: 'manus02',
  password: 'mIlrq2NQiGP88yLo',
  database: 'friday_crm'
});

const [rows] = await connection.execute('SELECT id, seedType, status, createdAt FROM scout_queue ORDER BY createdAt DESC LIMIT 10');
console.log('Scout Queue Jobs:', rows);
await connection.end();
