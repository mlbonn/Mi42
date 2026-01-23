import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: '46.224.13.250',
  port: 3306,
  user: 'manus02',
  password: 'mIlrq2NQiGP88yLo',
  database: 'friday_crm'
});

try {
  const [tables] = await connection.execute("SHOW TABLES LIKE 'scout%'");
  console.log('Scout tables:', tables);
  
  if (tables.length > 0) {
    const [columns] = await connection.execute("DESCRIBE scout_queue");
    console.log('\nscout_queue columns:', columns);
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
