import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { randomUUID } from 'crypto';

const connection = await mysql.createConnection({
  host: 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '2nwxpq4mXLDcF1z.root',
  password: 'FridayGBM2025!',
  database: 'friday_crm_db',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

const username = 'admin';
const password = 'admin123';
const hashedPassword = await bcrypt.hash(password, 12);

const userId = randomUUID();

try {
  await connection.execute(
    `INSERT INTO users (id, username, password, name, email, role, createdAt, lastSignedIn) 
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE password = VALUES(password)`,
    [userId, username, hashedPassword, 'Administrator', 'admin@friday-crm.local', 'admin']
  );
  
  console.log('Admin user created successfully!');
  console.log('Username: admin');
  console.log('Password: admin123');
} catch (error) {
  console.error('Error creating admin user:', error);
} finally {
  await connection.end();
}
