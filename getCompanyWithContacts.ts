import { getDb } from './server/db';
import { companies, contactCompanyRelations } from './drizzle/schema';
import { eq, like, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  const result = await db
    .select({
      id: companies.id,
      name: companies.name,
      contactCount: sql<number>`COUNT(${contactCompanyRelations.contactId})`,
    })
    .from(companies)
    .innerJoin(contactCompanyRelations, eq(contactCompanyRelations.companyId, companies.id))
    .where(like(companies.name, '%Robert Bosch%Deutschland%'))
    .groupBy(companies.id, companies.name)
    .limit(1);

  console.log('Company with contacts:', result[0]);
  process.exit(0);
}

main();

