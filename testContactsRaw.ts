import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const companyId = '8ae7f083-a627-4a10-a774-c38cc3114f15';
  console.log('Testing raw SQL query for companyId:', companyId);
  
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const result = await db.execute(sql`
    SELECT c.*, ccr.email as relation_email, ccr.position as relation_position
    FROM contacts c
    INNER JOIN contact_company_relations ccr ON ccr.contactId = c.id
    WHERE ccr.companyId = ${companyId}
  `);

  console.log('Raw SQL result:', result);
  console.log('Row count:', result[0]?.length || 0);
  
  process.exit(0);
}

main();

