import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL || "mysql://manus02:mIlrq2NQiGP88yLo@46.224.13.250:3306/friday_crm";

async function deleteZalandoDeliveryHero() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log("🔍 Finding Zalando and Delivery Hero companies...");
  
  // Find all companies with Zalando or Delivery Hero in name
  const [companiesToDelete] = await connection.execute(
    "SELECT id, name FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%'"
  );

  console.log(`Found ${(companiesToDelete as any[]).length} companies to delete:`);
  (companiesToDelete as any[]).forEach((c: any) => console.log(`  - ${c.name} (${c.id})`));

  if ((companiesToDelete as any[]).length === 0) {
    console.log("✅ No companies found. Nothing to delete.");
    await connection.end();
    return;
  }

  // Delete contact_company_relations
  console.log("\n🗑️  Deleting contact_company_relations...");
  const [deletedRelations] = await connection.execute(
    "DELETE FROM contact_company_relations WHERE companyId IN (SELECT id FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%')"
  );
  console.log(`   Deleted ${(deletedRelations as any).affectedRows || 0} relations`);

  // Delete deals
  console.log("\n🗑️  Deleting deals...");
  const [deletedDeals] = await connection.execute(
    "DELETE FROM deals WHERE companyId IN (SELECT id FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%')"
  );
  console.log(`   Deleted ${(deletedDeals as any).affectedRows || 0} deals`);

  // Delete activities
  console.log("\n🗑️  Deleting activities...");
  const [deletedActivities] = await connection.execute(
    "DELETE FROM activities WHERE companyId IN (SELECT id FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%')"
  );
  console.log(`   Deleted ${(deletedActivities as any).affectedRows || 0} activities`);

  // Delete companies
  console.log("\n🗑️  Deleting companies...");
  const [deletedCompanies] = await connection.execute(
    "DELETE FROM companies WHERE name LIKE '%Zalando%' OR name LIKE '%Delivery Hero%'"
  );
  console.log(`   Deleted ${(deletedCompanies as any).affectedRows || 0} companies`);

  await connection.end();
  console.log("\n✅ Cleanup complete!");
}

deleteZalandoDeliveryHero()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

