import { getDb } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const result = await db.execute(sql`
    SELECT 
      c.id, 
      c.name, 
      c.corporationId,
      corp.name as corporation_name,
      COUNT(ccr.contactId) as contact_count
    FROM companies c
    LEFT JOIN corporations corp ON corp.id = c.corporationId
    LEFT JOIN contact_company_relations ccr ON ccr.companyId = c.id
    GROUP BY c.id, c.name, c.corporationId, corp.name
    HAVING contact_count > 0
    ORDER BY contact_count DESC
  `);

  console.log('Companies with contacts:');
  console.log(JSON.stringify(result[0], null, 2));
  
  process.exit(0);
}

main();

