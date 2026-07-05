
'use strict';
require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute("SHOW INDEX FROM archived_emails WHERE Key_name = 'uq_email_contact'");
  if (rows.length > 0) {
    console.log('already exists');
  } else {
    await conn.execute('ALTER TABLE archived_emails ADD UNIQUE KEY uq_email_contact (email_id(191), contact_id(64))');
    console.log('added');
  }
  await conn.end();
}
main().catch(e => console.error(e.message));
