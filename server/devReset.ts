/**
 * devReset.ts – Development-only database reset utility.
 *
 * Guards:
 *   NODE_ENV must NOT be "production"
 *   ALLOW_DEV_RESET must be "true"
 *
 * What it does:
 *   1. Truncates: users, email_accounts_new, sessions
 *   2. Creates a seed super-admin from env vars:
 *        SEED_ADMIN_USER  (default: "admin")
 *        SEED_ADMIN_EMAIL (default: "admin@example.com")
 *        SEED_ADMIN_PASSWORD (required)
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   ALLOW_DEV_RESET=true npx ts-node server/devReset.ts
 */
import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { users, emailAccountsNew, sessions } from '../drizzle/schema';

async function main() {
  // Guard 1: never run in production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: devReset.ts must not run in production (NODE_ENV=production)');
    process.exit(1);
  }

  // Guard 2: explicit opt-in required
  if (process.env.ALLOW_DEV_RESET !== 'true') {
    console.error('ERROR: Set ALLOW_DEV_RESET=true to allow this operation');
    process.exit(1);
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ERROR: SEED_ADMIN_PASSWORD is required');
    process.exit(1);
  }

  const adminUser = process.env.SEED_ADMIN_USER || 'admin';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';

  const db = await getDb();
  if (!db) {
    console.error('ERROR: Database not available');
    process.exit(1);
  }

  console.log('Truncating sessions...');
  await db.delete(sessions);

  console.log('Truncating email_accounts_new...');
  await db.delete(emailAccountsNew);

  console.log('Truncating users...');
  await db.delete(users);

  console.log(`Creating seed super-admin: ${adminEmail}...`);
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await db.insert(users).values({
    id: 'seed-admin',
    name: adminUser,
    email: adminEmail,
    passwordHash,
    role: 'admin',
    createdAt: new Date(),
  });

  console.log('Done. Seed admin created:');
  console.log(`  User:  ${adminUser}`);
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Role:  admin`);
  process.exit(0);
}

main().catch((e) => {
  console.error('devReset failed:', e);
  process.exit(1);
});
