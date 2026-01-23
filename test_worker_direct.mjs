import { getDb } from './server/db.js';
import { scoutQueue } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

process.env.DATABASE_URL = 'mysql://manus02:mIlrq2NQiGP88yLo@46.224.13.250:3306/friday_crm';

const db = await getDb();
console.log('Database connected:', !!db);

try {
  const result = await db.select().from(scoutQueue).where(eq(scoutQueue.status, 'Pending')).limit(1);
  console.log('Query result:', result);
} catch (error) {
  console.error('Query error:', error.message);
  console.error('Stack:', error.stack);
}
