var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc5) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc5 = __getOwnPropDesc(from, key)) || desc5.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// drizzle/schema.ts
import { mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, int, decimal, index, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users, userAssignments, corporations, companies, contacts, contactCompanyRelations, contactEmails, deals, activities, productUsage, partners, partnerDeals, userAccountAssignments, commissions, scoutQueue, scoutDiscoveryMethods, scoutSettings, hunterQueue, corporationsRelations, companiesRelations, contactsRelations, contactCompanyRelationsRelations, dealsRelations, usersRelations, hunterJobs, hunterResults, outreachCampaigns, emailDrafts, emailTemplates, emailResponses, apiKeys;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
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
    userAssignments = mysqlTable("user_assignments", {
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
    corporations = mysqlTable("corporations", {
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
    companies = mysqlTable("companies", {
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
    contacts = mysqlTable("contacts", {
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
    contactCompanyRelations = mysqlTable("contact_company_relations", {
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
    contactEmails = mysqlTable("contact_emails", {
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
    deals = mysqlTable("deals", {
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
    activities = mysqlTable("activities", {
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
    productUsage = mysqlTable("product_usage", {
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
    partners = mysqlTable("partners", {
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
    partnerDeals = mysqlTable("partner_deals", {
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
    userAccountAssignments = mysqlTable("user_account_assignments", {
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
    commissions = mysqlTable("commissions", {
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
    scoutQueue = mysqlTable("scout_queue", {
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
    scoutDiscoveryMethods = mysqlTable("scout_discovery_methods", {
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
    scoutSettings = mysqlTable("scout_settings", {
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
    hunterQueue = mysqlTable("hunter_queue", {
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
    corporationsRelations = relations(corporations, ({ many }) => ({
      companies: many(companies),
      deals: many(deals),
      activities: many(activities),
      productUsage: many(productUsage),
      userAssignments: many(userAccountAssignments)
    }));
    companiesRelations = relations(companies, ({ one, many }) => ({
      corporation: one(corporations, {
        fields: [companies.corporationId],
        references: [corporations.id]
      }),
      contactRelations: many(contactCompanyRelations),
      deals: many(deals),
      activities: many(activities)
    }));
    contactsRelations = relations(contacts, ({ many }) => ({
      companyRelations: many(contactCompanyRelations),
      emails: many(contactEmails),
      activities: many(activities)
    }));
    contactCompanyRelationsRelations = relations(contactCompanyRelations, ({ one }) => ({
      contact: one(contacts, {
        fields: [contactCompanyRelations.contactId],
        references: [contacts.id]
      }),
      company: one(companies, {
        fields: [contactCompanyRelations.companyId],
        references: [companies.id]
      })
    }));
    dealsRelations = relations(deals, ({ one, many }) => ({
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
    usersRelations = relations(users, ({ one, many }) => ({
      accountAssignments: many(userAccountAssignments),
      commissions: many(commissions)
    }));
    hunterJobs = mysqlTable("hunter_jobs", {
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
    hunterResults = mysqlTable("hunter_results", {
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
    outreachCampaigns = mysqlTable("outreach_campaigns", {
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
    emailDrafts = mysqlTable("email_drafts", {
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
    emailTemplates = mysqlTable("email_templates", {
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
    emailResponses = mysqlTable("email_responses", {
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
    apiKeys = mysqlTable("api_keys", {
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
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
    };
  }
});

// server/db.ts
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
async function getUserById_OLD(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function canUserAccessCorporation(userId, corporationId) {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserById_OLD(userId);
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (user.role === "staff_plus") {
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
  const user = await getUserById_OLD(userId);
  if (!user) return [];
  if (user.role === "admin" || user.role === "super_admin") {
    return await db.select().from(corporations).orderBy(desc(corporations.createdAt));
  }
  if (user.role === "staff_plus") {
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
  const id = crypto.randomUUID();
  await db.insert(corporations).values({ ...data, id });
  const created = await db.select().from(corporations).where(eq(corporations.id, id)).limit(1);
  if (!created || created.length === 0) {
    throw new Error("Failed to retrieve created corporation");
  }
  return created[0];
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
  return await db.select({
    id: companies.id,
    name: companies.name,
    corporationId: companies.corporationId,
    corporationName: corporations.name,
    industry: corporations.industry,
    stage: corporations.stage,
    country: companies.country,
    city: companies.city,
    revenueEur: companies.revenueEur,
    products: companies.products
  }).from(companies).leftJoin(corporations, eq(companies.corporationId, corporations.id));
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
async function getAllContacts() {
  const db = await getDb();
  if (!db) return [];
  const allContacts = await db.select().from(contacts);
  const contactsWithDetails = await Promise.all(
    allContacts.map(async (contact) => {
      const relations2 = await db.select().from(contactCompanyRelations).where(eq(contactCompanyRelations.contactId, contact.id)).limit(1);
      return {
        ...contact,
        primaryEmail: relations2[0]?.email || null,
        primaryPhone: contact.phone || contact.mobile || null,
        position: relations2[0]?.position || null
      };
    })
  );
  return contactsWithDetails;
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
  try {
    const contactId = crypto.randomUUID();
    console.log("[createContact] Inserting contact:", { ...contactData, id: contactId });
    await db.insert(contacts).values({ ...contactData, id: contactId });
    console.log("[createContact] Contact created with ID:", contactId);
    console.log("[createContact] Linking to company:", { contactId, companyId, email, position });
    const relationResult = await db.insert(contactCompanyRelations).values({
      contactId,
      companyId,
      email,
      position,
      isPrimary: true
    });
    console.log("[createContact] Relation created:", relationResult);
    return contactId;
  } catch (error) {
    console.error("[createContact] Error:", error);
    throw error;
  }
}
async function addContactToCompany(contactId, companyId, email, position, isPrimary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(contactCompanyRelations).where(
    and(
      eq(contactCompanyRelations.contactId, contactId),
      eq(contactCompanyRelations.companyId, companyId)
    )
  ).limit(1);
  if (existing.length > 0) {
    throw new Error("Contact is already linked to this company");
  }
  if (isPrimary) {
    await db.update(contactCompanyRelations).set({ isPrimary: false }).where(eq(contactCompanyRelations.contactId, contactId));
  }
  await db.insert(contactCompanyRelations).values({
    contactId,
    companyId,
    email,
    position,
    isPrimary: isPrimary || false
  });
  return { success: true };
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
  const user = await getUserById_OLD(userId);
  if (!user) return [];
  if (user.role === "admin" || user.role === "super_admin") {
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }
  if (user.role === "staff_plus") {
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
  const user = await getUserById_OLD(userId);
  if (user?.role === "staff_plus" && data.dealValueEur) {
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
async function getRecentActivities(userId, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const user = await getUserById_OLD(userId);
  if (!user) return [];
  if (user.role === "admin") {
    return await db.select().from(activities).orderBy(desc(activities.activityDate)).limit(limit);
  }
  const assignedCorps = await getAssignedCorporations(userId);
  if (assignedCorps.length === 0) return [];
  const corpIds = assignedCorps.map((c) => c.id);
  return await db.select().from(activities).where(inArray(activities.corporationId, corpIds)).orderBy(desc(activities.activityDate)).limit(limit);
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
  const user = await getUserById_OLD(userId);
  if (!user) return null;
  const corps = await getCorporations(userId);
  const totalCorporations = corps.length;
  const allContacts = await getAllContacts();
  const totalContacts = allContacts.length;
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
  if (user.role === "staff_plus") {
    const userCommissions = await getCommissionsByUser(userId);
    totalCommission = userCommissions.reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
    paidCommission = userCommissions.filter((c) => c.paid).reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
  }
  return {
    totalCorporations,
    totalContacts,
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
  if (!db) return [];
  return await db.select().from(users).where(eq(users.email, email)).limit(1);
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.id, id)).limit(1);
}
async function getUserByIdSingle(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
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
async function getScoutSettings(userId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(scoutSettings).where(eq(scoutSettings.userId, userId)).limit(1);
  if (result.length === 0) {
    return {
      minRevenueMio: 100,
      minEmployees: 500,
      companyTypes: ["Manufacturer"],
      targetMarkets: ["DE", "US", "UK", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "PL", "SE", "DK", "NO", "FI"]
    };
  }
  return result[0];
}
async function saveScoutSettings(userId, settings) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(scoutSettings).where(eq(scoutSettings.userId, userId)).limit(1);
  const data = {
    userId,
    minRevenueMio: settings.minRevenueMio,
    minEmployees: settings.minEmployees,
    companyTypes: settings.companyTypes,
    targetMarkets: settings.targetMarkets,
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (existing.length > 0) {
    await db.update(scoutSettings).set(data).where(eq(scoutSettings.userId, userId));
  } else {
    await db.insert(scoutSettings).values({
      id: crypto.randomUUID(),
      ...data,
      createdAt: /* @__PURE__ */ new Date()
    });
  }
}
async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}
async function createUser(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values(data);
  return data.id;
}
async function updateUser(userId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}
async function deleteUser(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userAssignments).where(eq(userAssignments.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}
async function getUserAssignments(userId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(userAssignments).where(eq(userAssignments.userId, userId));
}
async function assignUserEntity(userId, entityType, entityId, assignedBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userAssignments).values({
    id: crypto.randomUUID(),
    userId,
    entityType,
    entityId,
    assignedBy
  });
}
async function unassignUserEntity(userId, entityType, entityId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userAssignments).where(
    and(
      eq(userAssignments.userId, userId),
      eq(userAssignments.entityType, entityType),
      eq(userAssignments.entityId, entityId)
    )
  );
}
async function getAllEmailTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
}
async function getEmailTemplateById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
  return results[0] || null;
}
async function createEmailTemplate(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(emailTemplates).values({
    id,
    ...data
  });
  return { id };
}
async function updateEmailTemplate(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailTemplates).set(data).where(eq(emailTemplates.id, id));
}
async function deleteEmailTemplate(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
}
async function getAllEmailDrafts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(emailDrafts).orderBy(desc(emailDrafts.createdAt));
}
async function getEmailDraftById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(emailDrafts).where(eq(emailDrafts.id, id)).limit(1);
  return results[0] || null;
}
async function getEmailDraftsByStatus(status) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(emailDrafts).where(eq(emailDrafts.reviewStatus, status)).orderBy(desc(emailDrafts.createdAt));
}
async function updateEmailDraft(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailDrafts).set({
    ...data,
    reviewedAt: data.reviewStatus ? /* @__PURE__ */ new Date() : void 0,
    sentAt: data.reviewStatus === "sent" ? /* @__PURE__ */ new Date() : void 0
  }).where(eq(emailDrafts.id, id));
}
async function deleteEmailDraft(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailDrafts).where(eq(emailDrafts.id, id));
}
async function getAllEmailResponses() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(emailResponses).orderBy(desc(emailResponses.receivedAt));
}
async function getEmailResponseById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(emailResponses).where(eq(emailResponses.id, id)).limit(1);
  return results[0] || null;
}
async function getEmailResponsesByContact(contactId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(emailResponses).where(eq(emailResponses.contactId, contactId)).orderBy(desc(emailResponses.receivedAt));
}
async function updateEmailResponse(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailResponses).set({
    ...data,
    processedAt: data.processedBy ? /* @__PURE__ */ new Date() : void 0
  }).where(eq(emailResponses.id, id));
}
async function listHunterResults(filters) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { reviewStatus = "all", dataSource, corporationId, limit = 50, offset = 0 } = filters;
  let query = db.select().from(hunterResults);
  if (reviewStatus !== "all") {
    query = query.where(eq(hunterResults.reviewStatus, reviewStatus));
  }
  if (dataSource) {
    query = query.where(eq(hunterResults.dataSource, dataSource));
  }
  if (corporationId) {
    query = query.where(eq(hunterResults.corporationId, corporationId));
  }
  const results = await query.orderBy(desc(hunterResults.createdAt)).limit(limit).offset(offset);
  return results;
}
async function getHunterResultById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(hunterResults).where(eq(hunterResults.id, id)).limit(1);
  return results[0] || null;
}
async function updateHunterResultReviewStatus(id, reviewStatus, reviewedBy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hunterResults).set({
    reviewStatus,
    reviewedBy,
    reviewedAt: /* @__PURE__ */ new Date()
  }).where(eq(hunterResults.id, id));
  return { success: true };
}
async function createContactFromHunterResult(resultId, createdBy) {
  const result = await getHunterResultById(resultId);
  if (!result) {
    throw new Error("Hunter result not found");
  }
  const contactId = await createContact({
    firstName: result.firstName || "",
    lastName: result.lastName || "",
    email: result.email || "",
    phone: result.phoneNumber || null,
    title: result.title || null,
    linkedinUrl: result.linkedinUrl || null,
    companyId: null,
    // TODO: Link to company if exists
    source: `hunter_${result.dataSource}`,
    notes: `Imported from Hunter Agent (${result.dataSource})`,
    createdBy
  });
  await updateHunterResultReviewStatus(resultId, "approved", createdBy);
  return { contactId, success: true };
}
async function getHunterResultsStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const total = await db.select({ count: sql`count(*)` }).from(hunterResults);
  const pending = await db.select({ count: sql`count(*)` }).from(hunterResults).where(eq(hunterResults.reviewStatus, "pending"));
  const approved = await db.select({ count: sql`count(*)` }).from(hunterResults).where(eq(hunterResults.reviewStatus, "approved"));
  const rejected = await db.select({ count: sql`count(*)` }).from(hunterResults).where(eq(hunterResults.reviewStatus, "rejected"));
  return {
    total: total[0]?.count || 0,
    pending: pending[0]?.count || 0,
    approved: approved[0]?.count || 0,
    rejected: rejected[0]?.count || 0
  };
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_schema();
    init_env();
    _db = null;
  }
});

// server/encryption.ts
var encryption_exports = {};
__export(encryption_exports, {
  decryptPassword: () => decryptPassword,
  encryptPassword: () => encryptPassword
});
import crypto2 from "crypto";
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || "default-secret-change-me";
  return crypto2.pbkdf2Sync(secret, "caldav-salt", 1e5, KEY_LENGTH, "sha512");
}
function encryptPassword(password) {
  const iv = crypto2.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto2.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}
function decryptPassword(encryptedData) {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], "hex");
  const key = getEncryptionKey();
  const decipher = crypto2.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
var ALGORITHM, IV_LENGTH, KEY_LENGTH;
var init_encryption = __esm({
  "server/encryption.ts"() {
    "use strict";
    ALGORITHM = "aes-256-gcm";
    IV_LENGTH = 16;
    KEY_LENGTH = 32;
  }
});

// server/hunterDb.ts
var hunterDb_exports = {};
__export(hunterDb_exports, {
  bulkUpdateHunterResults: () => bulkUpdateHunterResults,
  createContactFromHunterResult: () => createContactFromHunterResult2,
  createHunterJob: () => createHunterJob,
  createHunterResult: () => createHunterResult,
  getAllHunterJobs: () => getAllHunterJobs,
  getHunterJob: () => getHunterJob,
  getHunterJobsByCorporation: () => getHunterJobsByCorporation,
  getHunterResult: () => getHunterResult,
  getHunterResultsByCorporation: () => getHunterResultsByCorporation,
  getHunterResultsByJob: () => getHunterResultsByJob,
  getHunterStats: () => getHunterStats,
  getPendingHunterResults: () => getPendingHunterResults,
  updateHunterJob: () => updateHunterJob,
  updateHunterResult: () => updateHunterResult
});
import { eq as eq2, desc as desc2 } from "drizzle-orm";
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
  const results = await db.select().from(hunterJobs).where(eq2(hunterJobs.id, id)).limit(1);
  return results.length > 0 ? results[0] : null;
}
async function getAllHunterJobs() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterJobs).orderBy(desc2(hunterJobs.createdAt));
}
async function getHunterJobsByCorporation(corporationId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterJobs).where(eq2(hunterJobs.corporationId, corporationId)).orderBy(desc2(hunterJobs.createdAt));
}
async function updateHunterJob(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hunterJobs).set(updates).where(eq2(hunterJobs.id, id));
}
async function createHunterResult(result) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = result.id || crypto.randomUUID();
  await db.insert(hunterResults).values({ ...result, id });
  return id;
}
async function getHunterResult(id) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(hunterResults).where(eq2(hunterResults.id, id)).limit(1);
  return results.length > 0 ? results[0] : null;
}
async function getHunterResultsByJob(jobId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterResults).where(eq2(hunterResults.jobId, jobId)).orderBy(desc2(hunterResults.confidence));
}
async function getHunterResultsByCorporation(corporationId) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterResults).where(eq2(hunterResults.corporationId, corporationId)).orderBy(desc2(hunterResults.confidence));
}
async function getPendingHunterResults() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(hunterResults).where(eq2(hunterResults.reviewStatus, "pending")).orderBy(desc2(hunterResults.confidence));
}
async function updateHunterResult(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hunterResults).set(updates).where(eq2(hunterResults.id, id));
}
async function bulkUpdateHunterResults(ids, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const id of ids) {
    await db.update(hunterResults).set(updates).where(eq2(hunterResults.id, id));
  }
}
async function createContactFromHunterResult2(resultId, userId) {
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
var init_hunterDb = __esm({
  "server/hunterDb.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/scoutDb.ts
import { eq as eq3, desc as desc3, and as and3, sql as sql2 } from "drizzle-orm";
async function addToScoutQueue(job) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = crypto.randomUUID();
  await db.insert(scoutQueue).values({ ...job, id });
  const result = await db.select().from(scoutQueue).where(eq3(scoutQueue.id, id)).limit(1);
  return result[0];
}
async function getScoutQueueJobs(filters) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(scoutQueue);
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq3(scoutQueue.status, filters.status));
  }
  if (filters?.generation !== void 0) {
    conditions.push(eq3(scoutQueue.generation, filters.generation));
  }
  if (conditions.length > 0) {
    query = query.where(and3(...conditions));
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
async function updateScoutQueueJob(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scoutQueue).set(updates).where(eq3(scoutQueue.id, id));
}
async function deleteScoutQueueJob(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scoutQueue).where(eq3(scoutQueue.id, id));
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
  await db.update(scoutDiscoveryMethods).set(updates).where(eq3(scoutDiscoveryMethods.id, id));
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
  let conditions = [eq3(corporations.scoutStatus, "Pending")];
  if (filters?.generation !== void 0) {
    conditions.push(eq3(corporations.scoutGeneration, filters.generation));
  }
  let query = db.select().from(corporations).where(and3(...conditions));
  if (filters?.limit) {
    return await query.orderBy(desc3(corporations.discoveredAt)).limit(filters.limit);
  }
  return await query.orderBy(desc3(corporations.discoveredAt));
}
async function approveScoutSuggestion(corporationId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(corporations).set({
    scoutStatus: "Approved",
    status: "Target"
  }).where(eq3(corporations.id, corporationId));
  const { createHunterJob: createHunterJob2 } = await Promise.resolve().then(() => (init_hunterDb(), hunterDb_exports));
  await createHunterJob2({
    corporationId,
    targetRoles: ["CEO", "VP Sales", "Market Research Manager", "Head of Procurement"],
    targetCount: 5,
    priority: 5,
    status: "pending"
  });
  console.log(`[Scout] Approved corporation ${corporationId}, added to Hunter Queue`);
}
async function rejectScoutSuggestion(corporationId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(corporations).set({
    scoutStatus: "Rejected"
  }).where(eq3(corporations.id, corporationId));
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
var init_scoutDb = __esm({
  "server/scoutDb.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/scoutWorker.ts
var scoutWorker_exports = {};
__export(scoutWorker_exports, {
  processNextQueueJob: () => processNextQueueJob
});
import OpenAI from "openai";
async function processNextQueueJob() {
  try {
    const jobs = await getScoutQueueJobs({
      status: "Pending",
      limit: 1
    });
    if (jobs.length === 0) {
      return { success: false, error: "No pending jobs" };
    }
    const job = jobs[0];
    await updateScoutQueueJob(job.id, {
      status: "Processing",
      startedAt: /* @__PURE__ */ new Date()
    });
    try {
      await processJob(job);
      await updateScoutQueueJob(job.id, {
        status: "Completed",
        completedAt: /* @__PURE__ */ new Date()
      });
      return { success: true, jobId: job.id };
    } catch (error) {
      await updateScoutQueueJob(job.id, {
        status: "Failed",
        completedAt: /* @__PURE__ */ new Date(),
        errorMessage: error.message,
        metadata: { error: error.message }
      });
      return { success: false, jobId: job.id, error: error.message };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function processJob(job) {
  const seedData = job.seedData;
  switch (job.seedType) {
    case "manual":
      await processManualSeed(job, seedData);
      break;
    case "linkedin":
      await processLinkedInSeed(job, seedData);
      break;
    case "press":
      await processPressSeed(job, seedData);
      break;
    default:
      throw new Error(`Unknown seed type: ${job.seedType}`);
  }
}
async function processManualSeed(job, seedData) {
  console.log(`Processing manual seed: ${seedData.companyName} (${seedData.website})`);
  const websiteContent = await fetchWebsiteContent(seedData.website);
  const analysis = await analyzeWebsiteWithAI(
    seedData.companyName,
    seedData.website,
    websiteContent
  );
  await updateScoutQueueJob(job.id, {
    metadata: {
      companyName: seedData.companyName,
      website: seedData.website,
      analysis,
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  });
  console.log(`Analysis complete for ${seedData.companyName}`);
  console.log(`Industries: ${analysis.industries?.join(", ")}`);
  console.log(`Products: ${analysis.products?.join(", ")}`);
  console.log(`Markets: ${analysis.markets?.join(", ")}`);
  const settingsRaw = await getScoutSettings("admin");
  const settings = settingsRaw ? {
    minRevenueMio: settingsRaw.minRevenueMio || 100,
    minEmployees: settingsRaw.minEmployees || 500,
    companyTypes: settingsRaw.companyTypes || ["Manufacturer"],
    targetMarkets: settingsRaw.targetMarkets || ["DE", "US", "UK", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "PL", "SE", "DK", "NO", "FI"]
  } : void 0;
  console.log(`Scout Settings: minRevenue=${settings?.minRevenueMio}M EUR, minEmployees=${settings?.minEmployees}, types=${settings?.companyTypes?.join(",")}`);
  const competitors = await discoverCompetitors(seedData.companyName, analysis, settings);
  console.log(`Found ${competitors.length} competitors`);
  for (const competitor of competitors) {
    await createCompetitorSuggestion(competitor, job.generation || 0);
  }
}
async function fetchWebsiteContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      },
      signal: AbortSignal.timeout(15e3)
      // 15 second timeout
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    const text2 = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text2.substring(0, 8e3);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return "";
  }
}
async function analyzeWebsiteWithAI(companyName, website, content) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, using mock analysis");
    return {
      industries: ["Unknown"],
      products: ["Unknown"],
      markets: ["Unknown"],
      countries: ["Unknown"],
      description: `Analysis for ${companyName} - OpenAI API not configured`
    };
  }
  try {
    const prompt = `Analyze this company website and extract key information.

Company: ${companyName}
Website: ${website}

Website Content:
${content}

Please provide a JSON response with the following structure:
{
  "industries": ["industry1", "industry2"],
  "products": ["product1", "product2"],
  "markets": ["market1", "market2"],
  "countries": ["country1", "country2"],
  "description": "brief company description"
}

Focus on:
- Main industries/sectors (e.g., "Building Materials", "Automotive", "Software")
- Key products or services
- Target markets or customer segments
- Geographic presence (countries)
- Brief description (1-2 sentences)`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a business analyst extracting structured information from company websites. Always respond with valid JSON."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1e3
    });
    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }
    let jsonStr = result.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const analysis = JSON.parse(jsonStr);
    return analysis;
  } catch (error) {
    console.error("AI analysis failed:", error.message);
    return {
      industries: ["Unknown"],
      products: ["Unknown"],
      markets: ["Unknown"],
      countries: ["Unknown"],
      description: `Analysis failed for ${companyName}: ${error.message}`
    };
  }
}
async function discoverCompetitors(seedCompanyName, analysis, settings) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping competitor discovery");
    return [];
  }
  try {
    const prompt = `You are a B2B market research analyst. Find direct competitors of this company.

Company: ${seedCompanyName}
Industries: ${analysis.industries.join(", ")}
Products: ${analysis.products.join(", ")}
Markets: ${analysis.markets.join(", ")}
Description: ${analysis.description}

**IMPORTANT FILTERS:**
1. Company types: ${settings?.companyTypes.join(", ") || "Manufacturers only"} (NO ${settings?.companyTypes.includes("Manufacturer") ? "distributors, retailers" : "other types"})
2. ONLY companies with >${settings?.minRevenueMio || 100}M EUR revenue OR >${settings?.minEmployees || 500} employees
3. Focus on these markets: ${settings?.targetMarkets.join(", ") || "DE, US, UK, FR, IT, ES, NL, BE, AT, CH, PL, SE, DK, NO, FI"}

Provide a JSON array with 5-10 direct competitors:
[
  {
    "name": "Company Name",
    "website": "https://www.example.com",
    "country": "DE",
    "estimatedRevenue": "500M EUR",
    "estimatedEmployees": 2000,
    "description": "Brief description of what they manufacture"
  }
]

**IMPORTANT:** Use ISO 2-letter country codes (DE, US, FR, UK, CH, IT, ES, NL, BE, AT, PL, SE, DK, NO, FI) for the "country" field.

Only include companies that meet ALL criteria above.`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a B2B market research analyst specializing in identifying manufacturing companies. Always respond with valid JSON arrays. Only include manufacturers with >100M EUR revenue or >500 employees."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2e3
    });
    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }
    let jsonStr = result.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const competitors = JSON.parse(jsonStr);
    console.log(`GPT-4 found ${competitors.length} competitors for ${seedCompanyName}`);
    return competitors;
  } catch (error) {
    console.error("Competitor discovery failed:", error.message);
    return [];
  }
}
async function createCompetitorSuggestion(competitor, parentGeneration) {
  try {
    const corpData = {
      name: competitor.name,
      status: "Target",
      priority: "Medium",
      notes: `${competitor.description}

Estimated Revenue: ${competitor.estimatedRevenue || "Unknown"}
Estimated Employees: ${competitor.estimatedEmployees || "Unknown"}`,
      stage: "Producer",
      scoutStatus: "Pending",
      scoutGeneration: parentGeneration + 1,
      discoveryMethod: "competitor_analysis",
      discoveredAt: /* @__PURE__ */ new Date()
    };
    if (competitor.website) corpData.website = competitor.website;
    if (competitor.country) corpData.headquartersCountry = competitor.country;
    if (competitor.estimatedEmployees) corpData.employeeCount = competitor.estimatedEmployees;
    await createCorporation(corpData);
    console.log(`\u2705 Created suggestion: ${competitor.name} (Gen ${parentGeneration + 1})`);
  } catch (error) {
    console.error(`Failed to create suggestion for ${competitor.name}:`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    console.error(`Error details:`, JSON.stringify(error, null, 2));
  }
}
async function processLinkedInSeed(job, seedData) {
  console.log(`Processing LinkedIn seed: ${seedData.linkedinUrl}`);
  throw new Error("LinkedIn seed processing not yet implemented");
}
async function processPressSeed(job, seedData) {
  console.log(`Processing press seed: ${seedData.pressUrl}`);
  throw new Error("Press seed processing not yet implemented");
}
var openai;
var init_scoutWorker = __esm({
  "server/scoutWorker.ts"() {
    "use strict";
    init_scoutDb();
    init_db();
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ""
    });
  }
});

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

// server/_core/simpleAuth.ts
init_db();

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
import crypto3 from "crypto";
var JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "friday-crm-default-secret-change-in-production"
);
function hashPassword(password) {
  const hash = crypto3.createHash("sha256").update(password).digest("hex");
  const { encryptPassword: encryptPassword2 } = (init_encryption(), __toCommonJS(encryption_exports));
  const encryptedPassword = encryptPassword2(password);
  return `${hash}|${encryptedPassword}`;
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
      console.log("[Auth Debug] Login attempt for:", username);
      const users2 = await getUserByEmail(username);
      console.log("[Auth Debug] Users found:", users2 ? users2.length : 0);
      if (!users2 || users2.length === 0) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const user = users2[0];
      const storedHash = user.passwordHash.split("|")[0];
      const inputHash = crypto3.createHash("sha256").update(password).digest("hex");
      console.log("[Auth Debug] Calculated hash:", inputHash);
      console.log("[Auth Debug] Stored hash:", storedHash);
      console.log("[Auth Debug] Hashes match:", storedHash === inputHash);
      if (storedHash !== inputHash) {
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
      console.error("[Auth] Login failed - Full error:", error);
      console.error("[Auth] Error stack:", error instanceof Error ? error.stack : "No stack");
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
      const userId = crypto3.randomUUID();
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
init_env();
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
init_scoutDb();
import { TRPCError as TRPCError3 } from "@trpc/server";
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
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
  }),
  // ============================================================================
  // WORKER
  // ============================================================================
  processNextJob: adminProcedure2.mutation(async () => {
    const { processNextQueueJob: processNextQueueJob2 } = await Promise.resolve().then(() => (init_scoutWorker(), scoutWorker_exports));
    return await processNextQueueJob2();
  })
});

// server/hunterRouter.ts
import { z as z3 } from "zod";
init_hunterDb();

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

// server/services/hunterService.ts
init_db();
init_schema();
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
      const contactId = await createContactFromHunterResult2(input.resultId, ctx.user.id);
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
        const contactId = await createContactFromHunterResult2(resultId, ctx.user.id);
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
init_db();
init_schema();
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
async function updateEmailDraft2(id, data) {
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
init_db();
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
      await updateEmailDraft2(input.draftId, {
        reviewStatus: "approved",
        reviewedBy: ctx.user.id,
        reviewedAt: /* @__PURE__ */ new Date()
      });
    } else {
      await updateEmailDraft2(input.draftId, {
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
    await updateEmailDraft2(draftId, data);
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
    await updateEmailDraft2(input.draftId, {
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
init_db();
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
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax"
    };
    ctx.res.clearCookie("app_session_id", cookieOptions);
    ctx.res.clearCookie("app_session_id", { ...cookieOptions, secure: true });
    ctx.res.clearCookie("app_session_id", { ...cookieOptions, secure: false });
    ctx.res.cookie("app_session_id", "", {
      ...cookieOptions,
      expires: /* @__PURE__ */ new Date(0),
      maxAge: 0
    });
    return { success: true };
  })
});

// server/settingsRouter.ts
import { z as z5 } from "zod";
init_db();
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
  }),
  // Get Scout Agent settings
  getScoutSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getScoutSettings(ctx.user.id);
    return settings;
  }),
  // Save Scout Agent settings
  saveScoutSettings: protectedProcedure.input(
    z5.object({
      minRevenueMio: z5.number().min(0),
      minEmployees: z5.number().min(0),
      companyTypes: z5.array(z5.string()),
      targetMarkets: z5.array(z5.string())
    })
  ).mutation(async ({ input, ctx }) => {
    await saveScoutSettings(ctx.user.id, input);
    return { success: true };
  })
});

// server/userRouter.ts
init_db();
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z6 } from "zod";

// server/rbac.ts
init_db();
import { TRPCError as TRPCError4 } from "@trpc/server";
function hasRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}
function isAdminOrHigher(userRole) {
  return hasRole(userRole, ["super_admin", "admin"]);
}
function isStaffOrHigher(userRole) {
  return hasRole(userRole, ["super_admin", "admin", "staff"]);
}
async function assignEntity(userId, entityType, entityId, assignedBy) {
  const user = await getUserByIdSingle(userId);
  if (!user) {
    throw new TRPCError4({
      code: "NOT_FOUND",
      message: "User not found"
    });
  }
  if (user.role !== "staff_plus") {
    throw new TRPCError4({
      code: "BAD_REQUEST",
      message: "Can only assign entities to staff_plus users"
    });
  }
  const existing = await getUserAssignments(userId);
  const alreadyAssigned = existing.some(
    (a) => a.entityType === entityType && a.entityId === entityId
  );
  if (alreadyAssigned) {
    return;
  }
  await assignUserEntity(userId, entityType, entityId, assignedBy);
}
async function unassignEntity(userId, entityType, entityId) {
  await unassignUserEntity(userId, entityType, entityId);
}
async function requireAdminOrHigher(userId) {
  const user = await getUserByIdSingle(userId);
  if (!user) {
    throw new TRPCError4({
      code: "UNAUTHORIZED",
      message: "User not found"
    });
  }
  if (!isAdminOrHigher(user.role)) {
    throw new TRPCError4({
      code: "FORBIDDEN",
      message: "Admin access required"
    });
  }
  return user;
}
async function requireStaffOrHigher(userId) {
  const user = await getUserByIdSingle(userId);
  if (!user) {
    throw new TRPCError4({
      code: "UNAUTHORIZED",
      message: "User not found"
    });
  }
  if (!isStaffOrHigher(user.role)) {
    throw new TRPCError4({
      code: "FORBIDDEN",
      message: "Staff access or higher required"
    });
  }
  return user;
}

// server/userRouter.ts
init_db();
init_schema();
init_encryption();
import { eq as eq6 } from "drizzle-orm";
var userRouter = router({
  /**
   * List all users (Admin+ only)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireAdminOrHigher(ctx.user.id);
    const allUsers = await getAllUsers();
    return allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedTo: user.assignedTo,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn
    }));
  }),
  /**
   * Get user by ID (Admin+ only)
   */
  getById: protectedProcedure.input(z6.object({ id: z6.string() })).query(async ({ ctx, input }) => {
    await requireAdminOrHigher(ctx.user.id);
    const user = await getUserByIdSingle(input.id);
    if (!user) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "User not found"
      });
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedTo: user.assignedTo,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn
    };
  }),
  /**
   * Create new user (Admin+ only, Super Admin for creating admins)
   */
  create: protectedProcedure.input(
    z6.object({
      name: z6.string(),
      email: z6.string().email(),
      role: z6.enum(["super_admin", "admin", "staff", "staff_plus"]),
      assignedTo: z6.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const { role: currentUserRole } = await requireAdminOrHigher(ctx.user.id);
    if ((input.role === "super_admin" || input.role === "admin") && currentUserRole !== "super_admin") {
      throw new TRPCError5({
        code: "FORBIDDEN",
        message: "Only super admin can create admin or super admin users"
      });
    }
    const existing = await getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError5({
        code: "CONFLICT",
        message: "User with this email already exists"
      });
    }
    const userId = crypto.randomUUID();
    await createUser({
      id: userId,
      name: input.name,
      email: input.email,
      role: input.role,
      status: "active",
      assignedTo: input.assignedTo,
      loginMethod: "oauth"
    });
    return { id: userId, message: "User created successfully" };
  }),
  /**
   * Update user (Admin+ only, Super Admin for updating admins)
   */
  update: protectedProcedure.input(
    z6.object({
      id: z6.string(),
      name: z6.string().optional(),
      email: z6.string().email().optional(),
      role: z6.enum(["super_admin", "admin", "staff", "staff_plus"]).optional(),
      status: z6.enum(["active", "inactive"]).optional(),
      assignedTo: z6.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const { role: currentUserRole } = await requireAdminOrHigher(ctx.user.id);
    const targetUser = await getUserByIdSingle(input.id);
    if (!targetUser) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "User not found"
      });
    }
    if ((targetUser.role === "super_admin" || targetUser.role === "admin" || input.role === "super_admin" || input.role === "admin") && currentUserRole !== "super_admin") {
      throw new TRPCError5({
        code: "FORBIDDEN",
        message: "Only super admin can update admin or super admin users"
      });
    }
    await updateUser(input.id, {
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status,
      assignedTo: input.assignedTo
    });
    return { message: "User updated successfully" };
  }),
  /**
   * Delete user (Admin+ only, Super Admin for deleting admins)
   */
  delete: protectedProcedure.input(z6.object({ id: z6.string() })).mutation(async ({ ctx, input }) => {
    const { role: currentUserRole } = await requireAdminOrHigher(ctx.user.id);
    const targetUser = await getUserByIdSingle(input.id);
    if (!targetUser) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "User not found"
      });
    }
    if ((targetUser.role === "super_admin" || targetUser.role === "admin") && currentUserRole !== "super_admin") {
      throw new TRPCError5({
        code: "FORBIDDEN",
        message: "Only super admin can delete admin or super admin users"
      });
    }
    await deleteUser(input.id);
    return { message: "User deleted successfully" };
  }),
  /**
   * Assign entity (company or contact) to staff_plus user
   */
  assignEntity: protectedProcedure.input(
    z6.object({
      userId: z6.string(),
      entityType: z6.enum(["company", "contact"]),
      entityId: z6.string()
    })
  ).mutation(async ({ ctx, input }) => {
    await requireAdminOrHigher(ctx.user.id);
    await assignEntity(input.userId, input.entityType, input.entityId, ctx.user.id);
    return { message: "Entity assigned successfully" };
  }),
  /**
   * Unassign entity from staff_plus user
   */
  unassignEntity: protectedProcedure.input(
    z6.object({
      userId: z6.string(),
      entityType: z6.enum(["company", "contact"]),
      entityId: z6.string()
    })
  ).mutation(async ({ ctx, input }) => {
    await requireAdminOrHigher(ctx.user.id);
    await unassignEntity(input.userId, input.entityType, input.entityId);
    return { message: "Entity unassigned successfully" };
  }),
  /**
   * Get assigned entities for a staff_plus user
   */
  getAssignedEntities: protectedProcedure.input(z6.object({ userId: z6.string() })).query(async ({ ctx, input }) => {
    await requireAdminOrHigher(ctx.user.id);
    const assignments = await getUserAssignments(input.userId);
    return assignments.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      assignedBy: a.assignedBy,
      assignedAt: a.assignedAt
    }));
  }),
  /**
   * Get current user's CalDAV settings
   */
  getCalDAVSettings: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");
    const user = await database.select({
      caldavEmail: users.caldavEmail,
      caldavEnabled: users.caldavEnabled
    }).from(users).where(eq6(users.id, ctx.user.id)).limit(1);
    if (user.length === 0) {
      return { caldavEmail: null, caldavEnabled: false };
    }
    return user[0];
  }),
  /**
   * Update current user's CalDAV settings
   */
  updateCalDAVSettings: protectedProcedure.input(z6.object({
    caldavEmail: z6.string().email(),
    caldavPassword: z6.string().min(1),
    caldavEnabled: z6.boolean()
  })).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new Error("Database not available");
    const encryptedPassword = encryptPassword(input.caldavPassword);
    await database.update(users).set({
      caldavEmail: input.caldavEmail,
      caldavPassword: encryptedPassword,
      caldavEnabled: input.caldavEnabled
    }).where(eq6(users.id, ctx.user.id));
    return { success: true };
  }),
  /**
   * Admin: Get all users with CalDAV settings
   */
  getAllUsersCalDAV: protectedProcedure.query(async ({ ctx }) => {
    await requireAdminOrHigher(ctx.user.id);
    const database = await getDb();
    if (!database) throw new Error("Database not available");
    const allUsers = await database.select({
      id: users.id,
      name: users.name,
      email: users.email,
      caldavEmail: users.caldavEmail,
      caldavEnabled: users.caldavEnabled
    }).from(users);
    return allUsers;
  }),
  /**
   * Admin: Bulk update CalDAV settings for multiple users
   */
  bulkUpdateCalDAV: protectedProcedure.input(z6.object({
    users: z6.array(z6.object({
      userId: z6.string(),
      caldavEmail: z6.string().email(),
      caldavPassword: z6.string().min(1),
      caldavEnabled: z6.boolean()
    }))
  })).mutation(async ({ ctx, input }) => {
    await requireAdminOrHigher(ctx.user.id);
    const database = await getDb();
    if (!database) throw new Error("Database not available");
    for (const userUpdate of input.users) {
      const encryptedPassword = encryptPassword(userUpdate.caldavPassword);
      await database.update(users).set({
        caldavEmail: userUpdate.caldavEmail,
        caldavPassword: encryptedPassword,
        caldavEnabled: userUpdate.caldavEnabled
      }).where(eq6(users.id, userUpdate.userId));
    }
    return { success: true, count: input.users.length };
  })
});

// server/templatesRouter.ts
import { z as z7 } from "zod";
import { TRPCError as TRPCError6 } from "@trpc/server";
init_db();
var templatesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError6({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getAllEmailTemplates();
  }),
  get: publicProcedure.input(z7.object({ id: z7.string() })).query(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError6({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getEmailTemplateById(input.id);
  }),
  create: publicProcedure.input(
    z7.object({
      name: z7.string().min(1),
      description: z7.string().optional(),
      subject: z7.string().min(1),
      body: z7.string().min(1),
      language: z7.string().default("de"),
      variables: z7.array(z7.string()).optional(),
      category: z7.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError6({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    const template = await createEmailTemplate({
      ...input,
      variables: input.variables ? JSON.stringify(input.variables) : null,
      createdBy: ctx.user.id
    });
    return { id: template.id, message: "Template created successfully" };
  }),
  update: publicProcedure.input(
    z7.object({
      id: z7.string(),
      name: z7.string().optional(),
      description: z7.string().optional(),
      subject: z7.string().optional(),
      body: z7.string().optional(),
      language: z7.string().optional(),
      variables: z7.array(z7.string()).optional(),
      category: z7.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError6({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    const { id, variables, ...rest } = input;
    await updateEmailTemplate(id, {
      ...rest,
      variables: variables ? JSON.stringify(variables) : void 0
    });
    return { message: "Template updated successfully" };
  }),
  delete: publicProcedure.input(z7.object({ id: z7.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError6({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    await deleteEmailTemplate(input.id);
    return { message: "Template deleted successfully" };
  })
});

// server/draftsRouter.ts
import { z as z8 } from "zod";
import { TRPCError as TRPCError7 } from "@trpc/server";
init_db();
var draftsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getAllEmailDrafts();
  }),
  listByStatus: publicProcedure.input(z8.object({ status: z8.enum(["pending", "approved", "rejected", "sent"]) })).query(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getEmailDraftsByStatus(input.status);
  }),
  get: publicProcedure.input(z8.object({ id: z8.string() })).query(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getEmailDraftById(input.id);
  }),
  update: publicProcedure.input(
    z8.object({
      id: z8.string(),
      subject: z8.string().optional(),
      body: z8.string().optional(),
      reviewStatus: z8.enum(["pending", "approved", "rejected", "sent"]).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    const { id, ...data } = input;
    await updateEmailDraft(id, {
      ...data,
      reviewedBy: data.reviewStatus ? ctx.user.id : void 0,
      sentBy: data.reviewStatus === "sent" ? ctx.user.id : void 0
    });
    return { message: "Draft updated successfully" };
  }),
  approve: publicProcedure.input(z8.object({ id: z8.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    await updateEmailDraft(input.id, {
      reviewStatus: "approved",
      reviewedBy: ctx.user.id
    });
    return { message: "Draft approved" };
  }),
  reject: publicProcedure.input(z8.object({ id: z8.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    await updateEmailDraft(input.id, {
      reviewStatus: "rejected",
      reviewedBy: ctx.user.id
    });
    return { message: "Draft rejected" };
  }),
  send: publicProcedure.input(z8.object({ id: z8.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    await updateEmailDraft(input.id, {
      reviewStatus: "sent",
      sentBy: ctx.user.id
    });
    return { message: "Draft sent" };
  }),
  delete: publicProcedure.input(z8.object({ id: z8.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError7({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    await deleteEmailDraft(input.id);
    return { message: "Draft deleted successfully" };
  })
});

// server/responsesRouter.ts
import { z as z9 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
init_db();
var responsesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError8({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getAllEmailResponses();
  }),
  get: publicProcedure.input(z9.object({ id: z9.string() })).query(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError8({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getEmailResponseById(input.id);
  }),
  byContact: publicProcedure.input(z9.object({ contactId: z9.string() })).query(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError8({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    return getEmailResponsesByContact(input.contactId);
  }),
  update: publicProcedure.input(
    z9.object({
      id: z9.string(),
      sentiment: z9.enum(["positive", "neutral", "negative", "interested", "not_interested"]).optional(),
      requiresAction: z9.boolean().optional(),
      actionType: z9.string().optional(),
      notes: z9.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError8({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    const { id, ...data } = input;
    await updateEmailResponse(id, {
      ...data,
      processedBy: ctx.user.id
    });
    return { message: "Response updated successfully" };
  }),
  markProcessed: publicProcedure.input(z9.object({ id: z9.string() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user) throw new TRPCError8({ code: "UNAUTHORIZED", message: "Not authenticated" });
    await requireStaffOrHigher(ctx.user.id);
    await updateEmailResponse(input.id, {
      processedBy: ctx.user.id
    });
    return { message: "Response marked as processed" };
  })
});

// server/hunterResultsRouter.ts
import { z as z10 } from "zod";
init_db();
var hunterResultsRouter = router({
  // List all hunter results with filters
  list: publicProcedure.input(
    z10.object({
      reviewStatus: z10.enum(["all", "pending", "approved", "rejected"]).optional(),
      dataSource: z10.string().optional(),
      corporationId: z10.string().optional(),
      limit: z10.number().min(1).max(100).default(50),
      offset: z10.number().min(0).default(0)
    }).optional()
  ).query(async ({ ctx, input }) => {
    await requireStaffOrHigher(ctx);
    return listHunterResults(input || {});
  }),
  // Get single hunter result by ID
  getById: publicProcedure.input(z10.string()).query(async ({ ctx, input }) => {
    await requireStaffOrHigher(ctx);
    return getHunterResultById(input);
  }),
  // Update review status
  updateReviewStatus: publicProcedure.input(
    z10.object({
      id: z10.string(),
      reviewStatus: z10.enum(["pending", "approved", "rejected"])
    })
  ).mutation(async ({ ctx, input }) => {
    const user = await requireStaffOrHigher(ctx);
    return updateHunterResultReviewStatus(
      input.id,
      input.reviewStatus,
      user.id
    );
  }),
  // Add to CRM (create contact from hunter result)
  addToCRM: publicProcedure.input(z10.string()).mutation(async ({ ctx, input }) => {
    const user = await requireStaffOrHigher(ctx);
    return createContactFromHunterResult(input, user.id);
  }),
  // Get stats
  stats: publicProcedure.query(async ({ ctx }) => {
    await requireStaffOrHigher(ctx);
    return getHunterResultsStats();
  })
});

// server/calendarRouter.ts
import { z as z11 } from "zod";

// server/caldav.ts
import { createDAVClient } from "tsdav";
import ICAL from "ical.js";
var clientCache = /* @__PURE__ */ new Map();
async function getCalDAVClient(config) {
  const cacheKey = `${config.serverUrl}:${config.username}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }
  const client = await createDAVClient({
    serverUrl: config.serverUrl,
    credentials: {
      username: config.username,
      password: config.password
    },
    authMethod: "Basic",
    defaultAccountType: "caldav"
  });
  clientCache.set(cacheKey, client);
  return client;
}
async function fetchCalendarEvents(config, start, end, calendarName = "Calendar") {
  try {
    const client = await getCalDAVClient(config);
    const calendars = await client.fetchCalendars();
    const calendar = calendars.find(
      (cal) => cal.displayName === calendarName || cal.url.includes(calendarName)
    ) || calendars[0];
    if (!calendar) {
      console.warn(`No calendar found for ${config.username}`);
      return [];
    }
    const calendarObjects = await client.fetchCalendarObjects({
      calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
    return parseCalendarObjects(calendarObjects, config.username);
  } catch (error) {
    console.error(`Error fetching calendar for ${config.username}:`, error);
    return [];
  }
}
function parseCalendarObjects(objects, calendarOwner) {
  const events = [];
  for (const obj of objects) {
    try {
      if (!obj.data) continue;
      const jcalData = ICAL.parse(obj.data);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents("vevent");
      for (const vevent of vevents) {
        const event = new ICAL.Event(vevent);
        events.push({
          id: event.uid,
          summary: event.summary || "Untitled Event",
          description: event.description || void 0,
          start: event.startDate.toJSDate(),
          end: event.endDate.toJSDate(),
          location: event.location || void 0,
          attendees: event.attendees.map((att) => {
            const cn = att.getParameter("cn");
            const value = att.getFirstValue();
            return typeof cn === "string" ? cn : typeof value === "string" ? value : "";
          }).filter(Boolean),
          calendar: calendarOwner
        });
      }
    } catch (error) {
      console.error("Error parsing calendar object:", error);
    }
  }
  return events;
}
async function createCalendarEvent(config, event) {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];
  if (!calendar) {
    throw new Error("No calendar found");
  }
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const icsString = createICSString(uid, event);
  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: icsString
  });
  return uid;
}
async function updateCalendarEvent(config, eventId, event) {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];
  if (!calendar) {
    throw new Error("No calendar found");
  }
  const objects = await client.fetchCalendarObjects({ calendar });
  const existingObject = objects.find((obj) => obj.data?.includes(eventId));
  if (!existingObject) {
    throw new Error("Event not found");
  }
  const jcalData = ICAL.parse(existingObject.data);
  const comp = new ICAL.Component(jcalData);
  const vevent = comp.getFirstSubcomponent("vevent");
  if (!vevent) {
    throw new Error("No VEVENT found in calendar object");
  }
  const icalEvent = new ICAL.Event(vevent);
  const updatedEvent = {
    summary: event.summary || icalEvent.summary,
    description: event.description !== void 0 ? event.description : icalEvent.description,
    start: event.start || icalEvent.startDate.toJSDate(),
    end: event.end || icalEvent.endDate.toJSDate(),
    location: event.location !== void 0 ? event.location : icalEvent.location,
    attendees: event.attendees || icalEvent.attendees.map((att) => {
      const value = att.getFirstValue();
      return typeof value === "string" ? value : "";
    }).filter(Boolean)
  };
  const icsString = createICSString(eventId, updatedEvent);
  await client.updateCalendarObject({
    calendarObject: {
      ...existingObject,
      data: icsString
    }
  });
}
async function deleteCalendarEvent(config, eventId) {
  const client = await getCalDAVClient(config);
  const calendars = await client.fetchCalendars();
  const calendar = calendars[0];
  if (!calendar) {
    throw new Error("No calendar found");
  }
  const objects = await client.fetchCalendarObjects({ calendar });
  const objectToDelete = objects.find((obj) => obj.data?.includes(eventId));
  if (!objectToDelete) {
    throw new Error("Event not found");
  }
  await client.deleteCalendarObject({
    calendarObject: objectToDelete
  });
}
function createICSString(uid, event) {
  const comp = new ICAL.Component(["vcalendar", [], []]);
  comp.updatePropertyWithValue("prodid", "-//FRIDAY CRM//Calendar//EN");
  comp.updatePropertyWithValue("version", "2.0");
  const vevent = new ICAL.Component("vevent");
  vevent.updatePropertyWithValue("uid", uid);
  vevent.updatePropertyWithValue("summary", event.summary);
  if (event.description) {
    vevent.updatePropertyWithValue("description", event.description);
  }
  if (event.location) {
    vevent.updatePropertyWithValue("location", event.location);
  }
  const startTime = ICAL.Time.fromJSDate(event.start, false);
  vevent.updatePropertyWithValue("dtstart", startTime);
  const endTime = ICAL.Time.fromJSDate(event.end, false);
  vevent.updatePropertyWithValue("dtend", endTime);
  vevent.updatePropertyWithValue("dtstamp", ICAL.Time.now());
  comp.addSubcomponent(vevent);
  return comp.toString();
}

// server/calendarRouter.ts
init_db();
init_schema();
init_encryption();
var USER_COLOR = "#6b7280";
function getCalDAVConfig(calendarType) {
  if (calendarType === "team") {
    return {
      serverUrl: process.env.CALDAV_SERVER_URL || "",
      username: process.env.CALDAV_TEAM_USER || "",
      password: process.env.CALDAV_TEAM_PASSWORD || ""
    };
  }
  const users2 = (process.env.CALDAV_USERS || "").split(",").filter(Boolean);
  const userIndex = users2.indexOf(calendarType);
  if (userIndex === -1) {
    return null;
  }
  const username = calendarType.split("@")[0];
  const domain = calendarType.split("@")[1] || "bl2020.com";
  const baseUrl = process.env.CALDAV_BASE_URL || "https://mail.bl2020.com";
  const serverUrl = `${baseUrl}/webdav/principals/${domain}/${username}/`;
  return {
    serverUrl,
    username: calendarType,
    // Full email as username
    password: process.env.CALDAV_USER_PASSWORD || ""
  };
}
async function getAllCalendarConfigs() {
  const configs = [];
  const db = await getDb();
  if (!db) return configs;
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    passwordHash: users.passwordHash
  }).from(users);
  for (const user of allUsers) {
    if (!user.email || !user.passwordHash) continue;
    const parts = user.passwordHash.split("|");
    if (parts.length < 2) continue;
    try {
      const encryptedPassword = parts[1];
      const password = decryptPassword(encryptedPassword);
      const username = user.email.split("@")[0];
      const domain = user.email.split("@")[1] || "bl2020.com";
      const baseUrl = process.env.CALDAV_BASE_URL || "https://mail.bl2020.com";
      const serverUrl = `${baseUrl}/webdav/principals/${domain}/${username}/`;
      configs.push({
        type: user.email,
        config: {
          serverUrl,
          username: user.email,
          password
        },
        color: USER_COLOR
      });
    } catch (error) {
      console.error(`Failed to decrypt password for user ${user.id}:`, error);
    }
  }
  return configs;
}
var calendarRouter = router({
  /**
   * Get all events from all calendars (team + individual)
   */
  getEvents: protectedProcedure.input(z11.object({
    start: z11.string(),
    end: z11.string(),
    calendars: z11.array(z11.string()).optional()
    // Filter by calendar types
  })).query(async ({ input }) => {
    const start = new Date(input.start);
    const end = new Date(input.end);
    const allConfigs = await getAllCalendarConfigs();
    let filteredConfigs = allConfigs;
    if (input.calendars) {
      const hasTeamView = input.calendars.includes("__team_view__");
      const otherCalendars = input.calendars.filter((c) => c !== "__team_view__");
      if (hasTeamView && otherCalendars.length > 0) {
        filteredConfigs = allConfigs;
      } else if (hasTeamView) {
        filteredConfigs = allConfigs;
      } else {
        filteredConfigs = allConfigs.filter((c) => input.calendars.includes(c.type));
      }
    }
    const eventsPromises = filteredConfigs.map(async ({ type, config, color }) => {
      const events = await fetchCalendarEvents(config, start, end);
      const userPrefix = type.split("@")[0].toUpperCase();
      return events.map((event) => ({
        ...event,
        title: `${userPrefix}: ${event.title}`,
        // Add user prefix to title
        calendar: type,
        color
      }));
    });
    const eventsArrays = await Promise.all(eventsPromises);
    const allEvents = eventsArrays.flat();
    return allEvents;
  }),
  /**
   * Get list of available calendars
   */
  getCalendars: protectedProcedure.query(async () => {
    const configs = await getAllCalendarConfigs();
    const calendars = configs.map(({ type, color }) => ({
      id: type,
      name: type === "team" ? "Team-Kalender" : type.split("@")[0],
      color,
      type: type === "team" ? "team" : "individual"
    }));
    calendars.unshift({
      id: "__team_view__",
      name: "Team (Alle)",
      color: "#6b7280",
      type: "team_view"
    });
    return calendars;
  }),
  /**
   * Create a new event
   */
  createEvent: protectedProcedure.input(z11.object({
    calendar: z11.string(),
    summary: z11.string(),
    description: z11.string().optional(),
    start: z11.string(),
    end: z11.string(),
    location: z11.string().optional(),
    attendees: z11.array(z11.string()).optional()
  })).mutation(async ({ input }) => {
    const config = getCalDAVConfig(input.calendar);
    if (!config) {
      throw new Error("Calendar not found");
    }
    const eventId = await createCalendarEvent(config, {
      summary: input.summary,
      description: input.description,
      start: new Date(input.start),
      end: new Date(input.end),
      location: input.location,
      attendees: input.attendees
    });
    return { success: true, eventId };
  }),
  /**
   * Update an existing event
   */
  updateEvent: protectedProcedure.input(z11.object({
    calendar: z11.string(),
    eventId: z11.string(),
    summary: z11.string().optional(),
    description: z11.string().optional(),
    start: z11.string().optional(),
    end: z11.string().optional(),
    location: z11.string().optional(),
    attendees: z11.array(z11.string()).optional()
  })).mutation(async ({ input }) => {
    const config = getCalDAVConfig(input.calendar);
    if (!config) {
      throw new Error("Calendar not found");
    }
    await updateCalendarEvent(config, input.eventId, {
      summary: input.summary,
      description: input.description,
      start: input.start ? new Date(input.start) : void 0,
      end: input.end ? new Date(input.end) : void 0,
      location: input.location,
      attendees: input.attendees
    });
    return { success: true };
  }),
  /**
   * Delete an event
   */
  deleteEvent: protectedProcedure.input(z11.object({
    calendar: z11.string(),
    eventId: z11.string()
  })).mutation(async ({ input }) => {
    const config = getCalDAVConfig(input.calendar);
    if (!config) {
      throw new Error("Calendar not found");
    }
    await deleteCalendarEvent(config, input.eventId);
    return { success: true };
  })
});

// server/routers.ts
init_db();
import { TRPCError as TRPCError9 } from "@trpc/server";
import { z as z12 } from "zod";
var adminProcedure3 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError9({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});
var salesProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["admin", "sales_manager", "external_sales"].includes(ctx.user.role)) {
    throw new TRPCError9({ code: "FORBIDDEN", message: "Sales access required" });
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
  users: userRouter,
  templates: templatesRouter,
  drafts: draftsRouter,
  responses: responsesRouter,
  hunterResults: hunterResultsRouter,
  calendar: calendarRouter,
  // ==========================================================================
  // CORPORATIONS
  // ==========================================================================
  corporations: router({
    list: salesProcedure.query(async ({ ctx }) => {
      return await getCorporations(ctx.user.id);
    }),
    get: salesProcedure.input(z12.object({ id: z12.string() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.id);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getCorporation(input.id);
    }),
    create: salesProcedure.input(z12.object({
      name: z12.string(),
      headquartersCountry: z12.string().optional(),
      totalRevenueEur: z12.number().optional(),
      industry: z12.string().optional(),
      website: z12.string().optional(),
      linkedinUrl: z12.string().optional(),
      status: z12.string().optional(),
      priority: z12.string().optional(),
      notes: z12.string().optional()
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
    update: salesProcedure.input(z12.object({
      id: z12.string(),
      name: z12.string().optional(),
      headquartersCountry: z12.string().optional(),
      totalRevenueEur: z12.number().optional(),
      industry: z12.string().optional(),
      website: z12.string().optional(),
      linkedinUrl: z12.string().optional(),
      status: z12.string().optional(),
      priority: z12.string().optional(),
      notes: z12.string().optional(),
      // Genesis World CRM Felder
      companySize: z12.string().optional(),
      stage: z12.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.id);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
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
    listByCorporation: salesProcedure.input(z12.object({ corporationId: z12.string() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getCompaniesByCorporation(input.corporationId);
    }),
    get: salesProcedure.input(z12.object({ id: z12.string() })).query(async ({ input }) => {
      return await getCompany(input.id);
    }),
    create: salesProcedure.input(z12.object({
      corporationId: z12.string(),
      name: z12.string(),
      legalForm: z12.string().optional(),
      country: z12.string().optional(),
      city: z12.string().optional(),
      address: z12.string().optional(),
      revenueEur: z12.number().optional(),
      products: z12.string().optional(),
      website: z12.string().optional(),
      notes: z12.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
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
    update: salesProcedure.input(z12.object({
      id: z12.string(),
      name: z12.string().optional(),
      legalForm: z12.string().optional(),
      country: z12.string().optional(),
      city: z12.string().optional(),
      address: z12.string().optional(),
      revenueEur: z12.number().optional(),
      products: z12.string().optional(),
      website: z12.string().optional(),
      notes: z12.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateCompany(id, data);
    })
  }),
  // ==========================================================================
  // CONTACTS
  // ==========================================================================
  contacts: router({
    list: salesProcedure.query(async () => {
      return await getAllContacts();
    }),
    listByCompany: salesProcedure.input(z12.object({ companyId: z12.string() })).query(async ({ input }) => {
      return await getContactsByCompany(input.companyId);
    }),
    get: salesProcedure.input(z12.object({ id: z12.string() })).query(async ({ input }) => {
      return await getContact(input.id);
    }),
    getCompanies: salesProcedure.input(z12.object({ contactId: z12.string() })).query(async ({ input }) => {
      return await getCompaniesByContact(input.contactId);
    }),
    create: salesProcedure.input(z12.object({
      companyId: z12.string(),
      firstName: z12.string(),
      lastName: z12.string(),
      jobTitle: z12.string().optional(),
      email: z12.string().optional(),
      position: z12.string().optional(),
      phone: z12.string().optional(),
      mobile: z12.string().optional(),
      linkedinUrl: z12.string().optional(),
      decisionMaker: z12.boolean().optional(),
      contactStatus: z12.string().optional(),
      notes: z12.string().optional(),
      // Genesis World CRM Felder
      keyword1: z12.string().optional(),
      keyword2: z12.string().optional(),
      companySize: z12.string().optional(),
      responsiblePerson: z12.string().optional(),
      function: z12.string().optional(),
      department: z12.string().optional(),
      category: z12.string().optional(),
      tags: z12.string().optional(),
      phoneBusiness: z12.string().optional(),
      phoneMobile: z12.string().optional(),
      phoneOffice: z12.string().optional(),
      faxOffice: z12.string().optional()
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
    addCompany: salesProcedure.input(z12.object({
      contactId: z12.string(),
      companyId: z12.string(),
      email: z12.string().optional(),
      position: z12.string().optional(),
      isPrimary: z12.boolean().optional()
    })).mutation(async ({ input }) => {
      return await addContactToCompany(
        input.contactId,
        input.companyId,
        input.email,
        input.position,
        input.isPrimary
      );
    }),
    update: salesProcedure.input(z12.object({
      id: z12.string(),
      firstName: z12.string().optional(),
      lastName: z12.string().optional(),
      jobTitle: z12.string().optional(),
      phone: z12.string().optional(),
      mobile: z12.string().optional(),
      linkedinUrl: z12.string().optional(),
      decisionMaker: z12.boolean().optional(),
      contactStatus: z12.string().optional(),
      notes: z12.string().optional(),
      // Genesis World CRM Felder
      keyword1: z12.string().optional(),
      keyword2: z12.string().optional(),
      companySize: z12.string().optional(),
      responsiblePerson: z12.string().optional(),
      function: z12.string().optional(),
      department: z12.string().optional(),
      category: z12.string().optional(),
      tags: z12.string().optional(),
      phoneBusiness: z12.string().optional(),
      phoneMobile: z12.string().optional(),
      phoneOffice: z12.string().optional(),
      faxOffice: z12.string().optional()
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
    listByCorporation: salesProcedure.input(z12.object({ corporationId: z12.string() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getDealsByCorporation(input.corporationId);
    }),
    listByCompany: salesProcedure.input(z12.object({ companyId: z12.string() })).query(async ({ ctx, input }) => {
      return await getDealsByCompany(input.companyId);
    }),
    create: salesProcedure.input(z12.object({
      corporationId: z12.string(),
      companyId: z12.string().optional(),
      dealName: z12.string(),
      dealValueEur: z12.string(),
      // decimal as string
      stage: z12.string().optional(),
      probability: z12.number().optional(),
      expectedCloseDate: z12.date().optional(),
      subscriptionTier: z12.string().optional(),
      notes: z12.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
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
    updateStage: salesProcedure.input(z12.object({
      dealId: z12.string(),
      stage: z12.string()
    })).mutation(async ({ input }) => {
      return await updateDealStage(input.dealId, input.stage);
    })
  }),
  // ==========================================================================
  // ACTIVITIES
  // ==========================================================================
  activities: router({
    recent: salesProcedure.input(z12.object({ limit: z12.number().optional() })).query(async ({ ctx, input }) => {
      return await getRecentActivities(ctx.user.id, input.limit || 5);
    }),
    listByCorporation: salesProcedure.input(z12.object({ corporationId: z12.string(), limit: z12.number().optional() })).query(async ({ ctx, input }) => {
      const canAccess = await canUserAccessCorporation(ctx.user.id, input.corporationId);
      if (!canAccess) {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await getActivitiesByCorporation(input.corporationId, input.limit);
    }),
    listByContact: salesProcedure.input(z12.object({ contactId: z12.string(), limit: z12.number().optional() })).query(async ({ ctx, input }) => {
      return await getActivitiesByContact(input.contactId, input.limit);
    }),
    listByCompany: salesProcedure.input(z12.object({ companyId: z12.string(), limit: z12.number().optional() })).query(async ({ ctx, input }) => {
      return await getActivitiesByCompany(input.companyId, input.limit);
    }),
    create: salesProcedure.input(z12.object({
      corporationId: z12.string().optional(),
      companyId: z12.string().optional(),
      contactId: z12.string().optional(),
      activityType: z12.string(),
      subject: z12.string(),
      content: z12.string().optional(),
      direction: z12.string().optional(),
      outcome: z12.string().optional()
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
      if (ctx.user.role !== "staff_plus") {
        throw new TRPCError9({ code: "FORBIDDEN", message: "Only for staff+" });
      }
      return await getCommissionsByUser(ctx.user.id);
    })
  }),
  // ==========================================================================
  // GLOBAL SEARCH
  // ==========================================================================
  search: router({
    global: protectedProcedure.input(z12.object({ query: z12.string() })).query(async ({ input }) => {
      return await globalSearch(input.query);
    })
  })
});

// server/_core/context.ts
init_db();
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
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "..", "public");
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
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}
startServer().catch(console.error);
