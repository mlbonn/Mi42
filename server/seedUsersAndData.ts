import "dotenv/config";
import crypto from "crypto";
import * as db from "./db";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seedUsersAndData() {
  console.log("[Seed] Creating users for all roles...");

  const users = [
    {
      id: "user-admin",
      email: "admin@friday-crm.com",
      name: "Admin User",
      password: "admin",
      role: "admin" as const,
    },
    {
      id: "user-sales-manager",
      email: "manager@friday-crm.com",
      name: "Sales Manager",
      password: "manager",
      role: "sales_manager" as const,
    },
    {
      id: "user-external-sales",
      email: "sales@friday-crm.com",
      name: "External Sales",
      password: "sales",
      role: "external_sales" as const,
    },
    {
      id: "user-partner",
      email: "partner@friday-crm.com",
      name: "Partner User",
      password: "partner",
      role: "partner" as const,
    },
  ];

  for (const user of users) {
    try {
      const existing = await db.getUserByEmail(user.email);
      if (existing) {
        console.log(`[Seed] User ${user.email} already exists, skipping...`);
        continue;
      }

      await db.createUserWithPassword({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: hashPassword(user.password),
        role: user.role,
        lastSignedIn: new Date(),
      });

      console.log(`[Seed] Created user: ${user.email} / ${user.password} (${user.role})`);
    } catch (error) {
      console.error(`[Seed] Failed to create user ${user.email}:`, error);
    }
  }

  console.log("\n[Seed] Creating test data...");

  // Create test corporations
  const corporations = [
    {
      name: "Siemens AG",
      headquartersCountry: "DE",
      totalRevenueEur: 77000000000,
      industry: "Industrial Manufacturing",
      website: "https://www.siemens.com",
      linkedinUrl: "https://linkedin.com/company/siemens",
      status: "Customer",
      priority: "High",
      companySize: "10000+",
      stage: "Producer",
      notes: null,
      products: "Automation, Electrification, Digitalization",
      targetMarkets: "Industrial, Building, Energy",
      countries: "DE, US, CN",
      referenceCustomers: null,
      employeeCount: 293000,
      international: true,
      profileAnalyzedAt: null,
      scoutStatus: "Analyzed",
      scoutGeneration: 0,
      scoutParentId: null,
      discoveryMethod: "Manual",
      discoveredAt: new Date(),
    },
    {
      name: "BMW Group",
      headquartersCountry: "DE",
      totalRevenueEur: 142600000000,
      industry: "Automotive",
      website: "https://www.bmw.com",
      linkedinUrl: "https://linkedin.com/company/bmw",
      status: "Target",
      priority: "High",
      companySize: "10000+",
      stage: "Producer",
      notes: null,
      products: "Automobiles, Motorcycles, Financial Services",
      targetMarkets: "Automotive, Premium Segment",
      countries: "DE, US, CN",
      referenceCustomers: null,
      employeeCount: 149000,
      international: true,
      profileAnalyzedAt: null,
      scoutStatus: "Analyzed",
      scoutGeneration: 0,
      scoutParentId: null,
      discoveryMethod: "Manual",
      discoveredAt: new Date(),
    },
    {
      name: "Robert Bosch GmbH",
      headquartersCountry: "DE",
      totalRevenueEur: 88200000000,
      industry: "Engineering & Technology",
      website: "https://www.bosch.com",
      linkedinUrl: "https://linkedin.com/company/bosch",
      status: "Contacted",
      priority: "Medium",
      companySize: "10000+",
      stage: "Producer",
      notes: null,
      products: "Automotive Technology, Industrial Technology, Consumer Goods",
      targetMarkets: "Automotive, Industrial, Consumer",
      countries: "DE, US, CN, IN",
      referenceCustomers: null,
      employeeCount: 429000,
      international: true,
      profileAnalyzedAt: null,
      scoutStatus: "Analyzed",
      scoutGeneration: 0,
      scoutParentId: null,
      discoveryMethod: "Manual",
      discoveredAt: new Date(),
    },
  ];

  for (const corp of corporations) {
    try {
      await db.createCorporation(corp);
      console.log(`[Seed] Created corporation: ${corp.name}`);
    } catch (error) {
      console.log(`[Seed] Corporation ${corp.name} might already exist`);
    }
  }

  // Create test companies
  const companies = [
    {
      corporationId: "corp-siemens",
      name: "Siemens Deutschland",
      country: "DE",
      city: "München",
      address: "Werner-von-Siemens-Straße 1",
      employeeCount: 50000,
      revenueEur: 25000000000,
      website: "https://www.siemens.de",
      legalForm: "GmbH",
      notes: null,
      products: null,
    },
    {
      corporationId: "corp-bmw",
      name: "BMW AG München",
      country: "DE",
      city: "München",
      address: "Petuelring 130",
      employeeCount: 40000,
      revenueEur: 50000000000,
      website: "https://www.bmw.de",
      legalForm: "AG",
      notes: null,
      products: null,
    },
    {
      corporationId: "corp-bosch",
      name: "Bosch Stuttgart",
      country: "DE",
      city: "Stuttgart",
      address: "Robert-Bosch-Platz 1",
      employeeCount: 30000,
      revenueEur: 30000000000,
      website: "https://www.bosch.de",
      legalForm: "GmbH",
      notes: null,
      products: null,
    },
  ];

  for (const company of companies) {
    try {
      await db.createCompany(company);
      console.log(`[Seed] Created company: ${company.name}`);
    } catch (error) {
      console.log(`[Seed] Company ${company.name} might already exist`);
    }
  }

  // Create test contacts with companies
  const contactsWithCompanies = [
    {
      contact: {
        firstName: "Thomas",
        lastName: "Müller",
        phone: "+49 89 636 00",
        mobile: null,
        jobTitle: "Head of Procurement",
        department: "Procurement",
        function: "Procurement",
        linkedinUrl: "https://linkedin.com/in/thomas-mueller-siemens",
        contactStatus: "Warm",
        decisionMaker: true,
        companySize: null,
        responsiblePerson: null,
        category: null,
        tags: null,
        keyword1: null,
        keyword2: null,
        phoneBusiness: "+49 89 636 00",
        phoneMobile: null,
        phoneOffice: null,
        faxOffice: null,
        notes: null,
      },
      companyId: "comp-siemens-de",
      email: "thomas.mueller@siemens.com",
      position: "Head of Procurement",
    },
    {
      contact: {
        firstName: "Anna",
        lastName: "Schmidt",
        phone: "+49 89 382 00",
        mobile: null,
        jobTitle: "Purchasing Manager",
        department: "Purchasing",
        function: "Purchasing",
        linkedinUrl: "https://linkedin.com/in/anna-schmidt-bmw",
        contactStatus: "Warm",
        decisionMaker: true,
        companySize: null,
        responsiblePerson: null,
        category: null,
        tags: null,
        keyword1: null,
        keyword2: null,
        phoneBusiness: "+49 89 382 00",
        phoneMobile: null,
        phoneOffice: null,
        faxOffice: null,
        notes: null,
      },
      companyId: "comp-bmw-de",
      email: "anna.schmidt@bmw.com",
      position: "Purchasing Manager",
    },
    {
      contact: {
        firstName: "Michael",
        lastName: "Weber",
        phone: "+49 711 811 00",
        mobile: null,
        jobTitle: "Supply Chain Director",
        department: "Supply Chain",
        function: "Supply Chain",
        linkedinUrl: "https://linkedin.com/in/michael-weber-bosch",
        contactStatus: "Hot",
        decisionMaker: true,
        companySize: null,
        responsiblePerson: null,
        category: null,
        tags: null,
        keyword1: null,
        keyword2: null,
        phoneBusiness: "+49 711 811 00",
        phoneMobile: null,
        phoneOffice: null,
        faxOffice: null,
        notes: null,
      },
      companyId: "comp-bosch-de",
      email: "michael.weber@bosch.com",
      position: "Supply Chain Director",
    },
  ];

  for (const item of contactsWithCompanies) {
    try {
      await db.createContact(item.contact, item.companyId, item.email, item.position);
      console.log(`[Seed] Created contact: ${item.contact.firstName} ${item.contact.lastName}`);
    } catch (error) {
      console.log(`[Seed] Contact ${item.contact.firstName} ${item.contact.lastName} might already exist`);
    }
  }

  // Create test deals
  const deals = [
    {
      corporationId: "corp-siemens",
      companyId: "comp-siemens-de",
      dealName: "Building Automation System",
      dealValueEur: "500000.00",
      stage: "Demo",
      probability: 60,
      expectedCloseDate: new Date("2025-12-31"),
      actualCloseDate: null,
      subscriptionTier: "Professional",
      notes: null,
      createdBy: "user-sales-manager",
    },
    {
      corporationId: "corp-bmw",
      companyId: "comp-bmw-de",
      dealName: "Factory Equipment Supply",
      dealValueEur: "1200000.00",
      stage: "Negotiation",
      probability: 75,
      expectedCloseDate: new Date("2025-11-30"),
      actualCloseDate: null,
      subscriptionTier: "Enterprise",
      notes: null,
      createdBy: "user-sales-manager",
    },
  ];

  for (const deal of deals) {
    try {
      await db.createDeal(deal, "user-sales-manager");
      console.log(`[Seed] Created deal: ${deal.dealName}`);
    } catch (error) {
      console.log(`[Seed] Deal ${deal.dealName} might already exist`);
    }
  }

  console.log("\n[Seed] Complete!");
  console.log("\n=== LOGIN CREDENTIALS ===");
  console.log("Admin:          admin@friday-crm.com / admin");
  console.log("Sales Manager:  manager@friday-crm.com / manager");
  console.log("External Sales: sales@friday-crm.com / sales");
  console.log("Partner:        partner@friday-crm.com / partner");
  console.log("========================\n");

  process.exit(0);
}

seedUsersAndData();

