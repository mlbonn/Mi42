import bcrypt from 'bcryptjs';

const password = 'admin123';
const storedHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEgEn4i';

console.log('Testing password:', password);
console.log('Stored hash:', storedHash);

const isValid = await bcrypt.compare(password, storedHash);
console.log('Password valid:', isValid);

// Generate new hash for testing
const newHash = await bcrypt.hash(password, 12);
console.log('New hash:', newHash);

const isNewValid = await bcrypt.compare(password, newHash);
console.log('New hash valid:', isNewValid);
