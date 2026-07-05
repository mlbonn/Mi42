import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "./db";
import { 
  corporations, companies, contacts, contactCompanyRelations, 
  activities 
} from "../drizzle/schema";

/**
 * Import-Skript für Genesis World CRM Daten
 * 
 * Erwartet CSV-Dateien im Format:
 * - corporations.csv
 * - companies.csv
 * - contacts.csv
 * - contact_company_relations.csv
 * - activities.csv (optional, für E-Mail-Import)
 * 
 * Ausführen mit: pnpm tsx server/import.ts /path/to/csv/folder
 */

interface CorporationCSV {
  name: string;
  headquarters_country: string;
  total_revenue_eur?: string;
  industry?: string;
  website?: string;
  linkedin_url?: string;
  status?: string;
  priority?: string;
  notes?: string;
}

interface CompanyCSV {
  corporation_name: string; // Wird zu corporationId gemappt
  name: string;
  legal_form?: string;
  country?: string;
  city?: string;
  revenue_eur?: string;
  products?: string; // JSON Array als String
  website?: string;
}

interface ContactCSV {
  first_name: string;
  last_name: string;
  job_title?: string;
  phone?: string;
  linkedin_url?: string;
  decision_maker?: string; // "true" oder "false"
  contact_status?: string;
  notes?: string;
}

interface ContactCompanyRelationCSV {
  contact_first_name: string;
  contact_last_name: string;
  company_name: string;
  email: string;
  position?: string;
  is_primary?: string; // "true" oder "false"
}

interface ActivityCSV {
  corporation_name?: string;
  company_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  activity_type: string;
  activity_date: string; // ISO 8601
  subject: string;
  content?: string;
  direction?: string;
  outcome?: string;
  created_by?: string;
}

async function importCorporations(csvPath: string): Promise<Map<string, string>> {
  console.log(`📊 Importing corporations from ${csvPath}...`);
  
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records: CorporationCSV[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nameToIdMap = new Map<string, string>();

  for (const record of records) {
    const id = crypto.randomUUID();
    nameToIdMap.set(record.name, id);

    await db.insert(corporations).values({
      id,
      name: record.name,
      headquartersCountry: record.headquarters_country,
      totalRevenueEur: record.total_revenue_eur ? Number(record.total_revenue_eur) : null,
      industry: record.industry || null,
      website: record.website || null,
      linkedinUrl: record.linkedin_url || null,
      status: record.status || "Target",
      priority: record.priority || "Medium",
      notes: record.notes || null,
    });
  }

  console.log(`✅ Imported ${records.length} corporations`);
  return nameToIdMap;
}

async function importCompanies(
  csvPath: string,
  corporationMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log(`🏢 Importing companies from ${csvPath}...`);
  
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records: CompanyCSV[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nameToIdMap = new Map<string, string>();

  for (const record of records) {
    const corporationId = corporationMap.get(record.corporation_name);
    if (!corporationId) {
      console.warn(`⚠️  Corporation not found: ${record.corporation_name}`);
      continue;
    }

    const id = crypto.randomUUID();
    nameToIdMap.set(record.name, id);

    await db.insert(companies).values({
      id,
      corporationId,
      name: record.name,
      legalForm: record.legal_form || null,
      country: record.country || null,
      city: record.city || null,
      revenueEur: record.revenue_eur ? Number(record.revenue_eur) : null,
      products: record.products || null,
      website: record.website || null,
    });
  }

  console.log(`✅ Imported ${records.length} companies`);
  return nameToIdMap;
}

async function importContacts(csvPath: string): Promise<Map<string, string>> {
  console.log(`👤 Importing contacts from ${csvPath}...`);
  
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records: ContactCSV[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nameToIdMap = new Map<string, string>();

  for (const record of records) {
    const id = crypto.randomUUID();
    const key = `${record.first_name} ${record.last_name}`;
    nameToIdMap.set(key, id);

    await db.insert(contacts).values({
      id,
      firstName: record.first_name,
      lastName: record.last_name,
      jobTitle: record.job_title || null,
      phone: record.phone || null,
      linkedinUrl: record.linkedin_url || null,
      decisionMaker: record.decision_maker === "true",
      contactStatus: record.contact_status || "Cold",
      notes: record.notes || null,
    });
  }

  console.log(`✅ Imported ${records.length} contacts`);
  return nameToIdMap;
}

async function importContactCompanyRelations(
  csvPath: string,
  contactMap: Map<string, string>,
  companyMap: Map<string, string>
): Promise<void> {
  console.log(`🔗 Importing contact-company relations from ${csvPath}...`);
  
  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records: ContactCompanyRelationCSV[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const record of records) {
    const contactKey = `${record.contact_first_name} ${record.contact_last_name}`;
    const contactId = contactMap.get(contactKey);
    const companyId = companyMap.get(record.company_name);

    if (!contactId) {
      console.warn(`⚠️  Contact not found: ${contactKey}`);
      continue;
    }
    if (!companyId) {
      console.warn(`⚠️  Company not found: ${record.company_name}`);
      continue;
    }

    await db.insert(contactCompanyRelations).values({
      id: crypto.randomUUID(),
      contactId,
      companyId,
      email: record.email,
      position: record.position || null,
      isPrimary: record.is_primary === "true",
    });
  }

  console.log(`✅ Imported ${records.length} contact-company relations`);
}

async function importActivities(
  csvPath: string,
  corporationMap: Map<string, string>,
  companyMap: Map<string, string>,
  contactMap: Map<string, string>
): Promise<void> {
  console.log(`📧 Importing activities from ${csvPath}...`);
  
  if (!fs.existsSync(csvPath)) {
    console.log("⚠️  Activities file not found, skipping...");
    return;
  }

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records: ActivityCSV[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const record of records) {
    const corporationId = record.corporation_name 
      ? corporationMap.get(record.corporation_name) 
      : null;
    const companyId = record.company_name 
      ? companyMap.get(record.company_name) 
      : null;
    const contactKey = record.contact_first_name && record.contact_last_name
      ? `${record.contact_first_name} ${record.contact_last_name}`
      : null;
    const contactId = contactKey ? contactMap.get(contactKey) : null;

    await db.insert(activities).values({
      id: crypto.randomUUID(),
      corporationId: corporationId || null,
      companyId: companyId || null,
      contactId: contactId || null,
      activityType: record.activity_type,
      activityDate: new Date(record.activity_date),
      subject: record.subject,
      content: record.content || null,
      direction: record.direction || "Outbound",
      outcome: record.outcome || null,
      createdBy: record.created_by || null,
    } as any);
  }

  console.log(`✅ Imported ${records.length} activities`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: pnpm tsx server/import.ts /path/to/csv/folder");
    process.exit(1);
  }

  const csvFolder = args[0];

  if (!fs.existsSync(csvFolder)) {
    console.error(`❌ Folder not found: ${csvFolder}`);
    process.exit(1);
  }

  console.log("🚀 Starting import from Genesis World CRM...\n");

  try {
    // 1. Corporations
    const corporationsPath = path.join(csvFolder, "corporations.csv");
    const corporationMap = await importCorporations(corporationsPath);

    // 2. Companies
    const companiesPath = path.join(csvFolder, "companies.csv");
    const companyMap = await importCompanies(companiesPath, corporationMap);

    // 3. Contacts
    const contactsPath = path.join(csvFolder, "contacts.csv");
    const contactMap = await importContacts(contactsPath);

    // 4. Contact-Company Relations
    const relationsPath = path.join(csvFolder, "contact_company_relations.csv");
    await importContactCompanyRelations(relationsPath, contactMap, companyMap);

    // 5. Activities (optional)
    const activitiesPath = path.join(csvFolder, "activities.csv");
    await importActivities(activitiesPath, corporationMap, companyMap, contactMap);

    console.log("\n✅ Import completed successfully!");
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();

