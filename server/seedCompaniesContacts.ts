/**
 * Seed Companies and Contacts for existing Corporations
 */

import * as db from './db';
import { drizzle } from 'drizzle-orm/mysql2';
import { corporations } from '../drizzle/schema';

async function main() {
  console.log('🌱 Seeding Companies and Contacts for existing Corporations...');

  // Get all corporations directly from database
  const dbConn = await db.getDb();
  if (!dbConn) {
    console.log('❌ Database not available');
    return;
  }
  const allCorps = await dbConn.select().from(corporations);
  
  if (!allCorps || allCorps.length === 0) {
    console.log('❌ No corporations found. Please run seed scripts first.');
    return;
  }

  console.log(`Found ${allCorps.length} corporations`);

  // Take first 3 corporations for detailed seeding
  const corps = allCorps.slice(0, 3);

  for (const corp of corps) {
    console.log(`\n📊 Seeding for ${corp.name}...`);

    // Create 3 companies per corporation
    for (let i = 1; i <= 3; i++) {
      const companyName = `${corp.name} ${i === 1 ? 'Deutschland' : i === 2 ? 'Schweiz' : 'Österreich'}`;
      const country = i === 1 ? 'DE' : i === 2 ? 'CH' : 'AT';
      
      await db.createCompany({
        corporationId: corp.id,
        name: companyName,
        legalForm: 'GmbH',
        country: country,
        city: i === 1 ? 'München' : i === 2 ? 'Zürich' : 'Wien',
        address: `Hauptstraße ${i}`,
        revenueEur: null,
        products: null,
        website: null,
        notes: null,
      });

      console.log(`  ✅ Created company: ${companyName}`);

      // Get company by name to get ID
      const allCompanies = await db.getAllCompanies();
      const createdCompany = allCompanies.find(c => c.name === companyName);
      if (!createdCompany) {
        console.error(`Failed to find created company: ${companyName}`);
        continue;
      }
      const companyId = createdCompany.id;

      // Create 3 contacts per company
      for (let j = 1; j <= 3; j++) {
        const firstName = ['Max', 'Anna', 'Thomas'][j - 1];
        const lastName = ['Müller', 'Schmidt', 'Weber'][j - 1];
        const jobTitle = ['CEO', 'CTO', 'Sales Director'][j - 1];
        
        await db.createContact(
          {
            firstName,
            lastName,
            jobTitle,
            phone: null,
            mobile: null,
            linkedinUrl: null,
            decisionMaker: j === 1,
            contactStatus: 'Active',
            notes: null,
            keyword1: null,
            keyword2: null,
            companySize: null,
            responsiblePerson: null,
            function: null,
            department: null,
            category: null,
            tags: null,
            phoneBusiness: null,
            phoneMobile: null,
            phoneOffice: null,
            faxOffice: null,
          },
          companyId.toString(),
          `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
          jobTitle
        );

        console.log(`    ✅ Created contact: ${firstName} ${lastName} (${jobTitle})`);
      }
    }
  }

  // Create 2 standalone companies (no corporation)
  console.log('\n📊 Creating standalone companies...');
  
  const standaloneCompanies = [
    { name: 'Zalando SE', country: 'DE', city: 'Berlin' },
    { name: 'Delivery Hero SE', country: 'DE', city: 'Berlin' },
  ];

  for (const companyData of standaloneCompanies) {
    await db.createCompany({
      corporationId: '', // No corporation
      name: companyData.name,
      legalForm: 'SE',
      country: companyData.country,
      city: companyData.city,
      address: 'Startup Straße 1',
      revenueEur: null,
      products: null,
      website: null,
      notes: null,
    });

    console.log(`  ✅ Created standalone company: ${companyData.name}`);

    // Get company by name to get ID
    const allCompanies = await db.getAllCompanies();
    const createdCompany = allCompanies.find(c => c.name === companyData.name);
    if (!createdCompany) {
      console.error(`Failed to find created company: ${companyData.name}`);
      continue;
    }
    const companyId = createdCompany.id;

    // Create 2 contacts per standalone company
    for (let j = 1; j <= 2; j++) {
      const firstName = ['Lisa', 'Michael'][j - 1];
      const lastName = ['Becker', 'Fischer'][j - 1];
      const jobTitle = ['CEO', 'CFO'][j - 1];
      
      await db.createContact(
        {
          firstName,
          lastName,
          jobTitle,
          phone: null,
          mobile: null,
          linkedinUrl: null,
          decisionMaker: j === 1,
          contactStatus: 'Active',
          notes: null,
          keyword1: null,
          keyword2: null,
          companySize: null,
          responsiblePerson: null,
          function: null,
          department: null,
          category: null,
          tags: null,
          phoneBusiness: null,
          phoneMobile: null,
          phoneOffice: null,
          faxOffice: null,
        },
        companyId.toString(),
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${companyData.name.toLowerCase().replace(/\s+/g, '')}.com`,
        jobTitle
      );

      console.log(`    ✅ Created contact: ${firstName} ${lastName} (${jobTitle})`);
    }
  }

  console.log('\n✅ Seed completed!');
  console.log(`Total: ${corps.length * 3 + 2} companies, ${corps.length * 3 * 3 + 2 * 2} contacts`);
}

main().catch(console.error);

