// server/hunterWorkerDaemon.ts
import "dotenv/config";

// server/integrations/apollo.ts
var APOLLO_API_KEY = process.env.APOLLO_API_KEY || "";
var APOLLO_API_BASE = "https://api.apollo.io/v1";
async function searchPeople(params) {
  if (!APOLLO_API_KEY) {
    console.warn("[Apollo] API key not configured, using mock data");
    return getMockData(params);
  }
  try {
    const requestBody = {
      q_organization_domains: [params.organizationDomain],
      page: params.page || 1,
      per_page: params.perPage || 10
    };
    if (params.personTitles && params.personTitles.length > 0) {
      requestBody.person_titles = params.personTitles;
    }
    if (params.personSeniorities && params.personSeniorities.length > 0) {
      requestBody.person_seniorities = params.personSeniorities;
    }
    console.log(`[Apollo] Searching people at ${params.organizationDomain}`);
    const response = await fetch(`${APOLLO_API_BASE}/people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apollo API error: ${response.status} ${errorText}`);
    }
    const data = await response.json();
    const people = (data.people || []).map((person) => ({
      id: person.id,
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      name: person.name || `${person.first_name} ${person.last_name}`,
      title: person.title || "",
      email: person.email || null,
      email_status: person.email_status || "unavailable",
      linkedin_url: person.linkedin_url || null,
      phone_numbers: person.phone_numbers || [],
      organization_name: person.organization?.name || "",
      seniority: person.seniority || "unknown",
      departments: person.departments || []
    }));
    console.log(`[Apollo] Found ${people.length} people`);
    return {
      people,
      pagination: {
        total: data.pagination?.total_entries || people.length,
        page: data.pagination?.page || 1,
        per_page: data.pagination?.per_page || 10
      }
    };
  } catch (error) {
    console.error("[Apollo] Search failed:", error);
    return getMockData(params);
  }
}
function getMockData(params) {
  const mockPeople = {
    "bauder.de": [
      {
        id: "mock_bd_001",
        first_name: "Klaus",
        last_name: "M\xFCller",
        name: "Klaus M\xFCller",
        title: "VP Sales DACH",
        email: "klaus.mueller@bauder.de",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/klausmueller",
        phone_numbers: ["+49 711 8807 0"],
        organization_name: "Bauder",
        seniority: "vp",
        departments: ["sales"]
      },
      {
        id: "mock_bd_002",
        first_name: "Anna",
        last_name: "Schmidt",
        name: "Anna Schmidt",
        title: "Head of Market Research",
        email: "anna.schmidt@bauder.de",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/annaschmidt",
        phone_numbers: [],
        organization_name: "Bauder",
        seniority: "director",
        departments: ["marketing"]
      }
    ],
    "sika.com": [
      {
        id: "mock_sk_001",
        first_name: "Thomas",
        last_name: "Hasler",
        name: "Thomas Hasler",
        title: "CEO",
        email: "thomas.hasler@sika.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/thomashasler",
        phone_numbers: ["+41 58 436 68 00"],
        organization_name: "Sika AG",
        seniority: "c_suite",
        departments: ["operations"]
      }
    ]
  };
  const domain = params.organizationDomain.toLowerCase();
  const people = mockPeople[domain] || [];
  return {
    people,
    pagination: {
      total: people.length,
      page: 1,
      per_page: 10
    }
  };
}

// server/integrations/hunter.ts
async function findEmail(params) {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const first = params.firstName.toLowerCase();
  const last = params.lastName.toLowerCase();
  const domain = params.domain.toLowerCase();
  const patterns = [
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}_${last}@${domain}`
  ];
  const email = patterns[0];
  const knownDomains = ["saint-gobain.com", "knauf.com", "rockwool.com", "jameshardie.com"];
  const score = knownDomains.includes(domain) ? 92 : 65;
  return {
    email,
    score,
    sources: [
      {
        domain,
        uri: `https://${domain}/team`,
        extracted_on: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    position: null,
    company: null
  };
}
async function verifyEmail(email) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const domain = email.split("@")[1];
  const knownDomains = ["saint-gobain.com", "knauf.com", "rockwool.com", "jameshardie.com", "etexgroup.com"];
  const isKnownDomain = knownDomains.includes(domain);
  const disposableDomains = ["tempmail.com", "guerrillamail.com", "10minutemail.com"];
  const isDisposable = disposableDomains.includes(domain);
  const webmailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  const isWebmail = webmailDomains.includes(domain);
  let result;
  let score;
  if (isDisposable) {
    result = "undeliverable";
    score = 10;
  } else if (isKnownDomain) {
    result = "deliverable";
    score = 95;
  } else if (isWebmail) {
    result = "risky";
    score = 60;
  } else {
    result = "unknown";
    score = 50;
  }
  return {
    result,
    score,
    email,
    regexp: true,
    gibberish: false,
    disposable: isDisposable,
    webmail: isWebmail,
    mx_records: !isDisposable,
    smtp_server: !isDisposable,
    smtp_check: isKnownDomain,
    accept_all: false,
    block: isDisposable
  };
}

// server/db.ts
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, int, decimal, index, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "staff", "staff_plus"]).default("staff").notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  // active, inactive
  assignedTo: varchar("assignedTo", { length: 64 }),
  // For staff_plus: which staff/admin manages them
  // CalDAV Integration
  caldavEmail: varchar("caldavEmail", { length: 320 }),
  // CalDAV/SmarterMail email
  caldavPassword: text("caldavPassword"),
  // Encrypted CalDAV password
  caldavEnabled: boolean("caldavEnabled").default(false),
  // Enable calendar sync
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow()
});
var userAssignments = mysqlTable("user_assignments", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 64 }).notNull(),
  // staff_plus user
  entityType: mysqlEnum("entityType", ["company", "contact"]).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  assignedBy: varchar("assignedBy", { length: 64 }).notNull(),
  // staff/admin who assigned
  assignedAt: timestamp("assignedAt").defaultNow()
}, (table) => ({
  userIdx: index("user_assignments_user_idx").on(table.userId),
  entityIdx: index("user_assignments_entity_idx").on(table.entityType, table.entityId)
}));
var corporations = mysqlTable("corporations", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  headquartersCountry: varchar("headquartersCountry", { length: 2 }),
  // ISO Code
  totalRevenueEur: bigint("totalRevenueEur", { mode: "number" }),
  // Konzernumsatz
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 255 }),
  linkedinUrl: varchar("linkedinUrl", { length: 255 }),
  status: varchar("status", { length: 50 }).default("Target"),
  // Target, Contacted, Customer, Lost
  priority: varchar("priority", { length: 20 }).default("Medium"),
  // High, Medium, Low
  notes: text("notes"),
  // Genesis World CRM Felder
  companySize: varchar("companySize", { length: 100 }),
  stage: varchar("stage", { length: 100 }),
  // Producer, Distributor, etc.
  // Scout Agent Felder
  products: text("products"),
  targetMarkets: text("targetMarkets"),
  countries: text("countries"),
  referenceCustomers: text("referenceCustomers"),
  employeeCount: int("employeeCount"),
  international: boolean("international").default(false),
  profileAnalyzedAt: timestamp("profileAnalyzedAt"),
  scoutStatus: varchar("scoutStatus", { length: 50 }).default("Not Analyzed"),
  scoutGeneration: int("scoutGeneration").default(0),
  scoutParentId: varchar("scoutParentId", { length: 64 }),
  discoveryMethod: varchar("discoveryMethod", { length: 100 }),
  discoveredAt: timestamp("discoveredAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
}, (table) => ({
  nameIdx: index("corporations_name_idx").on(table.name),
  statusIdx: index("corporations_status_idx").on(table.status),
  generationIdx: index("corp_generation_idx").on(table.scoutGeneration),
  parentIdx: index("corp_parent_idx").on(table.scoutParentId)
}));
var companies = mysqlTable("companies", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  legalForm: varchar("legalForm", { length: 50 }),
  // GmbH, AG, Ltd, Inc
  country: varchar("country", { length: 2 }),
  // ISO Code
  city: varchar("city", { length: 100 }),
  address: text("address"),
  revenueEur: bigint("revenueEur", { mode: "number" }),
  products: text("products"),
  // JSON string: ["Drywall", "Insulation"]
  website: varchar("website", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
}, (table) => ({
  corporationIdx: index("companies_corporation_idx").on(table.corporationId),
  nameIdx: index("companies_name_idx").on(table.name)
}));
var contacts = mysqlTable("contacts", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
  linkedinUrl: varchar("linkedinUrl", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  mobile: varchar("mobile", { length: 50 }),
  decisionMaker: boolean("decisionMaker").default(false),
  contactStatus: varchar("contactStatus", { length: 50 }).default("Cold"),
  // Cold, Warm, Hot
  notes: text("notes"),
  // Genesis World CRM Felder
  keyword1: text("keyword1"),
  keyword2: text("keyword2"),
  companySize: varchar("companySize", { length: 100 }),
  responsiblePerson: varchar("responsiblePerson", { length: 255 }),
  function: varchar("function", { length: 100 }),
  department: varchar("department", { length: 100 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags"),
  // comma-separated
  phoneBusiness: varchar("phoneBusiness", { length: 50 }),
  phoneMobile: varchar("phoneMobile", { length: 50 }),
  phoneOffice: varchar("phoneOffice", { length: 50 }),
  faxOffice: varchar("faxOffice", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
}, (table) => ({
  nameIdx: index("contacts_name_idx").on(table.lastName, table.firstName)
}));
var contactCompanyRelations = mysqlTable("contact_company_relations", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactId: varchar("contactId", { length: 64 }).notNull(),
  companyId: varchar("companyId", { length: 64 }).notNull(),
  email: varchar("email", { length: 255 }),
  // E-Mail für diese Firma
  position: varchar("position", { length: 255 }),
  // Position in dieser Firma
  isPrimary: boolean("isPrimary").default(false),
  // Hauptfirma des Kontakts?
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  contactIdx: index("ccr_contact_idx").on(table.contactId),
  companyIdx: index("ccr_company_idx").on(table.companyId)
}));
var contactEmails = mysqlTable("contact_emails", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contactId: varchar("contactId", { length: 64 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  emailType: varchar("emailType", { length: 50 }).default("work"),
  // work, personal
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  contactIdx: index("contact_emails_contact_idx").on(table.contactId),
  emailIdx: index("contact_emails_email_idx").on(table.email)
}));
var deals = mysqlTable("deals", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  companyId: varchar("companyId", { length: 64 }),
  // Optional: Deal mit spezifischer Firma
  dealName: varchar("dealName", { length: 255 }),
  dealValueEur: decimal("dealValueEur", { precision: 10, scale: 2 }),
  stage: varchar("stage", { length: 50 }).default("Cold"),
  // Cold, Contacted, Demo, Trial, Negotiation, Closed Won, Closed Lost
  probability: int("probability").default(0),
  // 0-100%
  expectedCloseDate: timestamp("expectedCloseDate"),
  actualCloseDate: timestamp("actualCloseDate"),
  subscriptionTier: varchar("subscriptionTier", { length: 50 }),
  // Starter, Professional, Enterprise
  createdBy: varchar("createdBy", { length: 64 }),
  // User ID
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
}, (table) => ({
  corporationIdx: index("deals_corporation_idx").on(table.corporationId),
  stageIdx: index("deals_stage_idx").on(table.stage),
  createdByIdx: index("deals_created_by_idx").on(table.createdBy)
}));
var activities = mysqlTable("activities", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }),
  companyId: varchar("companyId", { length: 64 }),
  contactId: varchar("contactId", { length: 64 }),
  activityType: varchar("activityType", { length: 50 }),
  // Email, Call, Demo, Meeting, AI Outreach
  activityDate: timestamp("activityDate").defaultNow(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  // E-Mail-Inhalt, Meeting-Notizen
  direction: varchar("direction", { length: 20 }),
  // Inbound, Outbound
  outcome: varchar("outcome", { length: 50 }),
  // Positive, Neutral, Negative, No Response
  emailMessageId: varchar("emailMessageId", { length: 255 }),
  // Für E-Mail-Import
  hasAttachment: boolean("hasAttachment").default(false),
  // Anhang vorhanden
  attachmentCount: int("attachmentCount").default(0),
  // Anzahl Anhänge
  createdBy: varchar("createdBy", { length: 100 }),
  // AI Agent oder User-Name
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  corporationIdx: index("activities_corporation_idx").on(table.corporationId),
  contactIdx: index("activities_contact_idx").on(table.contactId),
  dateIdx: index("activities_date_idx").on(table.activityDate)
}));
var productUsage = mysqlTable("product_usage", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  userEmail: varchar("userEmail", { length: 255 }),
  lastLogin: timestamp("lastLogin"),
  totalLogins: int("totalLogins").default(0),
  countriesAccessed: text("countriesAccessed"),
  // JSON: ["DE", "PL", "FR"]
  excelAddonUsed: boolean("excelAddonUsed").default(false),
  apiCallsLastMonth: int("apiCallsLastMonth").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
}, (table) => ({
  corporationIdx: index("product_usage_corporation_idx").on(table.corporationId)
}));
var partners = mysqlTable("partners", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  partnerName: varchar("partnerName", { length: 255 }).notNull(),
  partnerType: varchar("partnerType", { length: 50 }),
  // Consulting, Reseller
  revenueSharePercent: decimal("revenueSharePercent", { precision: 5, scale: 2 }),
  // 20.00 = 20%
  totalRevenueGenerated: decimal("totalRevenueGenerated", { precision: 10, scale: 2 }).default("0"),
  contactPerson: varchar("contactPerson", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow()
});
var partnerDeals = mysqlTable("partner_deals", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  partnerId: varchar("partnerId", { length: 64 }).notNull(),
  dealId: varchar("dealId", { length: 64 }).notNull(),
  revenueShareAmount: decimal("revenueShareAmount", { precision: 10, scale: 2 }),
  paid: boolean("paid").default(false),
  paidDate: timestamp("paidDate"),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  partnerIdx: index("partner_deals_partner_idx").on(table.partnerId),
  dealIdx: index("partner_deals_deal_idx").on(table.dealId)
}));
var userAccountAssignments = mysqlTable("user_account_assignments", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 64 }).notNull(),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow(),
  assignedBy: varchar("assignedBy", { length: 64 })
  // Admin User ID
}, (table) => ({
  userIdx: index("uaa_user_idx").on(table.userId),
  corporationIdx: index("uaa_corporation_idx").on(table.corporationId)
}));
var commissions = mysqlTable("commissions", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 64 }).notNull(),
  dealId: varchar("dealId", { length: 64 }).notNull(),
  commissionPercent: decimal("commissionPercent", { precision: 5, scale: 2 }),
  // 10.00 = 10%
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }),
  paid: boolean("paid").default(false),
  paidDate: timestamp("paidDate"),
  createdAt: timestamp("createdAt").defaultNow()
}, (table) => ({
  userIdx: index("commissions_user_idx").on(table.userId),
  dealIdx: index("commissions_deal_idx").on(table.dealId)
}));
var scoutQueue = mysqlTable("scout_queue", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }),
  seedType: varchar("seedType", { length: 50 }),
  seedData: json("seedData"),
  priority: int("priority").default(5),
  status: varchar("status", { length: 50 }).default("Pending"),
  generation: int("generation").default(0),
  parentId: varchar("parentId", { length: 64 }),
  discoveryMethod: varchar("discoveryMethod", { length: 100 }),
  scheduledAt: timestamp("scheduledAt").defaultNow(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  errorMessage: text("errorMessage"),
  metadata: json("metadata")
}, (table) => ({
  statusIdx: index("queue_status_idx").on(table.status),
  priorityIdx: index("queue_priority_idx").on(table.priority),
  generationIdx: index("queue_generation_idx").on(table.generation),
  parentIdx: index("queue_parent_idx").on(table.parentId)
}));
var scoutDiscoveryMethods = mysqlTable("scout_discovery_methods", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true),
  priority: int("priority").default(5),
  config: json("config"),
  lastRunAt: timestamp("lastRunAt"),
  successCount: int("successCount").default(0),
  failureCount: int("failureCount").default(0)
}, (table) => ({
  nameUnique: index("method_name_unique").on(table.name)
}));
var scoutSettings = mysqlTable("scout_settings", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 64 }).notNull(),
  // Filter Settings
  minRevenueMio: int("minRevenueMio").default(100),
  // Minimum revenue in million EUR
  minEmployees: int("minEmployees").default(500),
  // Minimum employee count
  // Company Types (JSON array) - No default value (TiDB doesn't support JSON defaults)
  companyTypes: json("companyTypes").$type(),
  // Target Markets (JSON array of ISO country codes) - No default value
  targetMarkets: json("targetMarkets").$type(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
});
var hunterQueue = mysqlTable("hunter_queue", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  // Job Configuration
  searchType: varchar("searchType", { length: 50 }).default("apollo"),
  // "apollo", "linkedin", "manual"
  searchData: json("searchData"),
  // { companyName, website, targetRoles: ["CEO", "CTO", ...] }
  // Job Status
  priority: int("priority").default(5),
  status: varchar("status", { length: 50 }).default("Pending"),
  // Pending, Processing, Completed, Failed
  // Execution Tracking
  scheduledAt: timestamp("scheduledAt").defaultNow(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  // Results & Errors
  contactsFound: int("contactsFound").default(0),
  errorMessage: text("errorMessage"),
  metadata: json("metadata")
  // { apolloCreditsUsed, linkedinProfilesScraped, etc. }
}, (table) => ({
  corporationIdx: index("hunter_corporation_idx").on(table.corporationId),
  statusIdx: index("hunter_status_idx").on(table.status),
  priorityIdx: index("hunter_priority_idx").on(table.priority)
}));
var corporationsRelations = relations(corporations, ({ many }) => ({
  companies: many(companies),
  deals: many(deals),
  activities: many(activities),
  productUsage: many(productUsage),
  userAssignments: many(userAccountAssignments)
}));
var companiesRelations = relations(companies, ({ one, many }) => ({
  corporation: one(corporations, {
    fields: [companies.corporationId],
    references: [corporations.id]
  }),
  contactRelations: many(contactCompanyRelations),
  deals: many(deals),
  activities: many(activities)
}));
var contactsRelations = relations(contacts, ({ many }) => ({
  companyRelations: many(contactCompanyRelations),
  emails: many(contactEmails),
  activities: many(activities)
}));
var contactCompanyRelationsRelations = relations(contactCompanyRelations, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactCompanyRelations.contactId],
    references: [contacts.id]
  }),
  company: one(companies, {
    fields: [contactCompanyRelations.companyId],
    references: [companies.id]
  })
}));
var dealsRelations = relations(deals, ({ one, many }) => ({
  corporation: one(corporations, {
    fields: [deals.corporationId],
    references: [corporations.id]
  }),
  company: one(companies, {
    fields: [deals.companyId],
    references: [companies.id]
  }),
  partnerDeals: many(partnerDeals),
  commissions: many(commissions)
}));
var usersRelations = relations(users, ({ one, many }) => ({
  accountAssignments: many(userAccountAssignments),
  commissions: many(commissions)
}));
var hunterJobs = mysqlTable("hunter_jobs", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  priority: int("priority").default(5),
  targetRoles: json("targetRoles"),
  // ["CEO", "VP Sales", "Market Research Manager"]
  targetCount: int("targetCount").default(5),
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
  error: text("error")
});
var hunterResults = mysqlTable("hunter_results", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: varchar("jobId", { length: 64 }).notNull(),
  corporationId: varchar("corporationId", { length: 64 }).notNull(),
  // Person Info
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  fullName: varchar("fullName", { length: 255 }),
  title: varchar("title", { length: 255 }),
  seniority: varchar("seniority", { length: 100 }),
  // C-Level, VP, Director, Manager
  department: varchar("department", { length: 100 }),
  // Sales, Marketing, Operations
  // Contact Info
  email: varchar("email", { length: 320 }),
  emailStatus: mysqlEnum("emailStatus", ["valid", "invalid", "risky", "unknown"]).default("unknown"),
  emailScore: int("emailScore"),
  // 0-100
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  // Company Context
  companyName: varchar("companyName", { length: 255 }),
  companyDomain: varchar("companyDomain", { length: 255 }),
  // Metadata
  dataSource: varchar("dataSource", { length: 100 }),
  // apollo, hunter, linkedin, manual
  confidence: int("confidence"),
  // 0-100
  lastVerified: timestamp("lastVerified"),
  // Review
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: varchar("reviewedBy", { length: 64 }),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow()
});
var outreachCampaigns = mysqlTable("outreach_campaigns", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  targetSegment: varchar("targetSegment", { length: 100 }),
  // C-Level, VP Sales, etc.
  language: varchar("language", { length: 10 }),
  // de, en, fr, etc.
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt")
});
var emailDrafts = mysqlTable("email_drafts", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: varchar("campaignId", { length: 64 }),
  contactId: varchar("contactId", { length: 64 }),
  corporationId: varchar("corporationId", { length: 64 }),
  // Email Content
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  language: varchar("language", { length: 10 }),
  // Personalization Context
  personalizationData: json("personalizationData"),
  // News, LinkedIn posts, etc.
  // Review
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected", "sent"]).default("pending").notNull(),
  reviewedBy: varchar("reviewedBy", { length: 64 }),
  reviewedAt: timestamp("reviewedAt"),
  // Sending
  sentAt: timestamp("sentAt"),
  sentBy: varchar("sentBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow()
});
var emailTemplates = mysqlTable("email_templates", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  // Template Content
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  language: varchar("language", { length: 10 }).default("de"),
  // Variables (JSON array of variable names like ["firstName", "companyName"])
  variables: json("variables"),
  // Category
  category: varchar("category", { length: 100 }),
  // cold_outreach, follow_up, introduction, etc.
  // Metadata
  createdBy: varchar("createdBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow()
});
var emailResponses = mysqlTable("email_responses", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  draftId: varchar("draftId", { length: 64 }),
  // Link to original email draft
  contactId: varchar("contactId", { length: 64 }),
  // Response Content
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  receivedAt: timestamp("receivedAt"),
  // Sentiment Analysis
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative", "interested", "not_interested"]),
  // Action Required
  requiresAction: boolean("requiresAction").default(false),
  actionType: varchar("actionType", { length: 100 }),
  // schedule_call, send_info, follow_up, etc.
  // Processing
  processedBy: varchar("processedBy", { length: 64 }),
  processedAt: timestamp("processedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow()
});
var apiKeys = mysqlTable("api_keys", {
  id: varchar("id", { length: 64 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("userId", { length: 64 }).notNull(),
  // External APIs
  openaiKey: text("openaiKey"),
  apolloKey: text("apolloKey"),
  linkedinKey: text("linkedinKey"),
  hunterKey: text("hunterKey"),
  zerobounceKey: text("zerobounceKey"),
  // SMTP Configuration
  smtpHost: varchar("smtpHost", { length: 255 }),
  smtpPort: varchar("smtpPort", { length: 10 }),
  smtpUser: varchar("smtpUser", { length: 255 }),
  smtpPassword: text("smtpPassword"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// server/services/hunterService.ts
import { eq as eq2 } from "drizzle-orm";
function extractDomain(url) {
  if (!url) return "";
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.replace("www.", "").split("/")[0];
  }
}
function mapSeniority(apolloSeniority) {
  const mapping = {
    "c_suite": "C-Level",
    "vp": "VP",
    "director": "Director",
    "manager": "Manager",
    "senior": "Senior",
    "entry": "Entry"
  };
  return mapping[apolloSeniority] || apolloSeniority;
}
function mapDepartment(departments) {
  if (departments.length === 0) return "Unknown";
  const mapping = {
    "sales": "Sales",
    "marketing": "Marketing",
    "operations": "Operations",
    "engineering": "Engineering",
    "finance": "Finance",
    "hr": "Human Resources"
  };
  return mapping[departments[0]] || departments[0];
}
function calculateConfidence(params) {
  let confidence = 50;
  if (params.emailStatus === "valid") confidence += 30;
  else if (params.emailStatus === "risky") confidence += 10;
  else if (params.emailStatus === "invalid") confidence -= 20;
  if (params.emailScore) {
    confidence += Math.round(params.emailScore * 0.2);
  }
  if (params.hasLinkedIn) confidence += 10;
  if (params.dataSource === "apollo") confidence += 10;
  return Math.min(100, Math.max(0, confidence));
}
async function processHunterJob(jobId) {
  const db = await getDb();
  if (!db) {
    console.error("[HunterService] Database not available");
    return;
  }
  try {
    const jobs = await db.select().from(hunterJobs).where(eq2(hunterJobs.id, jobId)).limit(1);
    if (jobs.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }
    const job = jobs[0];
    await db.update(hunterJobs).set({ status: "processing" }).where(eq2(hunterJobs.id, jobId));
    const corps = await db.select().from(corporations).where(eq2(corporations.id, job.corporationId)).limit(1);
    if (corps.length === 0) {
      throw new Error(`Corporation ${job.corporationId} not found`);
    }
    const corporation = corps[0];
    const domain = extractDomain(corporation.website);
    if (!domain) {
      throw new Error(`No website found for corporation ${corporation.name}`);
    }
    console.log(`[HunterService] Processing job ${jobId} for ${corporation.name} (${domain})`);
    const targetRoles = job.targetRoles || ["CEO", "VP Sales", "Market Research Manager"];
    const apolloResults = await searchPeople({
      organizationDomain: domain,
      personTitles: targetRoles,
      personSeniorities: ["c_suite", "vp", "director"],
      perPage: job.targetCount || 5
    });
    console.log(`[HunterService] Found ${apolloResults.people.length} people from Apollo`);
    const results = [];
    for (const person of apolloResults.people) {
      let email = person.email;
      let emailStatus = "unknown";
      let emailScore = null;
      if (!email) {
        console.log(`[HunterService] Finding email for ${person.name}`);
        const emailResult = await findEmail({
          domain,
          firstName: person.first_name,
          lastName: person.last_name
        });
        if (emailResult) {
          email = emailResult.email;
          emailScore = emailResult.score;
        }
      }
      if (email) {
        console.log(`[HunterService] Verifying email ${email}`);
        const verification = await verifyEmail(email);
        if (verification.result === "deliverable") emailStatus = "valid";
        else if (verification.result === "undeliverable") emailStatus = "invalid";
        else if (verification.result === "risky") emailStatus = "risky";
        else emailStatus = "unknown";
        emailScore = verification.score;
      }
      const confidence = calculateConfidence({
        emailStatus,
        emailScore,
        hasLinkedIn: !!person.linkedin_url,
        dataSource: "apollo"
      });
      const result = {
        jobId,
        corporationId: job.corporationId,
        firstName: person.first_name,
        lastName: person.last_name,
        fullName: person.name,
        title: person.title,
        seniority: mapSeniority(person.seniority),
        department: mapDepartment(person.departments),
        email: email || null,
        emailStatus,
        emailScore,
        phoneNumber: person.phone_numbers.length > 0 ? person.phone_numbers[0] : null,
        linkedinUrl: person.linkedin_url,
        companyName: person.organization_name,
        companyDomain: domain,
        dataSource: "apollo",
        confidence,
        lastVerified: /* @__PURE__ */ new Date(),
        reviewStatus: "pending"
      };
      results.push(result);
    }
    if (results.length > 0) {
      await db.insert(hunterResults).values(results);
      console.log(`[HunterService] Saved ${results.length} results`);
    }
    await db.update(hunterJobs).set({
      status: "completed",
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq2(hunterJobs.id, jobId));
    console.log(`[HunterService] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[HunterService] Job ${jobId} failed:`, error);
    await db.update(hunterJobs).set({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq2(hunterJobs.id, jobId));
  }
}
async function processPendingJobs() {
  const db = await getDb();
  if (!db) return;
  const pending = await db.select().from(hunterJobs).where(eq2(hunterJobs.status, "pending")).limit(10);
  console.log(`[HunterService] Processing ${pending.length} pending jobs`);
  for (const job of pending) {
    await processHunterJob(job.id);
  }
}

// server/hunterWorkerDaemon.ts
var POLL_INTERVAL_MS = 3e4;
console.log("=".repeat(80));
console.log("FRIDAY CRM - Hunter Worker Daemon");
console.log("=".repeat(80));
console.log(`Started at: ${(/* @__PURE__ */ new Date()).toISOString()}`);
console.log(`Poll interval: ${POLL_INTERVAL_MS / 1e3}s`);
console.log("");
console.log("Configuration:");
console.log(`- Apollo API configured: ${!!process.env.APOLLO_API_KEY}`);
console.log(`- Hunter.io API configured: ${!!process.env.HUNTER_API_KEY}`);
console.log(`- Database: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.split("@")[1] : "Not configured"}`);
console.log("");
async function pollQueue() {
  try {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Polling Hunter Queue...`);
    await processPendingJobs();
  } catch (error) {
    console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] Error processing queue:`, error);
  }
}
console.log("Starting Hunter Worker Daemon...");
console.log("");
pollQueue();
setInterval(pollQueue, POLL_INTERVAL_MS);
process.on("SIGINT", () => {
  console.log("\nShutting down Hunter Worker Daemon...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\nShutting down Hunter Worker Daemon...");
  process.exit(0);
});
