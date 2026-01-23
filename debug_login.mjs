import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

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

console.log('=== Login Debug Test ===\n');

// 1. Check if user exists
const [users] = await connection.execute(
  'SELECT id, username, name, email, role, password FROM users WHERE username = ?',
  ['admin']
);

if (users.length === 0) {
  console.log('❌ User "admin" not found in database!');
  process.exit(1);
}

const user = users[0];
console.log('✅ User found:');
console.log('   ID:', user.id);
console.log('   Username:', user.username);
console.log('   Name:', user.name);
console.log('   Email:', user.email);
console.log('   Role:', user.role);
console.log('   Password hash:', user.password ? user.password.substring(0, 20) + '...' : 'NULL');

// 2. Test password verification
if (!user.password) {
  console.log('\n❌ Password field is NULL!');
  process.exit(1);
}

const testPassword = 'admin123';
console.log('\n=== Testing Password ===');
console.log('Test password:', testPassword);

const isValid = await bcrypt.compare(testPassword, user.password);
console.log('Password valid:', isValid ? '✅ YES' : '❌ NO');

if (!isValid) {
  console.log('\n⚠️  Password hash does not match!');
  console.log('Generating new hash...');
  const newHash = await bcrypt.hash(testPassword, 12);
  console.log('New hash:', newHash);
  
  await connection.execute(
    'UPDATE users SET password = ? WHERE username = ?',
    [newHash, 'admin']
  );
  console.log('✅ Password updated in database');
  
  // Verify new hash
  const isNewValid = await bcrypt.compare(testPassword, newHash);
  console.log('New password valid:', isNewValid ? '✅ YES' : '❌ NO');
}

await connection.end();
console.log('\n=== Test Complete ===');
