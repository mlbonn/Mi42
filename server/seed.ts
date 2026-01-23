import { getDb } from "./db";
import { 
  corporations, companies, contacts, contactCompanyRelations, 
  deals, activities, users 
} from "../drizzle/schema";

/**
 * Seed-Daten für FRIDAY CRM Demo/Testing
 * 
 * Ausführen mit: pnpm tsx server/seed.ts
 */

async function seed() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  console.log("🌱 Seeding database...");

  // Sample Corporations
  const sampleCorporations = [
    {
      id: crypto.randomUUID(),
      name: "Saint-Gobain Group",
      headquartersCountry: "FR",
      totalRevenueEur: 51000000000,
      industry: "Building Materials",
      website: "https://www.saint-gobain.com",
      linkedinUrl: "https://www.linkedin.com/company/saint-gobain",
      status: "Customer",
      priority: "High",
      notes: "Weltmarktführer für Baumaterialien. Aktiver Kunde seit 2022.",
    },
    {
      id: crypto.randomUUID(),
      name: "Knauf Group",
      headquartersCountry: "DE",
      totalRevenueEur: 15000000000,
      industry: "Building Materials",
      website: "https://www.knauf.com",
      linkedinUrl: "https://www.linkedin.com/company/knauf",
      status: "Contacted",
      priority: "High",
      notes: "Erstkontakt im Januar 2025. Demo geplant für Februar.",
    },
    {
      id: crypto.randomUUID(),
      name: "ROCKWOOL International",
      headquartersCountry: "DK",
      totalRevenueEur: 3500000000,
      industry: "Insulation",
      website: "https://www.rockwool.com",
      linkedinUrl: "https://www.linkedin.com/company/rockwool-group",
      status: "Demo",
      priority: "High",
      notes: "Demo durchgeführt. Wartet auf Budget-Freigabe.",
    },
    {
      id: crypto.randomUUID(),
      name: "James Hardie Industries",
      headquartersCountry: "IE",
      totalRevenueEur: 3800000000,
      industry: "Building Materials",
      website: "https://www.jameshardie.com",
      linkedinUrl: "https://www.linkedin.com/company/james-hardie",
      status: "Target",
      priority: "Medium",
      notes: "Potentieller Kunde. Noch kein Kontakt.",
    },
    {
      id: crypto.randomUUID(),
      name: "Etex Group",
      headquartersCountry: "BE",
      totalRevenueEur: 3200000000,
      industry: "Building Materials",
      website: "https://www.etexgroup.com",
      linkedinUrl: "https://www.linkedin.com/company/etex-group",
      status: "Target",
      priority: "Medium",
      notes: "Auf Zielkundenliste. Outreach geplant für Q2.",
    },
  ];

  console.log("Inserting corporations...");
  await db.insert(corporations).values(sampleCorporations);

  // Sample Companies (für Saint-Gobain)
  const saintGobainId = sampleCorporations[0].id;
  const sampleCompanies = [
    {
      id: crypto.randomUUID(),
      corporationId: saintGobainId,
      name: "Saint-Gobain Rigips GmbH",
      legalForm: "GmbH",
      country: "DE",
      city: "Düsseldorf",
      revenueEur: 1200000000,
      products: JSON.stringify(["Drywall", "Insulation", "Ceiling Systems"]),
      website: "https://www.rigips.de",
    },
    {
      id: crypto.randomUUID(),
      corporationId: saintGobainId,
      name: "Saint-Gobain Weber GmbH",
      legalForm: "GmbH",
      country: "DE",
      city: "Düsseldorf",
      revenueEur: 800000000,
      products: JSON.stringify(["Mortar", "Facades", "Flooring"]),
      website: "https://www.de.weber",
    },
    {
      id: crypto.randomUUID(),
      corporationId: saintGobainId,
      name: "Saint-Gobain Isover SA",
      legalForm: "SA",
      country: "FR",
      city: "Paris",
      revenueEur: 2500000000,
      products: JSON.stringify(["Insulation", "Acoustic Solutions"]),
      website: "https://www.isover.com",
    },
  ];

  console.log("Inserting companies...");
  await db.insert(companies).values(sampleCompanies);

  // Sample Contacts
  const rigipsId = sampleCompanies[0].id;
  const weberId = sampleCompanies[1].id;

  const sampleContacts = [
    {
      id: crypto.randomUUID(),
      firstName: "Dr. Thomas",
      lastName: "Müller",
      jobTitle: "Head of Market Research",
      phone: "+49 211 5503 100",
      linkedinUrl: "https://www.linkedin.com/in/thomas-mueller-example",
      decisionMaker: true,
      contactStatus: "Hot",
      notes: "Hauptansprechpartner für GBM. Sehr interessiert an Expansion-Daten.",
    },
    {
      id: crypto.randomUUID(),
      firstName: "Anna",
      lastName: "Schmidt",
      jobTitle: "Strategic Planning Manager",
      phone: "+49 211 5503 200",
      linkedinUrl: "https://www.linkedin.com/in/anna-schmidt-example",
      decisionMaker: false,
      contactStatus: "Warm",
      notes: "Nutzt GBM für Marktanalysen. Berichtet an Dr. Müller.",
    },
  ];

  console.log("Inserting contacts...");
  await db.insert(contacts).values(sampleContacts);

  // Link Contacts to Companies
  const contact1Id = sampleContacts[0].id;
  const contact2Id = sampleContacts[1].id;

  await db.insert(contactCompanyRelations).values([
    {
      id: crypto.randomUUID(),
      contactId: contact1Id,
      companyId: rigipsId,
      email: "thomas.mueller@rigips.de",
      position: "Head of Market Research",
      isPrimary: true,
    },
    {
      id: crypto.randomUUID(),
      contactId: contact1Id,
      companyId: weberId,
      email: "thomas.mueller@weber.de",
      position: "Board Member",
      isPrimary: false,
    },
    {
      id: crypto.randomUUID(),
      contactId: contact2Id,
      companyId: rigipsId,
      email: "anna.schmidt@rigips.de",
      position: "Strategic Planning Manager",
      isPrimary: true,
    },
  ]);

  // Sample Deals
  const sampleDeals = [
    {
      id: crypto.randomUUID(),
      corporationId: saintGobainId,
      companyId: rigipsId,
      dealName: "GBM Professional Subscription",
      dealValueEur: "15000",
      stage: "Closed Won",
      probability: 100,
      subscriptionTier: "Professional",
      createdBy: null,
      notes: "Jahresvertrag. Verlängerung im Dezember 2025.",
    },
    {
      id: crypto.randomUUID(),
      corporationId: sampleCorporations[1].id, // Knauf
      dealName: "GBM Enterprise Trial",
      dealValueEur: "0",
      stage: "Demo",
      probability: 60,
      subscriptionTier: "Enterprise",
      createdBy: null,
      notes: "30-Tage Trial läuft. Follow-Up am 15. Februar.",
    },
    {
      id: crypto.randomUUID(),
      corporationId: sampleCorporations[2].id, // ROCKWOOL
      dealName: "GBM Professional Subscription",
      dealValueEur: "12000",
      stage: "Negotiation",
      probability: 75,
      subscriptionTier: "Professional",
      createdBy: null,
      notes: "Verhandlung über Multi-Year Deal.",
    },
  ];

  console.log("Inserting deals...");
  await db.insert(deals).values(sampleDeals);

  // Sample Activities
  const sampleActivities = [
    {
      id: crypto.randomUUID(),
      corporationId: saintGobainId,
      companyId: rigipsId,
      contactId: contact1Id,
      activityType: "Email",
      activityDate: new Date("2025-01-15"),
      subject: "Follow-Up: GBM Renewal",
      content: "Hallo Dr. Müller,\n\nwie besprochen sende ich Ihnen das Renewal-Angebot für 2025.\n\nBeste Grüße",
      direction: "Outbound",
      outcome: "Positive",
      createdBy: "Sales Team",
    },
    {
      id: crypto.randomUUID(),
      corporationId: saintGobainId,
      companyId: rigipsId,
      contactId: contact1Id,
      activityType: "Call",
      activityDate: new Date("2025-01-20"),
      subject: "Renewal bestätigt",
      content: "Telefonat mit Dr. Müller. Renewal für 2025 bestätigt. Vertrag wird nächste Woche unterschrieben.",
      direction: "Inbound",
      outcome: "Positive",
      createdBy: "Sales Team",
    },
    {
      id: crypto.randomUUID(),
      corporationId: sampleCorporations[1].id,
      activityType: "Demo",
      activityDate: new Date("2025-01-25"),
      subject: "GBM Demo für Knauf",
      content: "Demo durchgeführt. 3 Teilnehmer. Sehr interessiert an Export-Daten für Polen und Tschechien.",
      direction: "Outbound",
      outcome: "Positive",
      createdBy: "Sales Team",
    },
  ];

  console.log("Inserting activities...");
  await db.insert(activities).values(sampleActivities);

  console.log("✅ Seeding completed!");
  console.log(`
  Created:
  - ${sampleCorporations.length} Corporations
  - ${sampleCompanies.length} Companies
  - ${sampleContacts.length} Contacts
  - ${sampleDeals.length} Deals
  - ${sampleActivities.length} Activities
  `);

  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});

