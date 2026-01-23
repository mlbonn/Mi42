// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

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
  role: mysqlEnum("role", ["admin", "sales_manager", "external_sales", "partner", "user"]).default("user").notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  // active, inactive
  partnerId: varchar("partnerId", { length: 64 }),
  // Nur für role=partner
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow()
});
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
  partner: one(partners, {
    fields: [users.partnerId],
    references: [partners.id]
  }),
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
async function getUser(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function canUserAccessCorporation(userId, corporationId) {
  const db = await getDb();
  if (!db) return false;
  const user = await getUser(userId);
  if (!user) return false;
  if (user.role === "admin" || user.role === "sales_manager") return true;
  if (user.role === "external_sales") {
    const assignment = await db.select().from(userAccountAssignments).where(
      and(
        eq(userAccountAssignments.userId, userId),
        eq(userAccountAssignments.corporationId, corporationId)
      )
    ).limit(1);
    return assignment.length > 0;
  }
  return false;
}
async function getCorporations(userId) {
  const db = await getDb();
  if (!db) return [];
  const user = await getUser(userId);
  if (!user) return [];
  if (user.role === "admin" || user.role === "sales_manager") {
    return await db.select().from(corporations).orderBy(desc(corporations.createdAt));
  }
  if (user.role === "external_sales") {
    const assignments = await db.select({ corporationId: userAccountAssignments.corporationId }).from(userAccountAssignments).where(eq(userAccountAssignments.userId, userId));
    if (assignments.length === 0) return [];
    const corpIds = assignments.map((a) => a.corporationId);
    return await db.select().from(corporations).where(inArray(corporations.id, corpIds)).orderBy(desc(corporations.createdAt));
  }
  return [];
}
async function getCorporation(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(corporations).where(eq(corporations.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createCorporation(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(corporations).values(data);
  return result;
}
async function updateCorporation(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(corporations).set(data).where(eq(corporations.id, id));
}
async function getCompaniesByCorporation(corporationId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(companies).where(eq(companies.corporationId, corporationId)).orderBy(companies.name);
}
async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(companies);
}
async function getCompany(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createCompany(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(data);
  return result;
}
async function updateCompany(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
  return await getCompany(id);
}
async function getContactsByCompany(companyId) {
  const db = await getDb();
  if (!db) return [];
  const relations2 = await db.select({
    contact: contacts,
    relation: contactCompanyRelations
  }).from(contactCompanyRelations).innerJoin(contacts, eq(contactCompanyRelations.contactId, contacts.id)).where(eq(contactCompanyRelations.companyId, companyId));
  return relations2.map((r) => ({
    ...r.contact,
    email: r.relation.email,
    position: r.relation.position,
    isPrimary: r.relation.isPrimary
  }));
}
async function getCompaniesByContact(contactId) {
  const db = await getDb();
  if (!db) return [];
  const relations2 = await db.select({
    company: companies,
    relation: contactCompanyRelations
  }).from(contactCompanyRelations).innerJoin(companies, eq(contactCompanyRelations.companyId, companies.id)).where(eq(contactCompanyRelations.contactId, contactId));
  return relations2.map((r) => ({
    ...r.company,
    email: r.relation.email,
    position: r.relation.position,
    isPrimary: r.relation.isPrimary
  }));
}
async function getContact(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createContact(contactData, companyId, email, position) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const contactResult = await db.insert(contacts).values(contactData);
  const contactId = contactResult[0].insertId.toString();
  await db.insert(contactCompanyRelations).values({
    contactId,
    companyId,
    email,
    position,
    isPrimary: true
  });
  return contactId;
}
async function updateContact(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contacts).set(data).where(eq(contacts.id, id));
  return await getContact(id);
}
async function getDealsByCorporation(corporationId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(deals).where(eq(deals.corporationId, corporationId)).orderBy(desc(deals.createdAt));
}
async function getDealsByCompany(companyId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(deals).where(eq(deals.companyId, companyId)).orderBy(desc(deals.createdAt));
}
async function getDealsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  const user = await getUser(userId);
  if (!user) return [];
  if (user.role === "admin" || user.role === "sales_manager") {
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }
  if (user.role === "external_sales") {
    return await db.select().from(deals).where(eq(deals.createdBy, userId)).orderBy(desc(deals.createdAt));
  }
  return [];
}
async function createDeal(data, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const dealData = {
    ...data,
    createdBy: userId
  };
  const result = await db.insert(deals).values(dealData);
  const dealId = result[0].insertId.toString();
  const user = await getUser(userId);
  if (user?.role === "external_sales" && data.dealValueEur) {
    const commissionPercent = 10;
    const commissionAmount = Number(data.dealValueEur) * (commissionPercent / 100);
    await db.insert(commissions).values({
      userId,
      dealId,
      commissionPercent: commissionPercent.toString(),
      commissionAmount: commissionAmount.toString(),
      paid: false
    });
  }
  return dealId;
}
async function updateDealStage(dealId, stage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deals).set({ stage }).where(eq(deals.id, dealId));
}
async function getActivitiesByCorporation(corporationId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activities).where(eq(activities.corporationId, corporationId)).orderBy(desc(activities.activityDate)).limit(limit);
}
async function getActivitiesByContact(contactId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activities).where(eq(activities.contactId, contactId)).orderBy(desc(activities.activityDate)).limit(limit);
}
async function getActivitiesByCompany(companyId, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activities).where(eq(activities.companyId, companyId)).orderBy(desc(activities.activityDate)).limit(limit);
}
async function createActivity(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(activities).values(data);
  return result;
}
async function getCommissionsByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(commissions).where(eq(commissions.userId, userId)).orderBy(desc(commissions.createdAt));
}
async function assignUserToCorporations(userId, corporationIds, assignedBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const assignments = corporationIds.map((corpId) => ({
    userId,
    corporationId: corpId,
    assignedBy
  }));
  await db.insert(userAccountAssignments).values(assignments);
}
async function getAssignedCorporations(userId) {
  const db = await getDb();
  if (!db) return [];
  const assignments = await db.select({ corporationId: userAccountAssignments.corporationId }).from(userAccountAssignments).where(eq(userAccountAssignments.userId, userId));
  if (assignments.length === 0) return [];
  const corpIds = assignments.map((a) => a.corporationId);
  return await db.select().from(corporations).where(inArray(corporations.id, corpIds));
}
async function getDashboardStats(userId) {
  const db = await getDb();
  if (!db) return null;
  const user = await getUser(userId);
  if (!user) return null;
  const corps = await getCorporations(userId);
  const totalCorporations = corps.length;
  const userDeals = await getDealsByUser(userId);
  const totalDeals = userDeals.length;
  const dealsByStage = userDeals.reduce((acc, deal) => {
    acc[deal.stage || "Unknown"] = (acc[deal.stage || "Unknown"] || 0) + 1;
    return acc;
  }, {});
  const totalDealValue = userDeals.reduce((sum, deal) => {
    return sum + (Number(deal.dealValueEur) || 0);
  }, 0);
  let totalCommission = 0;
  let paidCommission = 0;
  if (user.role === "external_sales") {
    const userCommissions = await getCommissionsByUser(userId);
    totalCommission = userCommissions.reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
    paidCommission = userCommissions.filter((c) => c.paid).reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
  }
  return {
    totalCorporations,
    totalDeals,
    dealsByStage,
    totalDealValue,
    totalCommission,
    paidCommission,
    pendingCommission: totalCommission - paidCommission
  };
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return null;
  return await db.select().from(users).where(eq(users.email, email));
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return null;
  return await db.select().from(users).where(eq(users.id, id));
}
async function createUserWithPassword(user) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role,
    lastSignedIn: user.lastSignedIn
  });
}
async function updateUserLastSignedIn(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(users.id, userId));
}
async function globalSearch(query, limit = 10) {
  const db = await getDb();
  if (!db || query.length < 2) return { corporations: [], companies: [], contacts: [] };
  const searchTerm = `%${query.toLowerCase()}%`;
  const corporationsResult = await db.select().from(corporations).where(
    sql`LOWER(${corporations.name}) LIKE ${searchTerm} 
          OR LOWER(${corporations.industry}) LIKE ${searchTerm}
          OR LOWER(${corporations.headquartersCountry}) LIKE ${searchTerm}`
  ).limit(limit);
  const companiesResult = await db.select().from(companies).where(
    sql`LOWER(${companies.name}) LIKE ${searchTerm}
          OR LOWER(${companies.city}) LIKE ${searchTerm}
          OR LOWER(${companies.country}) LIKE ${searchTerm}
          OR LOWER(${companies.products}) LIKE ${searchTerm}`
  ).limit(limit);
  const contactsResult = await db.select().from(contacts).where(
    sql`LOWER(${contacts.firstName}) LIKE ${searchTerm}
          OR LOWER(${contacts.lastName}) LIKE ${searchTerm}
          OR LOWER(${contacts.jobTitle}) LIKE ${searchTerm}`
  ).limit(limit);
  return {
    corporations: corporationsResult,
    companies: companiesResult,
    contacts: contactsResult
  };
}
async function getApiKeys(userId) {
  const db = await getDb();
  if (!db) return {};
  const result = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  if (result.length === 0) return {};
  const keys = result[0];
  return {
    openai: keys.openaiKey || "",
    apollo: keys.apolloKey || "",
    linkedin: keys.linkedinKey || "",
    hunter: keys.hunterKey || "",
    zerobounce: keys.zerobounceKey || "",
    smtp_host: keys.smtpHost || "",
    smtp_port: keys.smtpPort || "",
    smtp_user: keys.smtpUser || "",
    smtp_password: keys.smtpPassword || ""
  };
}
async function saveApiKeys(userId, keys) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).limit(1);
  const data = {
    userId,
    openaiKey: keys.openai || null,
    apolloKey: keys.apollo || null,
    linkedinKey: keys.linkedin || null,
    hunterKey: keys.hunter || null,
    zerobounceKey: keys.zerobounce || null,
    smtpHost: keys.smtp_host || null,
    smtpPort: keys.smtp_port || null,
    smtpUser: keys.smtp_user || null,
    smtpPassword: keys.smtp_password || null,
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (existing.length > 0) {
    await db.update(apiKeys).set(data).where(eq(apiKeys.userId, userId));
  } else {
    await db.insert(apiKeys).values({
      ...data,
      id: crypto.randomUUID(),
      createdAt: /* @__PURE__ */ new Date()
    });
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const isSecure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure
  };
}

// server/_core/simpleAuth.ts
import { SignJWT, jwtVerify } from "jose";
import crypto2 from "crypto";
var JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "friday-crm-default-secret-change-in-production"
);
function hashPassword(password) {
  return crypto2.createHash("sha256").update(password).digest("hex");
}
async function createSessionToken(userId, name) {
  const token = await new SignJWT({ userId, name }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("365d").sign(JWT_SECRET);
  return token;
}
async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId,
      name: payload.name
    };
  } catch {
    return null;
  }
}
function registerSimpleAuthRoutes(app) {
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    try {
      const users2 = await getUserByEmail(username);
      if (!users2 || users2.length === 0) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const user = users2[0];
      const passwordHash = hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      await updateUserLastSignedIn(user.id);
      const sessionToken = await createSessionToken(user.id, user.name || user.email || "User");
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, name } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    try {
      const existingUsers = await getUserByEmail(username);
      if (existingUsers && existingUsers.length > 0) {
        res.status(400).json({ error: "User already exists" });
        return;
      }
      const userId = crypto2.randomUUID();
      const passwordHash = hashPassword(password);
      await createUserWithPassword({
        id: userId,
        email: username,
        name: name || username,
        passwordHash,
        role: "admin",
        // First user is admin
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await createSessionToken(userId, name || username);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({
        success: true,
        user: {
          id: userId,
          name: name || username,
          email: username,
          role: "admin"
        }
      });
    } catch (error) {
      console.error("[Auth] Registration failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });
  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const session = await verifySessionToken(token);
    if (!session) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    try {
      const users2 = await getUserById(session.userId);
      if (!users2 || users2.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const user = users2[0];
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error("[Auth] Get user failed", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/scoutRouter.ts
import { z as z2 } from "zod";

// server/scoutDb.ts
import { eq as eq2, desc as desc2, and as and2, sql as sql2 } from "drizzle-orm";
async function addToScoutQueue(job) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(scoutQueue).values({ ...job, id });
  const result = await db.select().from(scoutQueue).where(eq2(scoutQueue.id, id)).limit(1);
  return result[0];
}
async function getScoutQueueJobs(filters) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(scoutQueue);
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq2(scoutQueue.status, filters.status));
  }
  if (filters?.generation !== void 0) {
    conditions.push(eq2(scoutQueue.generation, filters.generation));
  }
  if (conditions.length > 0) {
    query = query.where(and2(...conditions));
  }
  query = query.orderBy(
    scoutQueue.priority,
    scoutQueue.generation,
    scoutQueue.scheduledAt
  );
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  return await query;
}
async function deleteScoutQueueJob(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scoutQueue).where(eq2(scoutQueue.id, id));
}
async function getScoutQueueStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
  const stats = await db.select({
    status: scoutQueue.status,
    count: sql2`count(*)`
  }).from(scoutQueue).groupBy(scoutQueue.status);
  const result = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };
  stats.forEach((stat) => {
    const status = stat.status?.toLowerCase() || "";
    const count = Number(stat.count) || 0;
    result.total += count;
    if (status === "pending") result.pending = count;
    if (status === "processing") result.processing = count;
    if (status === "completed") result.completed = count;
    if (status === "failed") result.failed = count;
  });
  return result;
}
async function getDiscoveryMethods() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scoutDiscoveryMethods).orderBy(scoutDiscoveryMethods.priority);
}
async function updateDiscoveryMethod(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scoutDiscoveryMethods).set(updates).where(eq2(scoutDiscoveryMethods.id, id));
}
async function seedDiscoveryMethods() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(scoutDiscoveryMethods).limit(1);
  if (existing.length > 0) return;
  const methods = [
    {
      id: crypto.randomUUID(),
      name: "Competitor Search",
      enabled: true,
      priority: 1,
      config: JSON.stringify({
        sources: ["Google", "LinkedIn", "Crunchbase"],
        similarityThreshold: 60
      }),
      successCount: 0,
      failureCount: 0
    },
    {
      id: crypto.randomUUID(),
      name: "Association Crawl",
      enabled: true,
      priority: 2,
      config: JSON.stringify({
        associations: ["EAPA", "GIPS", "BauVerb\xE4nde"]
      }),
      successCount: 0,
      failureCount: 0
    },
    {
      id: crypto.randomUUID(),
      name: "Product Catalog Comparison",
      enabled: true,
      priority: 3,
      config: JSON.stringify({
        minProductOverlap: 0.4
      }),
      successCount: 0,
      failureCount: 0
    },
    {
      id: crypto.randomUUID(),
      name: "Shared Customer Analysis",
      enabled: true,
      priority: 4,
      config: JSON.stringify({
        minSharedCustomers: 3
      }),
      successCount: 0,
      failureCount: 0
    },
    {
      id: crypto.randomUUID(),
      name: "Press Monitoring",
      enabled: true,
      priority: 5,
      config: JSON.stringify({
        sources: ["Construction News", "Building Material News"],
        keywords: ["expansion", "new factory", "acquisition"]
      }),
      successCount: 0,
      failureCount: 0
    }
  ];
  await db.insert(scoutDiscoveryMethods).values(methods);
}
async function getScoutSuggestions(filters) {
  const db = await getDb();
  if (!db) return [];
  let conditions = [eq2(corporations.scoutStatus, "Pending")];
  if (filters?.generation !== void 0) {
    conditions.push(eq2(corporations.scoutGeneration, filters.generation));
  }
  let query = db.select().from(corporations).where(and2(...conditions));
  if (filters?.limit) {
    return await query.orderBy(desc2(corporations.discoveredAt)).limit(filters.limit);
  }
  return await query.orderBy(desc2(corporations.discoveredAt));
}
async function approveScoutSuggestion(corporationId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(corporations).set({
    scoutStatus: "Approved",
    status: "Target"
  }).where(eq2(corporations.id, corporationId));
  const corp = await db.select().from(corporations).where(eq2(corporations.id, corporationId)).limit(1);
  if (corp.length > 0) {
    await addToScoutQueue({
      corporationId: corp[0].id,
      seedType: "approved_suggestion",
      seedData: JSON.stringify({ name: corp[0].name, website: corp[0].website }),
      priority: 5,
      status: "Pending",
      generation: (corp[0].scoutGeneration || 0) + 1,
      parentId: corp[0].scoutParentId || null,
      discoveryMethod: null
    });
  }
}
async function rejectScoutSuggestion(corporationId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(corporations).set({
    scoutStatus: "Rejected"
  }).where(eq2(corporations.id, corporationId));
}
async function getScoutGenerationStats() {
  const db = await getDb();
  if (!db) return [];
  const stats = await db.select({
    generation: corporations.scoutGeneration,
    count: sql2`count(*)`,
    approved: sql2`sum(case when scout_status = 'Approved' then 1 else 0 end)`,
    pending: sql2`sum(case when scout_status = 'Pending' then 1 else 0 end)`,
    rejected: sql2`sum(case when scout_status = 'Rejected' then 1 else 0 end)`
  }).from(corporations).groupBy(corporations.scoutGeneration).orderBy(corporations.scoutGeneration);
  return stats.map((s) => ({
    generation: s.generation || 0,
    count: Number(s.count) || 0,
    approved: Number(s.approved) || 0,
    pending: Number(s.pending) || 0,
    rejected: Number(s.rejected) || 0
  }));
}

// server/scoutRouter.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "sales_manager") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
var scoutRouter = router({
  // ============================================================================
  // SCOUT QUEUE
  // ============================================================================
  addToQueue: adminProcedure2.input(
    z2.object({
      seedType: z2.string(),
      seedData: z2.any(),
      priority: z2.number().optional(),
      generation: z2.number().optional(),
      parentId: z2.string().optional()
    })
  ).mutation(async ({ input }) => {
    return await addToScoutQueue({
      seedType: input.seedType,
      seedData: input.seedData,
      priority: input.priority || 5,
      status: "Pending",
      generation: input.generation || 0,
      parentId: input.parentId || null,
      discoveryMethod: null
    });
  }),
  getQueueJobs: adminProcedure2.input(
    z2.object({
      status: z2.string().optional(),
      generation: z2.number().optional(),
      limit: z2.number().optional()
    }).optional()
  ).query(async ({ input }) => {
    return await getScoutQueueJobs(input);
  }),
  getQueueStats: adminProcedure2.query(async () => {
    return await getScoutQueueStats();
  }),
  deleteQueueJob: adminProcedure2.input(z2.object({ id: z2.string() })).mutation(async ({ input }) => {
    await deleteScoutQueueJob(input.id);
    return { success: true };
  }),
  // ============================================================================
  // DISCOVERY METHODS
  // ============================================================================
  getDiscoveryMethods: adminProcedure2.query(async () => {
    return await getDiscoveryMethods();
  }),
  updateDiscoveryMethod: adminProcedure2.input(
    z2.object({
      id: z2.string(),
      enabled: z2.boolean().optional(),
      priority: z2.number().optional(),
      config: z2.any().optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...updates } = input;
    await updateDiscoveryMethod(id, updates);
    return { success: true };
  }),
  seedDiscoveryMethods: adminProcedure2.mutation(async () => {
    await seedDiscoveryMethods();
    return { success: true };
  }),
  // ============================================================================
  // SUGGESTIONS
  // ============================================================================
  getSuggestions: protectedProcedure.input(
    z2.object({
      generation: z2.number().optional(),
      limit: z2.number().optional()
    }).optional()
  ).query(async ({ input }) => {
    return await getScoutSuggestions(input);
  }),
  approveSuggestion: adminProcedure2.input(z2.object({ corporationId: z2.string() })).mutation(async ({ input }) => {
    await approveScoutSuggestion(input.corporationId);
    return { success: true };
  }),
  rejectSuggestion: adminProcedure2.input(z2.object({ corporationId: z2.string() })).mutation(async ({ input }) => {
    await rejectScoutSuggestion(input.corporationId);
    return { success: true };
  }),
  bulkApprove: adminProcedure2.input(z2.object({ corporationIds: z2.array(z2.string()) })).mutation(async ({ input }) => {
    for (const id of input.corporationIds) {
      await approveScoutSuggestion(id);
    }
    return { success: true, count: input.corporationIds.length };
  }),
  bulkReject: adminProcedure2.input(z2.object({ corporationIds: z2.array(z2.string()) })).mutation(async ({ input }) => {
    for (const id of input.corporationIds) {
      await rejectScoutSuggestion(id);
    }
    return { success: true, count: input.corporationIds.length };
  }),
  // ============================================================================
  // STATISTICS
  // ============================================================================
  getGenerationStats: protectedProcedure.query(async () => {
    return await getScoutGenerationStats();
  })
});

// server/hunterRouter.ts
import { z as z3 } from "zod";

// server/hunterDb.ts
import { eq as eq3, desc as desc3 } from "drizzle-orm";
async function createHunterJob(job) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = job.id || crypto.randomUUID();
  await db.insert(hunterJobs).values({ ...job, id });
  return id;
}
async function getHunterJob(id) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(hunterJobs).where(eq3(hunterJobs.id, id)).limit(1);
  return results.length > 0 ? results[0] : null;
}
async function getAllHunterJobs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterJobs).orderBy(desc3(hunterJobs.createdAt));
}
async function getHunterJobsByCorporation(corporationId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterJobs).where(eq3(hunterJobs.corporationId, corporationId)).orderBy(desc3(hunterJobs.createdAt));
}
async function getHunterResult(id) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(hunterResults).where(eq3(hunterResults.id, id)).limit(1);
  return results.length > 0 ? results[0] : null;
}
async function getHunterResultsByJob(jobId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterResults).where(eq3(hunterResults.jobId, jobId)).orderBy(desc3(hunterResults.confidence));
}
async function getHunterResultsByCorporation(corporationId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterResults).where(eq3(hunterResults.corporationId, corporationId)).orderBy(desc3(hunterResults.confidence));
}
async function getPendingHunterResults() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterResults).where(eq3(hunterResults.reviewStatus, "pending")).orderBy(desc3(hunterResults.confidence));
}
async function updateHunterResult(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hunterResults).set(updates).where(eq3(hunterResults.id, id));
}
async function bulkUpdateHunterResults(ids, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const id of ids) {
    await db.update(hunterResults).set(updates).where(eq3(hunterResults.id, id));
  }
}
async function createContactFromHunterResult(resultId, userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await getHunterResult(resultId);
  if (!result) throw new Error(`Hunter result ${resultId} not found`);
  const contactId = crypto.randomUUID();
  await db.insert(contacts).values({
    id: contactId,
    firstName: result.firstName || "",
    lastName: result.lastName || "",
    jobTitle: result.title || "",
    function: result.department || "",
    phoneBusiness: result.phoneNumber || "",
    linkedinUrl: result.linkedinUrl || "",
    notes: `Imported from Hunter Agent (Job ${result.jobId}, Confidence: ${result.confidence}%)`,
    createdAt: /* @__PURE__ */ new Date()
  });
  if (result.email) {
    await db.insert(contactEmails).values({
      id: crypto.randomUUID(),
      contactId,
      email: result.email,
      emailType: "work",
      isPrimary: true,
      createdAt: /* @__PURE__ */ new Date()
    });
  }
  await updateHunterResult(resultId, {
    reviewStatus: "approved",
    reviewedBy: userId,
    reviewedAt: /* @__PURE__ */ new Date()
  });
  return contactId;
}
async function getHunterStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalJobs: 0,
      pendingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalResults: 0,
      pendingReview: 0,
      approvedResults: 0,
      rejectedResults: 0
    };
  }
  const allJobs = await db.select().from(hunterJobs);
  const allResults = await db.select().from(hunterResults);
  return {
    totalJobs: allJobs.length,
    pendingJobs: allJobs.filter((j) => j.status === "pending").length,
    completedJobs: allJobs.filter((j) => j.status === "completed").length,
    failedJobs: allJobs.filter((j) => j.status === "failed").length,
    totalResults: allResults.length,
    pendingReview: allResults.filter((r) => r.reviewStatus === "pending").length,
    approvedResults: allResults.filter((r) => r.reviewStatus === "approved").length,
    rejectedResults: allResults.filter((r) => r.reviewStatus === "rejected").length
  };
}

// server/integrations/apollo.ts
async function searchPeople(params) {
  await new Promise((resolve) => setTimeout(resolve, 1e3));
  const mockPeople = {
    "saint-gobain.com": [
      {
        id: "apollo_sg_001",
        first_name: "Marie",
        last_name: "Dubois",
        name: "Marie Dubois",
        title: "VP Sales EMEA",
        email: "marie.dubois@saint-gobain.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/mariedubois",
        phone_numbers: ["+33 1 47 62 30 00"],
        organization_name: "Saint-Gobain",
        seniority: "vp",
        departments: ["sales"]
      },
      {
        id: "apollo_sg_002",
        first_name: "Pierre",
        last_name: "Martin",
        name: "Pierre Martin",
        title: "Head of Market Research",
        email: "pierre.martin@saint-gobain.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/pierremartin",
        phone_numbers: [],
        organization_name: "Saint-Gobain",
        seniority: "director",
        departments: ["marketing"]
      },
      {
        id: "apollo_sg_003",
        first_name: "Sophie",
        last_name: "Laurent",
        name: "Sophie Laurent",
        title: "Chief Innovation Officer",
        email: null,
        email_status: "unavailable",
        linkedin_url: "https://linkedin.com/in/sophielaurent",
        phone_numbers: [],
        organization_name: "Saint-Gobain",
        seniority: "c_suite",
        departments: ["operations"]
      }
    ],
    "knauf.com": [
      {
        id: "apollo_kn_001",
        first_name: "Hans",
        last_name: "M\xFCller",
        name: "Hans M\xFCller",
        title: "VP Sales Central Europe",
        email: "hans.mueller@knauf.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/hansmueller",
        phone_numbers: ["+49 9323 31 0"],
        organization_name: "Knauf",
        seniority: "vp",
        departments: ["sales"]
      },
      {
        id: "apollo_kn_002",
        first_name: "Anna",
        last_name: "Schmidt",
        name: "Anna Schmidt",
        title: "Director Market Intelligence",
        email: "anna.schmidt@knauf.com",
        email_status: "guessed",
        linkedin_url: "https://linkedin.com/in/annaschmidt",
        phone_numbers: [],
        organization_name: "Knauf",
        seniority: "director",
        departments: ["marketing"]
      }
    ],
    "rockwool.com": [
      {
        id: "apollo_rw_001",
        first_name: "Lars",
        last_name: "Jensen",
        name: "Lars Jensen",
        title: "VP Sales Nordics",
        email: "lars.jensen@rockwool.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/larsjensen",
        phone_numbers: ["+45 46 56 03 00"],
        organization_name: "ROCKWOOL",
        seniority: "vp",
        departments: ["sales"]
      }
    ]
  };
  const domain = params.organizationDomain.toLowerCase();
  const people = mockPeople[domain] || [];
  let filtered = people;
  if (params.personTitles && params.personTitles.length > 0) {
    filtered = people.filter(
      (p) => params.personTitles.some(
        (title) => p.title.toLowerCase().includes(title.toLowerCase())
      )
    );
  }
  if (params.personSeniorities && params.personSeniorities.length > 0) {
    filtered = filtered.filter(
      (p) => params.personSeniorities.some(
        (seniority) => p.seniority === seniority.toLowerCase().replace(" ", "_")
      )
    );
  }
  return {
    people: filtered,
    pagination: {
      total: filtered.length,
      page: params.page || 1,
      per_page: params.perPage || 10
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

// server/services/hunterService.ts
import { eq as eq4 } from "drizzle-orm";
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
    const jobs = await db.select().from(hunterJobs).where(eq4(hunterJobs.id, jobId)).limit(1);
    if (jobs.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }
    const job = jobs[0];
    await db.update(hunterJobs).set({ status: "processing" }).where(eq4(hunterJobs.id, jobId));
    const corps = await db.select().from(corporations).where(eq4(corporations.id, job.corporationId)).limit(1);
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
    }).where(eq4(hunterJobs.id, jobId));
    console.log(`[HunterService] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[HunterService] Job ${jobId} failed:`, error);
    await db.update(hunterJobs).set({
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq4(hunterJobs.id, jobId));
  }
}

// server/hunterRouter.ts
var hunterRouter = router({
  // ============================================================================
  // JOBS
  // ============================================================================
  createJob: protectedProcedure.input(z3.object({
    corporationId: z3.string(),
    targetRoles: z3.array(z3.string()).optional(),
    targetCount: z3.number().default(5),
    priority: z3.number().default(5)
  })).mutation(async ({ input }) => {
    const jobId = await createHunterJob({
      corporationId: input.corporationId,
      targetRoles: input.targetRoles || ["CEO", "VP Sales", "Market Research Manager"],
      targetCount: input.targetCount,
      priority: input.priority,
      status: "pending"
    });
    processHunterJob(jobId).catch((err) => {
      console.error(`[HunterRouter] Failed to process job ${jobId}:`, err);
    });
    return { jobId };
  }),
  getJob: protectedProcedure.input(z3.object({ jobId: z3.string() })).query(async ({ input }) => {
    return await getHunterJob(input.jobId);
  }),
  listJobs: protectedProcedure.query(async () => {
    return await getAllHunterJobs();
  }),
  getJobsByCorporation: protectedProcedure.input(z3.object({ corporationId: z3.string() })).query(async ({ input }) => {
    return await getHunterJobsByCorporation(input.corporationId);
  }),
  // ============================================================================
  // RESULTS
  // ============================================================================
  getResult: protectedProcedure.input(z3.object({ resultId: z3.string() })).query(async ({ input }) => {
    return await getHunterResult(input.resultId);
  }),
  getResultsByJob: protectedProcedure.input(z3.object({ jobId: z3.string() })).query(async ({ input }) => {
    return await getHunterResultsByJob(input.jobId);
  }),
  getResultsByCorporation: protectedProcedure.input(z3.object({ corporationId: z3.string() })).query(async ({ input }) => {
    return await getHunterResultsByCorporation(input.corporationId);
  }),
  getPendingResults: protectedProcedure.query(async () => {
    return await getPendingHunterResults();
  }),
  // ============================================================================
  // REVIEW
  // ============================================================================
  reviewResult: protectedProcedure.input(z3.object({
    resultId: z3.string(),
    action: z3.enum(["approve", "reject"])
  })).mutation(async ({ input, ctx }) => {
    if (input.action === "approve") {
      const contactId = await createContactFromHunterResult(input.resultId, ctx.user.id);
      return { success: true, contactId };
    } else {
      await updateHunterResult(input.resultId, {
        reviewStatus: "rejected",
        reviewedBy: ctx.user.id,
        reviewedAt: /* @__PURE__ */ new Date()
      });
      return { success: true };
    }
  }),
  bulkReview: protectedProcedure.input(z3.object({
    resultIds: z3.array(z3.string()),
    action: z3.enum(["approve", "reject"])
  })).mutation(async ({ input, ctx }) => {
    if (input.action === "approve") {
      const contactIds = [];
      for (const resultId of input.resultIds) {
        const contactId = await createContactFromHunterResult(resultId, ctx.user.id);
        contactIds.push(contactId);
      }
      return { success: true, contactIds };
    } else {
      await bulkUpdateHunterResults(input.resultIds, {
        reviewStatus: "rejected",
        reviewedBy: ctx.user.id,
        reviewedAt: /* @__PURE__ */ new Date()
      });
      return { success: true };
    }
  }),
  // ============================================================================
  // STATISTICS
  // ============================================================================
  getStats: protectedProcedure.query(async () => {
    return await getHunterStats();
  })
});

// server/outreachRouter.ts
import { z as z4 } from "zod";

// server/outreachDb.ts
import { eq as eq5, desc as desc4 } from "drizzle-orm";
async function createCampaign(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(outreachCampaigns).values({ ...data, id });
  return id;
}
async function getCampaign(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(outreachCampaigns).where(eq5(outreachCampaigns.id, id)).limit(1);
  return result[0];
}
async function getAllCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(outreachCampaigns).orderBy(desc4(outreachCampaigns.createdAt));
}
async function updateCampaign(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(outreachCampaigns).set(data).where(eq5(outreachCampaigns.id, id));
}
async function createEmailDraft(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(emailDrafts).values({ ...data, id });
  return id;
}
async function getEmailDraft(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(emailDrafts).where(eq5(emailDrafts.id, id)).limit(1);
  return result[0];
}
async function getEmailDraftsByCampaign(campaignId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailDrafts).where(eq5(emailDrafts.campaignId, campaignId)).orderBy(desc4(emailDrafts.createdAt));
}
async function getPendingEmailDrafts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailDrafts).where(eq5(emailDrafts.reviewStatus, "pending")).orderBy(desc4(emailDrafts.createdAt));
}
async function getApprovedEmailDrafts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailDrafts).where(eq5(emailDrafts.reviewStatus, "approved")).orderBy(desc4(emailDrafts.createdAt));
}
async function getSentEmails() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(emailDrafts).where(eq5(emailDrafts.reviewStatus, "sent")).orderBy(desc4(emailDrafts.sentAt));
}
async function updateEmailDraft(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailDrafts).set(data).where(eq5(emailDrafts.id, id));
}
async function bulkUpdateEmailDrafts(ids, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const id of ids) {
    await db.update(emailDrafts).set(data).where(eq5(emailDrafts.id, id));
  }
}
async function getOutreachStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalDrafts: 0,
      pendingReview: 0,
      sentEmails: 0
    };
  }
  const [campaigns, drafts, pending, sent] = await Promise.all([
    db.select().from(outreachCampaigns),
    db.select().from(emailDrafts),
    db.select().from(emailDrafts).where(eq5(emailDrafts.reviewStatus, "pending")),
    db.select().from(emailDrafts).where(eq5(emailDrafts.reviewStatus, "sent"))
  ]);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  return {
    totalCampaigns: campaigns.length,
    activeCampaigns,
    totalDrafts: drafts.length,
    pendingReview: pending.length,
    sentEmails: sent.length
  };
}

// server/services/outreachService.ts
async function fetchCorporationNews(corporationName) {
  const mockNews = [
    {
      title: `${corporationName} announces Q4 2024 results with 12% growth`,
      snippet: "Strong performance in European markets drives revenue increase...",
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1e3),
      source: "Reuters",
      url: "https://example.com/news1"
    },
    {
      title: `${corporationName} expands sustainability initiatives`,
      snippet: "New carbon-neutral production facility opens in Germany...",
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3),
      source: "Bloomberg",
      url: "https://example.com/news2"
    }
  ];
  return mockNews.slice(0, 2);
}
async function fetchLinkedInPosts(linkedinUrl) {
  const mockPosts = [
    {
      text: "Excited to announce our new innovation hub in Munich! Join us in shaping the future of sustainable building materials.",
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3),
      likes: 342,
      comments: 28
    },
    {
      text: "Our team at the European Construction Summit discussing digital transformation in the industry.",
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3),
      likes: 189,
      comments: 15
    }
  ];
  return mockPosts.slice(0, 2);
}
async function generatePersonalizedEmail(context) {
  const { corporationName, contactName, contactTitle, language, news, linkedinPosts } = context;
  const templates = {
    de: {
      subject: `Exklusive Einladung: Webinar zu Marktintelligenz f\xFCr ${corporationName}`,
      body: `Sehr geehrte/r ${contactName},

ich habe mit gro\xDFem Interesse Ihre j\xFCngsten Erfolge bei ${corporationName} verfolgt${news && news.length > 0 ? `, insbesondere ${news[0].title.toLowerCase()}` : ""}.

Als ${contactTitle} wissen Sie, wie wichtig fundierte Marktdaten f\xFCr strategische Entscheidungen sind. Unser Global Building Monitor bietet Ihnen Zugang zu weltweiten Bauprojektdaten in Echtzeit \u2013 eine Ressource, die f\xFChrende Unternehmen wie Ihre Wettbewerber bereits nutzen.

Ich m\xF6chte Sie zu einem exklusiven 30-min\xFCtigen Webinar einladen, in dem wir Ihnen zeigen:
\u2022 Wie Sie neue Absatzm\xE4rkte identifizieren
\u2022 Welche Wettbewerber in Ihren Zielm\xE4rkten aktiv sind
\u2022 Wie Sie Vertriebschancen fr\xFChzeitig erkennen

H\xE4tten Sie n\xE4chste Woche Zeit f\xFCr ein kurzes Gespr\xE4ch?

Mit freundlichen Gr\xFC\xDFen`
    },
    en: {
      subject: `Exclusive Invitation: Market Intelligence Webinar for ${corporationName}`,
      body: `Dear ${contactName},

I've been following ${corporationName}'s recent achievements with great interest${news && news.length > 0 ? `, particularly ${news[0].title.toLowerCase()}` : ""}.

As ${contactTitle}, you understand the importance of solid market data for strategic decisions. Our Global Building Monitor provides access to real-time construction project data worldwide \u2013 a resource already used by leading companies including your competitors.

I'd like to invite you to an exclusive 30-minute webinar where we'll show you:
\u2022 How to identify new sales markets
\u2022 Which competitors are active in your target markets
\u2022 How to spot sales opportunities early

Would you have time for a brief conversation next week?

Best regards`
    },
    fr: {
      subject: `Invitation exclusive: Webinaire sur l'intelligence de march\xE9 pour ${corporationName}`,
      body: `Cher/Ch\xE8re ${contactName},

J'ai suivi avec grand int\xE9r\xEAt les r\xE9cents succ\xE8s de ${corporationName}${news && news.length > 0 ? `, notamment ${news[0].title.toLowerCase()}` : ""}.

En tant que ${contactTitle}, vous savez combien des donn\xE9es de march\xE9 solides sont importantes pour les d\xE9cisions strat\xE9giques. Notre Global Building Monitor vous donne acc\xE8s aux donn\xE9es de projets de construction en temps r\xE9el dans le monde entier \u2013 une ressource d\xE9j\xE0 utilis\xE9e par des entreprises leaders, y compris vos concurrents.

Je souhaite vous inviter \xE0 un webinaire exclusif de 30 minutes o\xF9 nous vous montrerons:
\u2022 Comment identifier de nouveaux march\xE9s de vente
\u2022 Quels concurrents sont actifs dans vos march\xE9s cibles
\u2022 Comment rep\xE9rer les opportunit\xE9s de vente t\xF4t

Auriez-vous du temps pour une br\xE8ve conversation la semaine prochaine?

Cordialement`
    }
  };
  const template = templates[language] || templates.en;
  return {
    subject: template.subject,
    body: template.body
  };
}
async function processCampaign(campaignId, contactIds) {
  console.log(`[OutreachService] Processing campaign ${campaignId} with ${contactIds.length} contacts`);
  for (const contactId of contactIds) {
    try {
      const mockEmail = await generatePersonalizedEmail({
        corporationName: "Saint-Gobain",
        contactName: "Marie Dubois",
        contactTitle: "VP Sales EMEA",
        language: "fr",
        news: await fetchCorporationNews("Saint-Gobain"),
        linkedinPosts: []
      });
      await createEmailDraft({
        campaignId,
        contactId,
        corporationId: "mock-corp-id",
        subject: mockEmail.subject,
        body: mockEmail.body,
        language: "fr",
        personalizationData: {
          news: await fetchCorporationNews("Saint-Gobain"),
          linkedinPosts: []
        },
        reviewStatus: "pending"
      });
      console.log(`[OutreachService] Created email draft for contact ${contactId}`);
    } catch (error) {
      console.error(`[OutreachService] Failed to create email draft for contact ${contactId}:`, error);
    }
  }
  console.log(`[OutreachService] Campaign ${campaignId} processing completed`);
}
async function generateEmailForContact(campaignId, contactId, corporationId, language) {
  console.log(`[OutreachService] Generating email for contact ${contactId}`);
  const corporation = await getCorporation(corporationId);
  if (!corporation) {
    throw new Error("Corporation not found");
  }
  const news = await fetchCorporationNews(corporation.name);
  const linkedinPosts = corporation.linkedinUrl ? await fetchLinkedInPosts(corporation.linkedinUrl) : [];
  const email = await generatePersonalizedEmail({
    corporationName: corporation.name,
    contactName: "Contact Name",
    // In production, fetch from contact
    contactTitle: "VP Sales",
    // In production, fetch from contact
    language,
    news,
    linkedinPosts,
    targetMarkets: corporation.targetMarkets || void 0,
    products: corporation.products || void 0
  });
  const draftId = await createEmailDraft({
    campaignId,
    contactId,
    corporationId,
    subject: email.subject,
    body: email.body,
    language,
    personalizationData: {
      news,
      linkedinPosts
    },
    reviewStatus: "pending"
  });
  return draftId;
}

// server/outreachRouter.ts
var outreachRouter = router({
  // ============================================================================
  // CAMPAIGNS
  // ============================================================================
  createCampaign: protectedProcedure.input(
    z4.object({
      name: z4.string(),
      description: z4.string().optional(),
      targetSegment: z4.string().optional(),
      language: z4.string().default("en")
    })
  ).mutation(async ({ input, ctx }) => {
    const campaignId = await createCampaign({
      name: input.name,
      description: input.description,
      targetSegment: input.targetSegment,
      language: input.language,
      status: "draft",
      createdBy: ctx.user.id
    });
    return { campaignId };
  }),
  getCampaign: protectedProcedure.input(z4.object({ campaignId: z4.string() })).query(async ({ input }) => {
    return await getCampaign(input.campaignId);
  }),
  listCampaigns: protectedProcedure.query(async () => {
    return await getAllCampaigns();
  }),
  updateCampaign: protectedProcedure.input(
    z4.object({
      campaignId: z4.string(),
      name: z4.string().optional(),
      description: z4.string().optional(),
      status: z4.enum(["draft", "active", "paused", "completed"]).optional()
    })
  ).mutation(async ({ input }) => {
    const { campaignId, ...data } = input;
    await updateCampaign(campaignId, data);
    return { success: true };
  }),
  startCampaign: protectedProcedure.input(
    z4.object({
      campaignId: z4.string(),
      contactIds: z4.array(z4.string())
    })
  ).mutation(async ({ input }) => {
    await updateCampaign(input.campaignId, {
      status: "active",
      startedAt: /* @__PURE__ */ new Date()
    });
    processCampaign(input.campaignId, input.contactIds).catch((err) => {
      console.error(`[OutreachRouter] Failed to process campaign ${input.campaignId}:`, err);
    });
    return { success: true };
  }),
  // ============================================================================
  // EMAIL DRAFTS
  // ============================================================================
  generateEmail: protectedProcedure.input(
    z4.object({
      campaignId: z4.string(),
      contactId: z4.string(),
      corporationId: z4.string(),
      language: z4.string().default("en")
    })
  ).mutation(async ({ input }) => {
    const draftId = await generateEmailForContact(
      input.campaignId,
      input.contactId,
      input.corporationId,
      input.language
    );
    return { draftId };
  }),
  getEmailDraft: protectedProcedure.input(z4.object({ draftId: z4.string() })).query(async ({ input }) => {
    return await getEmailDraft(input.draftId);
  }),
  getDraftsByCampaign: protectedProcedure.input(z4.object({ campaignId: z4.string() })).query(async ({ input }) => {
    return await getEmailDraftsByCampaign(input.campaignId);
  }),
  getPendingDrafts: protectedProcedure.query(async () => {
    return await getPendingEmailDrafts();
  }),
  getApprovedDrafts: protectedProcedure.query(async () => {
    return await getApprovedEmailDrafts();
  }),
  getSentEmails: protectedProcedure.query(async () => {
    return await getSentEmails();
  }),
  // ============================================================================
  // REVIEW
  // ============================================================================
  reviewDraft: protectedProcedure.input(
    z4.object({
      draftId: z4.string(),
      action: z4.enum(["approve", "reject"])
    })
  ).mutation(async ({ input, ctx }) => {
    if (input.action === "approve") {
      await updateEmailDraft(input.draftId, {
        reviewStatus: "approved",
        reviewedBy: ctx.user.id,
        reviewedAt: /* @__PURE__ */ new Date()
      });
    } else {
      await updateEmailDraft(input.draftId, {
        reviewStatus: "rejected",
        reviewedBy: ctx.user.id,
        reviewedAt: /* @__PURE__ */ new Date()
      });
    }
    return { success: true };
  }),
  bulkReview: protectedProcedure.input(
    z4.object({
      draftIds: z4.array(z4.string()),
      action: z4.enum(["approve", "reject"])
    })
  ).mutation(async ({ input, ctx }) => {
    await bulkUpdateEmailDrafts(input.draftIds, {
      reviewStatus: input.action === "approve" ? "approved" : "rejected",
      reviewedBy: ctx.user.id,
      reviewedAt: /* @__PURE__ */ new Date()
    });
    return { success: true };
  }),
  updateDraft: protectedProcedure.input(
    z4.object({
      draftId: z4.string(),
      subject: z4.string().optional(),
      body: z4.string().optional()
    })
  ).mutation(async ({ input }) => {
    const { draftId, ...data } = input;
    await updateEmailDraft(draftId, data);
    return { success: true };
  }),
  // ============================================================================
  // SENDING
  // ============================================================================
  sendEmail: protectedProcedure.input(
    z4.object({
      draftId: z4.string()
    })
  ).mutation(async ({ input, ctx }) => {
    console.log(`[OutreachRouter] Sending email ${input.draftId}`);
    await updateEmailDraft(input.draftId, {
      reviewStatus: "sent",
      sentAt: /* @__PURE__ */ new Date(),
      sentBy: ctx.user.id
    });
    return { success: true };
  }),
  bulkSend: protectedProcedure.input(
    z4.object({
      draftIds: z4.array(z4.string())
    })
  ).mutation(async ({ input, ctx }) => {
    console.log(`[OutreachRouter] Sending ${input.draftIds.length} emails`);
    await bulkUpdateEmailDrafts(input.draftIds, {
      reviewStatus: "sent",
      sentAt: /* @__PURE__ */ new Date(),
      sentBy: ctx.user.id
    });
    return { success: true };
  }),
  // ============================================================================
  // STATISTICS
  // ============================================================================
  getStats: protectedProcedure.query(async () => {
    return await getOutreachStats();
  })
});

// server/authRouter.ts
var authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    const users2 = await getUserById(ctx.user.id);
    if (!users2 || users2.length === 0) {
      return null;
    }
    const user = users2[0];
    return {
      id: user.id,
      name: user.name || user.email || "User",
      email: user.email,
      role: user.role
    };
  }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie("app_session_id", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/"
    });
    return { success: true };
  })
});

// server/settingsRouter.ts
import { z as z5 } from "zod";
var settingsRouter = router({
  // Get all API keys for current user
  getApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await getApiKeys(ctx.user.id);
    return keys;
  }),
  // Save API keys
  saveApiKeys: protectedProcedure.input(
    z5.object({
      openai: z5.string().optional(),
      apollo: z5.string().optional(),
      linkedin: z5.string().optional(),
      hunter: z5.string().optional(),
      zerobounce: z5.string().optional(),
      smtp_host: z5.string().optional(),
      smtp_port: z5.string().optional(),
      smtp_user: z5.string().optional(),
      smtp_password: z5.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    await saveApiKeys(ctx.user.id, input);
    return { success: true };
  }),
  // Test API key
  testApiKey: protectedProcedure.input(
    z5.object({
      service: z5.string(),
      key: z5.string()
    })
  ).mutation(async ({ input }) => {
    try {
      switch (input.service) {
        case "openai":
          const openaiResponse = await fetch("https://api.openai.com/v1/models", {
            headers: {
              Authorization: `Bearer ${input.key}`
            }
          });
          if (!openaiResponse.ok) {
            return { success: false, error: "Invalid OpenAI API key" };
          }
          return { success: true };
        case "apollo":
          const apolloResponse = await fetch("https://api.apollo.io/v1/auth/health", {
            headers: {
              "X-Api-Key": input.key
            }
          });
          if (!apolloResponse.ok) {
            return { success: false, error: "Invalid Apollo.io API key" };
          }
          return { success: true };
        case "hunter":
          const hunterResponse = await fetch(
            `https://api.hunter.io/v2/account?api_key=${input.key}`
          );
          if (!hunterResponse.ok) {
            return { success: false, error: "Invalid Hunter.io API key" };
          }
          return { success: true };
        case "zerobounce":
          const zerobounceResponse = await fetch(
            `https://api.zerobounce.net/v2/getcredits?api_key=${input.key}`
          );
          if (!zerobounceResponse.ok) {
            return { success: false, error: "Invalid ZeroBounce API key" };
          }
          return { success: true };
        case "smtp":
          return { success: true, message: "SMTP test not yet implemented" };
        default:
          return { success: false, error: "Unknown service" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  })
});

// server/routers.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z6 } from "zod";
var adminProcedure3 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError4({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
var salesProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "sales_manager", "external_sales"].includes(ctx.user.role)) {
    throw new TRPCError4({ code: "FORBIDDEN", message: "Sales access required" });
  }
  return next({ ctx });
});
var appRouter = router({
  system: systemRouter,
  scout: scoutRouter,
  hunter: hunterRouter,
  outreach: outreachRouter,
  auth: authRouter,
  settings: settingsRouter,
  // ==========================================================================
  // CORPORATIONS
  // ==========================================================================
  corporations: router({
    list: salesProcedure.query(async ({ ctx }) => {
      return await getCorporations(ctx.user.id);
    }),
    get: salesProcedure.input(z6.object({ id: z6.string() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.id);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getCorporation(input.id);
    }),
    create: salesProcedure.input(z6.object({
      name: z6.string(),
      headquartersCountry: z6.string().optional(),
      totalRevenueEur: z6.number().optional(),
      industry: z6.string().optional(),
      website: z6.string().optional(),
      linkedinUrl: z6.string().optional(),
      status: z6.string().optional(),
      priority: z6.string().optional(),
      notes: z6.string().optional()
    })).mutation(async ({ input }) => {
      const corpData = {
        name: input.name,
        headquartersCountry: input.headquartersCountry || null,
        totalRevenueEur: input.totalRevenueEur || null,
        industry: input.industry || null,
        website: input.website || null,
        linkedinUrl: input.linkedinUrl || null,
        status: input.status || null,
        priority: input.priority || null,
        notes: input.notes || null,
        companySize: null,
        stage: null,
        // Scout Agent Felder
        products: null,
        targetMarkets: null,
        countries: null,
        referenceCustomers: null,
        employeeCount: null,
        international: false,
        profileAnalyzedAt: null,
        scoutStatus: "Not Analyzed",
        scoutGeneration: 0,
        scoutParentId: null,
        discoveryMethod: null,
        discoveredAt: null
      };
      return await createCorporation(corpData);
    }),
    update: salesProcedure.input(z6.object({
      id: z6.string(),
      name: z6.string().optional(),
      headquartersCountry: z6.string().optional(),
      totalRevenueEur: z6.number().optional(),
      industry: z6.string().optional(),
      website: z6.string().optional(),
      linkedinUrl: z6.string().optional(),
      status: z6.string().optional(),
      priority: z6.string().optional(),
      notes: z6.string().optional(),
      // Genesis World CRM Felder
      companySize: z6.string().optional(),
      stage: z6.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.id);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      const { id, ...data } = input;
      return await updateCorporation(id, data);
    })
  }),
  // ==========================================================================
  // COMPANIES
  // ==========================================================================
  companies: router({
    list: salesProcedure.query(async ({ ctx }) => {
      return await getAllCompanies();
    }),
    listByCorporation: salesProcedure.input(z6.object({ corporationId: z6.string() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getCompaniesByCorporation(input.corporationId);
    }),
    get: salesProcedure.input(z6.object({ id: z6.string() })).query(async ({ input }) => {
      return await getCompany(input.id);
    }),
    create: salesProcedure.input(z6.object({
      corporationId: z6.string(),
      name: z6.string(),
      legalForm: z6.string().optional(),
      country: z6.string().optional(),
      city: z6.string().optional(),
      address: z6.string().optional(),
      revenueEur: z6.number().optional(),
      products: z6.string().optional(),
      website: z6.string().optional(),
      notes: z6.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      const companyData = {
        corporationId: input.corporationId,
        name: input.name,
        legalForm: input.legalForm || null,
        country: input.country || null,
        city: input.city || null,
        address: input.address || null,
        revenueEur: input.revenueEur || null,
        products: input.products || null,
        website: input.website || null,
        notes: input.notes || null
      };
      return await createCompany(companyData);
    }),
    update: salesProcedure.input(z6.object({
      id: z6.string(),
      name: z6.string().optional(),
      legalForm: z6.string().optional(),
      country: z6.string().optional(),
      city: z6.string().optional(),
      address: z6.string().optional(),
      revenueEur: z6.number().optional(),
      products: z6.string().optional(),
      website: z6.string().optional(),
      notes: z6.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateCompany(id, data);
    })
  }),
  // ==========================================================================
  // CONTACTS
  // ==========================================================================
  contacts: router({
    listByCompany: salesProcedure.input(z6.object({ companyId: z6.string() })).query(async ({ input }) => {
      return await getContactsByCompany(input.companyId);
    }),
    get: salesProcedure.input(z6.object({ id: z6.string() })).query(async ({ input }) => {
      return await getContact(input.id);
    }),
    getCompanies: salesProcedure.input(z6.object({ contactId: z6.string() })).query(async ({ input }) => {
      return await getCompaniesByContact(input.contactId);
    }),
    create: salesProcedure.input(z6.object({
      companyId: z6.string(),
      firstName: z6.string(),
      lastName: z6.string(),
      jobTitle: z6.string().optional(),
      email: z6.string().optional(),
      position: z6.string().optional(),
      phone: z6.string().optional(),
      mobile: z6.string().optional(),
      linkedinUrl: z6.string().optional(),
      decisionMaker: z6.boolean().optional(),
      contactStatus: z6.string().optional(),
      notes: z6.string().optional(),
      // Genesis World CRM Felder
      keyword1: z6.string().optional(),
      keyword2: z6.string().optional(),
      companySize: z6.string().optional(),
      responsiblePerson: z6.string().optional(),
      function: z6.string().optional(),
      department: z6.string().optional(),
      category: z6.string().optional(),
      tags: z6.string().optional(),
      phoneBusiness: z6.string().optional(),
      phoneMobile: z6.string().optional(),
      phoneOffice: z6.string().optional(),
      faxOffice: z6.string().optional()
    })).mutation(async ({ input }) => {
      const { companyId, email, position, ...rest } = input;
      const contactData = {
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        jobTitle: input.jobTitle || null,
        phone: input.phone || null,
        mobile: input.mobile || null,
        linkedinUrl: input.linkedinUrl || null,
        decisionMaker: input.decisionMaker || null,
        contactStatus: input.contactStatus || null,
        notes: input.notes || null,
        keyword1: input.keyword1 || null,
        keyword2: input.keyword2 || null,
        companySize: input.companySize || null,
        responsiblePerson: input.responsiblePerson || null,
        function: input.function || null,
        department: input.department || null,
        category: input.category || null,
        tags: input.tags || null,
        phoneBusiness: input.phoneBusiness || null,
        phoneMobile: input.phoneMobile || null,
        phoneOffice: input.phoneOffice || null,
        faxOffice: input.faxOffice || null
      };
      return await createContact(contactData, companyId, email, position);
    }),
    update: salesProcedure.input(z6.object({
      id: z6.string(),
      firstName: z6.string().optional(),
      lastName: z6.string().optional(),
      jobTitle: z6.string().optional(),
      phone: z6.string().optional(),
      mobile: z6.string().optional(),
      linkedinUrl: z6.string().optional(),
      decisionMaker: z6.boolean().optional(),
      contactStatus: z6.string().optional(),
      notes: z6.string().optional(),
      // Genesis World CRM Felder
      keyword1: z6.string().optional(),
      keyword2: z6.string().optional(),
      companySize: z6.string().optional(),
      responsiblePerson: z6.string().optional(),
      function: z6.string().optional(),
      department: z6.string().optional(),
      category: z6.string().optional(),
      tags: z6.string().optional(),
      phoneBusiness: z6.string().optional(),
      phoneMobile: z6.string().optional(),
      phoneOffice: z6.string().optional(),
      faxOffice: z6.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateContact(id, data);
    })
  }),
  // ==========================================================================
  // DEALS
  // ==========================================================================
  deals: router({
    list: salesProcedure.query(async ({ ctx }) => {
      return await getDealsByUser(ctx.user.id);
    }),
    listByCorporation: salesProcedure.input(z6.object({ corporationId: z6.string() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getDealsByCorporation(input.corporationId);
    }),
    listByCompany: salesProcedure.input(z6.object({ companyId: z6.string() })).query(async ({ ctx, input }) => {
      return await getDealsByCompany(input.companyId);
    }),
    create: salesProcedure.input(z6.object({
      corporationId: z6.string(),
      companyId: z6.string().optional(),
      dealName: z6.string(),
      dealValueEur: z6.string(),
      // decimal as string
      stage: z6.string().optional(),
      probability: z6.number().optional(),
      expectedCloseDate: z6.date().optional(),
      subscriptionTier: z6.string().optional(),
      notes: z6.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      const dealData = {
        corporationId: input.corporationId,
        companyId: input.companyId || null,
        dealName: input.dealName || null,
        dealValueEur: input.dealValueEur || null,
        stage: input.stage || null,
        probability: input.probability || null,
        expectedCloseDate: input.expectedCloseDate || null,
        subscriptionTier: input.subscriptionTier || null,
        notes: input.notes || null,
        actualCloseDate: null,
        createdBy: null
      };
      return await createDeal(dealData, ctx.user.id);
    }),
    updateStage: salesProcedure.input(z6.object({
      dealId: z6.string(),
      stage: z6.string()
    })).mutation(async ({ input }) => {
      return await updateDealStage(input.dealId, input.stage);
    })
  }),
  // ==========================================================================
  // ACTIVITIES
  // ==========================================================================
  activities: router({
    listByCorporation: salesProcedure.input(z6.object({ corporationId: z6.string(), limit: z6.number().optional() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getActivitiesByCorporation(input.corporationId, input.limit);
    }),
    listByContact: salesProcedure.input(z6.object({ contactId: z6.string(), limit: z6.number().optional() })).query(async ({ ctx, input }) => {
      return await getActivitiesByContact(input.contactId, input.limit);
    }),
    listByCompany: salesProcedure.input(z6.object({ companyId: z6.string(), limit: z6.number().optional() })).query(async ({ ctx, input }) => {
      return await getActivitiesByCompany(input.companyId, input.limit);
    }),
    create: salesProcedure.input(z6.object({
      corporationId: z6.string().optional(),
      companyId: z6.string().optional(),
      contactId: z6.string().optional(),
      activityType: z6.string(),
      subject: z6.string(),
      content: z6.string().optional(),
      direction: z6.string().optional(),
      outcome: z6.string().optional()
    })).mutation(async ({ ctx, input }) => {
      return await createActivity({
        corporationId: input.corporationId || null,
        companyId: input.companyId || null,
        contactId: input.contactId || null,
        activityType: input.activityType || null,
        subject: input.subject || null,
        content: input.content || null,
        direction: input.direction || null,
        outcome: input.outcome || null,
        activityDate: null,
        emailMessageId: null,
        hasAttachment: false,
        attachmentCount: 0,
        createdBy: ctx.user.name || ctx.user.id
      });
    })
  }),
  // ==========================================================================
  // DASHBOARD & STATS
  // ==========================================================================
  dashboard: router({
    stats: salesProcedure.query(async ({ ctx }) => {
      return await getDashboardStats(ctx.user.id);
    })
  }),
  // ==========================================================================
  // COMMISSIONS (External Sales)
  // ==========================================================================
  commissions: router({
    myCommissions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "external_sales") {
        throw new TRPCError4({ code: "FORBIDDEN", message: "Only for external sales" });
      }
      return await getCommissionsByUser(ctx.user.id);
    })
  }),
  // ==========================================================================
  // USER MANAGEMENT (Admin only)
  // ==========================================================================
  users: router({
    assignAccounts: adminProcedure3.input(z6.object({
      userId: z6.string(),
      corporationIds: z6.array(z6.string())
    })).mutation(async ({ ctx, input }) => {
      return await assignUserToCorporations(
        input.userId,
        input.corporationIds,
        ctx.user.id
      );
    }),
    getAssignedCorporations: adminProcedure3.input(z6.object({ userId: z6.string() })).query(async ({ input }) => {
      return await getAssignedCorporations(input.userId);
    })
  }),
  // ==========================================================================
  // GLOBAL SEARCH
  // ==========================================================================
  search: router({
    global: protectedProcedure.input(z6.object({ query: z6.string() })).query(async ({ input }) => {
      return await globalSearch(input.query);
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    const token = opts.req.cookies[COOKIE_NAME];
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        const users2 = await getUserById(session.userId);
        if (users2 && users2.length > 0) {
          user = users2[0];
        }
      }
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  registerSimpleAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
