import { getDb } from './server/db';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';
import { encryptPassword } from './server/encryption';

async function updateCredentials() {
  try {
    const db = await getDb();
    if (!db) {
      console.log('Database not available');
      process.exit(1);
    }

    // Find the test user
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, 'testuser1@friday-crm.de'));

    if (!userList || userList.length === 0) {
      console.log('User not found');
      process.exit(1);
    }

    const user = userList[0];
    console.log('Found user:', user.email);

    // Encrypt the password
    const encryptedPassword = encryptPassword('Markt32Markt32');
    console.log('Password encrypted');

    // Update the user
    await db
      .update(users)
      .set({
        caldavEmail: 'testFRIDAY1@bl2020.com',
        caldavPassword: encryptedPassword,
        caldavEnabled: true,
      })
      .where(eq(users.id, user.id));

    console.log('User updated successfully!');
    console.log('CalDAV Email: testFRIDAY1@bl2020.com');
    console.log('CalDAV Enabled: true');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateCredentials();
