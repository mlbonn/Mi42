import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const companyId = '8ae7f083-a627-4a10-a774-c38cc3114f15';
  
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const result = await db.execute(sql`
    SELECT ccr.*, c.firstName, c.lastName
    FROM contact_company_relations ccr
    INNER JOIN contacts c ON c.id = ccr.contactId
    WHERE ccr.companyId = ${companyId}
  `);

  console.log('Contacts for company:', result[0]);
  console.log('Count:', result[0]?.length || 0);
  
  process.exit(0);
}

main();

