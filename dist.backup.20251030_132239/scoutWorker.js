var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};

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

// server/scoutDb.ts
init_db();
init_schema();
import { eq as eq2, desc as desc2, and as and2, sql as sql2 } from "drizzle-orm";
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
async function updateScoutQueueJob(id, updates) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scoutQueue).set(updates).where(eq2(scoutQueue.id, id));
}

// server/scoutWorker.ts
init_db();
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});
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
export {
  processNextQueueJob
};
