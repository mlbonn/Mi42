import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  corporations, companies, contacts, contactCompanyRelations, contactEmails,
  deals, activities, productUsage, partners, partnerDeals,
  userAccountAssignments, commissions, apiKeys,
  emailTemplates, emailDrafts, emailResponses, emailAccountsOld as emailAccounts,
  emailProjectLinks,
  projectTimesheets,
  projectBudgetPlans, emailAccountsNew, emailFetchLog,
  hunterResults,
  type Corporation, type Company, type Contact, type Deal, type Activity
} from "../drizzle/schema";
import { scoutSettings } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      id: user.id,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    // Auto-assign admin role to owner
    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = 'admin';
        values.role = 'admin';
        updateSet.role = 'admin';
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById_OLD(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUser(id: string) {
  // DEV_MODE: Return fake user
  if (process.env.DEV_MODE === 'true') {
    console.log('[DEV_MODE] getUser returning fake user for:', id);
    return {
      id: 'manus',
      email: 'manus@friday-crm.com',
      name: 'Manus Admin',
      role: 'admin',
      loginMethod: 'dev',
      lastSignedIn: new Date(),
    };
  }
  
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function canUserAccessCorporation(userId: string, corporationId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const user = await getUserById_OLD(userId);
  if (!user) return false;

  // Admin and Sales Manager can access all
  if (user.role === 'admin' || user.role === 'super_admin') return true;

  // External Sales: Check assignment
  if (user.role === 'staff_plus') {
    const assignment = await db
      .select()
      .from(userAccountAssignments)
      .where(
        and(
          eq(userAccountAssignments.userId, userId),
          eq(userAccountAssignments.corporationId, corporationId)
        )
      )
      .limit(1);
    return assignment.length > 0;
  }

  return false;
}

// ============================================================================
// CORPORATIONS
// ============================================================================

export async function getCorporations(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const user = await getUserById_OLD(userId);
  if (!user) return [];

  // Admin & Sales Manager: All corporations
  if (user.role === 'admin' || user.role === 'super_admin') {
    return await db.select().from(corporations).orderBy(desc(corporations.createdAt));
  }

  // External Sales: Only assigned
  if (user.role === 'staff_plus') {
    const assignments = await db
      .select({ corporationId: userAccountAssignments.corporationId })
      .from(userAccountAssignments)
      .where(eq(userAccountAssignments.userId, userId));
    
    if (assignments.length === 0) return [];
    
    const corpIds = assignments.map(a => a.corporationId);
    return await db
      .select()
      .from(corporations)
      .where(inArray(corporations.id, corpIds))
      .orderBy(desc(corporations.createdAt));
  }

  return [];
}

// Get all corporations (for Scout Worker - no auth required)
export async function getAllCorporations() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(corporations).orderBy(desc(corporations.createdAt));
}

export async function getCorporation(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(corporations).where(eq(corporations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCorporation(data: Omit<Corporation, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(corporations).values({ ...data, id });
  
  // Return the created corporation
  const created = await db.select().from(corporations).where(eq(corporations.id, id)).limit(1);
  if (!created || created.length === 0) {
    throw new Error("Failed to retrieve created corporation");
  }
  return created[0];
}

export async function updateCorporation(id: string, data: Partial<Corporation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(corporations).set(data).where(eq(corporations.id, id));
}

// ============================================================================
// COMPANIES
// ============================================================================

export async function getCompaniesByCorporation(corporationId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(companies)
    .where(eq(companies.corporationId, corporationId))
    .orderBy(companies.name);
}

export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: companies.id,
      name: companies.name,
      corporationId: companies.corporationId,
      corporationName: corporations.name,
      industry: corporations.industry,
      stage: corporations.stage,
      country: companies.country,
      city: companies.city,
      revenueEur: companies.revenueEur,
      products: companies.products,
    })
    .from(companies)
    .leftJoin(corporations, eq(companies.corporationId, corporations.id));
}

export async function getCompany(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(companies).values(data);
  return result;
}

export async function updateCompany(id: string, data: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(companies).set(data).where(eq(companies.id, id));
  return await getCompany(id);
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function getAllContacts() {
  const db = await getDb();
  if (!db) return [];

  const allContacts = await db.select().from(contacts);
  
  // For each contact, get primary email and position from relations
  const contactsWithDetails = await Promise.all(
    allContacts.map(async (contact) => {
      const relations = await db
        .select()
        .from(contactCompanyRelations)
        .where(eq(contactCompanyRelations.contactId, contact.id))
        .limit(1);
      
      return {
        ...contact,
        primaryEmail: relations[0]?.email || null,
        primaryPhone: contact.phone || contact.mobile || null,
        position: relations[0]?.position || null,
      };
    })
  );
  
  return contactsWithDetails;
}

export async function getContactsByCompany(companyId: string) {
  const db = await getDb();
  if (!db) return [];

  const relations = await db
    .select({
      contact: contacts,
      relation: contactCompanyRelations,
    })
    .from(contactCompanyRelations)
    .innerJoin(contacts, eq(contactCompanyRelations.contactId, contacts.id))
    .where(eq(contactCompanyRelations.companyId, companyId));

  return relations.map(r => ({
    ...r.contact,
    email: r.relation.email,
    position: r.relation.position,
    isPrimary: r.relation.isPrimary,
  }));
}

export async function getCompaniesByContact(contactId: string) {
  const db = await getDb();
  if (!db) return [];

  const relations = await db
    .select({
      company: companies,
      relation: contactCompanyRelations,
    })
    .from(contactCompanyRelations)
    .innerJoin(companies, eq(contactCompanyRelations.companyId, companies.id))
    .where(eq(contactCompanyRelations.contactId, contactId));

  return relations.map(r => ({
    ...r.company,
    email: r.relation.email,
    position: r.relation.position,
    isPrimary: r.relation.isPrimary,
  }));
}

export async function getContact(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  if (result.length === 0) return undefined;
  
  const contact = result[0];
  
  // Get position from contact_company_relations (primary relation)
  const relations = await db
    .select()
    .from(contactCompanyRelations)
    .where(eq(contactCompanyRelations.contactId, id))
    .limit(1);
  
  return {
    ...contact,
    position: relations[0]?.position || null,
  };
}

export async function createContact(
  contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>,
  companyId: string,
  email?: string,
  position?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Generate UUID for contact
    const contactId = crypto.randomUUID();
    
    // Insert contact
    console.log('[createContact] Inserting contact:', { ...contactData, id: contactId });
    await db.insert(contacts).values({ ...contactData, id: contactId });
    console.log('[createContact] Contact created with ID:', contactId);

    // Link to company only if companyId is provided
    if (companyId && companyId.trim() !== '') {
      console.log('[createContact] Linking to company:', { contactId, companyId, email, position });
      const relationResult = await db.insert(contactCompanyRelations).values({
        contactId,
        companyId,
        email,
        position,
        isPrimary: true,
      });
      console.log('[createContact] Relation created:', relationResult);
    } else {
      console.log('[createContact] No company provided, creating standalone contact');
    }

    return contactId;
  } catch (error) {
    console.error('[createContact] Error:', error);
    throw error;
  }
}

export async function addContactToCompany(
  contactId: string,
  companyId: string,
  email?: string,
  position?: string,
  isPrimary?: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if relation already exists
  const existing = await db
    .select()
    .from(contactCompanyRelations)
    .where(
      and(
        eq(contactCompanyRelations.contactId, contactId),
        eq(contactCompanyRelations.companyId, companyId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Contact is already linked to this company");
  }

  // If this is set as primary, unset other primary relations
  if (isPrimary) {
    await db
      .update(contactCompanyRelations)
      .set({ isPrimary: false })
      .where(eq(contactCompanyRelations.contactId, contactId));
  }

  // Create new relation
  await db.insert(contactCompanyRelations).values({
    contactId,
    companyId,
    email,
    position,
    isPrimary: isPrimary || false,
  });

  return { success: true };
}

export async function updateContact(id: string, data: Partial<Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contacts).set(data).where(eq(contacts.id, id));
  return await getContact(id);
}

// ============================================================================
// DEALS
// ============================================================================

export async function getDealsByCorporation(corporationId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(deals)
    .where(eq(deals.corporationId, corporationId))
    .orderBy(desc(deals.createdAt));
}

export async function getDealsByCompany(companyId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(deals)
    .where(eq(deals.companyId, companyId))
    .orderBy(desc(deals.createdAt));
}

export async function getDealsByUser(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const user = await getUserById_OLD(userId);
  if (!user) return [];

  // Admin & Sales Manager: All deals
  if (user.role === 'admin' || user.role === 'super_admin') {
    return await db.select().from(deals).orderBy(desc(deals.createdAt));
  }

  // External Sales: Only own deals
  if (user.role === 'staff_plus') {
    return await db
      .select()
      .from(deals)
      .where(eq((deals as any).createdBy, userId))
      .orderBy(desc(deals.createdAt));
  }

  return [];
}

export async function createDeal(data: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dealData = {
    ...data,
    createdBy: userId,
  };

  const result = await db.insert(deals).values(dealData);
  const dealId = result[0].insertId.toString();

  // If created by external sales, create commission
  const user = await getUserById_OLD(userId);
  if (user?.role === 'staff_plus' && data.dealValueEur) {
    const commissionPercent = 10; // 10%
    const commissionAmount = Number(data.dealValueEur) * (commissionPercent / 100);

    await db.insert(commissions).values({
      userId,
      dealId,
      commissionPercent: commissionPercent.toString(),
      commissionAmount: commissionAmount.toString(),
      paid: false,
    });
  }

  return dealId;
}

export async function updateDealStage(dealId: string, stage: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(deals).set({ stage }).where(eq(deals.id, dealId));
}

// ============================================================================
// ACTIVITIES
// ============================================================================

export async function getActivitiesByCorporation(corporationId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(activities)
    .where(eq(activities.corporationId, corporationId))
    .orderBy(desc(activities.activityDate))
    .limit(limit);
}

export async function getActivitiesByContact(contactId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(activities)
    .where(eq(activities.contactId, contactId))
    .orderBy(desc(activities.activityDate))
    .limit(limit);
}

export async function getActivitiesByCompany(companyId: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(activities)
    .where(eq(activities.companyId, companyId))
    .orderBy(desc(activities.activityDate))
    .limit(limit);
}

export async function getRecentActivities(userId: string, limit = 5) {
  const db = await getDb();
  if (!db) return [];

  // Get user's assigned corporations
  const user = await getUserById_OLD(userId);
  if (!user) return [];

  // Admin sees all activities, others see only their assigned corporations
  if (user.role === 'admin') {
    return await db
      .select()
      .from(activities)
      .orderBy(desc(activities.activityDate))
      .limit(limit);
  }

  const assignedCorps = await getAssignedCorporations(userId);
  if (assignedCorps.length === 0) return [];

  const corpIds = assignedCorps.map(c => c.id);
  return await db
    .select()
    .from(activities)
    .where(inArray(activities.corporationId, corpIds))
    .orderBy(desc(activities.activityDate))
    .limit(limit);
}

export async function createActivity(data: Omit<Activity, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(activities).values(data);
  return result;
}

// ============================================================================
// COMMISSIONS (External Sales)
// ============================================================================

export async function getCommissionsByUser(userId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(commissions)
    .where(eq(commissions.userId, userId))
    .orderBy(desc(commissions.createdAt));
}

// ============================================================================
// USER ACCOUNT ASSIGNMENTS
// ============================================================================

export async function assignUserToCorporations(userId: string, corporationIds: string[], assignedBy: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assignments = corporationIds.map(corpId => ({
    userId,
    corporationId: corpId,
    assignedBy,
  }));

  await db.insert(userAccountAssignments).values(assignments);
}

export async function getAssignedCorporations(userId: string) {
  const db = await getDb();
  if (!db) return [];

  const assignments = await db
    .select({ corporationId: userAccountAssignments.corporationId })
    .from(userAccountAssignments)
    .where(eq(userAccountAssignments.userId, userId));

  if (assignments.length === 0) return [];

  const corpIds = assignments.map(a => a.corporationId);
  return await db
    .select()
    .from(corporations)
    .where(inArray(corporations.id, corpIds));
}

// ============================================================================
// STATS & ANALYTICS
// ============================================================================

export async function getDashboardStats(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const user = await getUserById_OLD(userId);
  if (!user) return null;

  // Total corporations
  const corps = await getCorporations(userId);
  const totalCorporations = corps.length;

  // Total contacts
  const allContacts = await getAllContacts();
  const totalContacts = allContacts.length;

  // Total deals
  const userDeals = await getDealsByUser(userId);
  const totalDeals = userDeals.length;

  // Deals by stage
  const dealsByStage = userDeals.reduce((acc, deal) => {
    acc[deal.stage || 'Unknown'] = (acc[deal.stage || 'Unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Total deal value
  const totalDealValue = userDeals.reduce((sum, deal) => {
    return sum + (Number(deal.dealValueEur) || 0);
  }, 0);

  // For external sales: commissions
  let totalCommission = 0;
  let paidCommission = 0;
  if (user.role === 'staff_plus') {
    const userCommissions = await getCommissionsByUser(userId);
    totalCommission = userCommissions.reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
    paidCommission = userCommissions.filter(c => c.paid).reduce((sum, c) => sum + Number(c.commissionAmount || 0), 0);
  }

  return {
    totalCorporations,
    totalContacts,
    totalDeals,
    dealsByStage,
    totalDealValue,
    totalCommission,
    paidCommission,
    pendingCommission: totalCommission - paidCommission,
  };
}



// ============================================================================
// SIMPLE AUTH HELPERS
// ============================================================================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).where(eq(users.email, email)).limit(1);
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Try to find by username field first
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (result.length > 0) return result;
  
  // Fallback: try email if it looks like a username
  return await db.select().from(users).where(eq(users.email, username)).limit(1);
}

export async function getUserById(id: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users).where(eq(users.id, id)).limit(1);
}

export async function getUserByIdSingle(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createUserWithPassword(user: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  lastSignedIn: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(users).values({
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
    role: user.role as any,
    lastSignedIn: user.lastSignedIn,
  });
}

export async function updateUserLastSignedIn(userId: string) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}


// ============================================================================
// GLOBAL SEARCH
// ============================================================================

export async function globalSearch(query: string, limit = 10) {
  const db = await getDb();
  if (!db || query.length < 2) return { corporations: [], companies: [], contacts: [] };

  const searchTerm = `%${query.toLowerCase()}%`;

  // Search Corporations
  const corporationsResult = await db
    .select()
    .from(corporations)
    .where(
      sql`LOWER(${corporations.name}) LIKE ${searchTerm} 
          OR LOWER(${corporations.industry}) LIKE ${searchTerm}
          OR LOWER(${corporations.headquartersCountry}) LIKE ${searchTerm}`
    )
    .limit(limit);

  // Search Companies
  const companiesResult = await db
    .select()
    .from(companies)
    .where(
      sql`LOWER(${companies.name}) LIKE ${searchTerm}
          OR LOWER(${companies.city}) LIKE ${searchTerm}
          OR LOWER(${companies.country}) LIKE ${searchTerm}
          OR LOWER(${companies.products}) LIKE ${searchTerm}`
    )
    .limit(limit);

  // Search Contacts
  const contactsResult = await db
    .select()
    .from(contacts)
    .where(
      sql`LOWER(${contacts.firstName}) LIKE ${searchTerm}
          OR LOWER(${contacts.lastName}) LIKE ${searchTerm}
          OR LOWER(${contacts.jobTitle}) LIKE ${searchTerm}`
    )
    .limit(limit);

  return {
    corporations: corporationsResult,
    companies: companiesResult,
    contacts: contactsResult,
  };
}


// ============================================================================
// API KEYS MANAGEMENT
// ============================================================================

export async function getApiKeys(userId: string) {
  const db = await getDb();
  if (!db) return {};

  const result = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .limit(1);

  if (result.length === 0) return {};

  const keys = result[0];
  return {
    // LLM APIs
    openai: keys.openaiKey || '',
    anthropic: keys.anthropicKey || '',
    google: keys.googleKey || '',
    mistral: keys.mistralKey || '',
    groq: keys.groqKey || '',
    ollama: keys.ollamaKey || '',
    ollama_url: keys.ollamaUrl || '',
    defaultLlmProvider: keys.defaultLlmProvider || 'openai',
    // Lead Generation APIs
    apollo: keys.apolloKey || '',
    linkedin: keys.linkedinKey || '',
    hunter: keys.hunterKey || '',
    zerobounce: keys.zerobounceKey || '',
    // SMTP
    smtp_host: keys.smtpHost || '',
    smtp_port: keys.smtpPort || '',
    smtp_user: keys.smtpUser || '',
    smtp_password: keys.smtpPassword || '',
  };
}

export async function saveApiKeys(userId: string, keys: Record<string, string>) {
  const db = await getDb();
  if (!db) return;

  // Check if user already has keys
  const existing = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .limit(1);

  const data = {
    userId: userId,
    // LLM APIs
    openaiKey: keys.openai || null,
    anthropicKey: keys.anthropic || null,
    googleKey: keys.google || null,
    mistralKey: keys.mistral || null,
    groqKey: keys.groq || null,
    ollamaKey: keys.ollama || null,
    ollamaUrl: keys.ollama_url || null,
    defaultLlmProvider: keys.defaultLlmProvider || 'openai',
    // Lead Generation APIs
    apolloKey: keys.apollo || null,
    linkedinKey: keys.linkedin || null,
    hunterKey: keys.hunter || null,
    zerobounceKey: keys.zerobounce || null,
    // SMTP
    smtpHost: keys.smtp_host || null,
    smtpPort: keys.smtp_port || null,
    smtpUser: keys.smtp_user || null,
    smtpPassword: keys.smtp_password || null,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    // Update existing
    await db
      .update(apiKeys)
      .set(data)
      .where(eq(apiKeys.userId, userId));
  } else {
    // Insert new
    await db.insert(apiKeys).values({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    });
  }
}



// ============================================================================
// SCOUT SETTINGS
// ============================================================================

export async function getScoutSettings(userId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(scoutSettings)
    .where(eq(scoutSettings.userId, userId))
    .limit(1);

  if (result.length === 0) {
    // Return defaults
    return {
      minRevenueMio: 100,
      minEmployees: 500,
      companyTypes: ["Manufacturer"],
      targetMarkets: ["DE", "US", "UK", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "PL", "SE", "DK", "NO", "FI"],
    };
  }

  return result[0];
}

export async function saveScoutSettings(
  userId: string,
  settings: {
    minRevenueMio: number;
    minEmployees: number;
    companyTypes: string[];
    targetMarkets: string[];
  }
) {
  const db = await getDb();
  if (!db) return;

  // Check if user already has settings
  const existing = await db
    .select()
    .from(scoutSettings)
    .where(eq(scoutSettings.userId, userId))
    .limit(1);

  const data = {
    userId: userId,
    minRevenueMio: settings.minRevenueMio,
    minEmployees: settings.minEmployees,
    companyTypes: settings.companyTypes,
    targetMarkets: settings.targetMarkets,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    // Update existing
    await db
      .update(scoutSettings)
      .set(data)
      .where(eq(scoutSettings.userId, userId));
  } else {
    // Insert new
    await db.insert(scoutSettings).values({
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    });
  }
}



// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users);
}

// getUserById and getUserByEmail already exist above

export async function createUser(data: {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: 'super_admin' | 'admin' | 'staff' | 'staff_plus';
  status: string;
  assignedTo?: string;
  loginMethod: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.insert(users).values(data);
  return data.id;
}

export async function updateUser(userId: string, data: Partial<{
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff' | 'staff_plus';
  status: string;
  assignedTo: string;
  passwordHash: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function deleteUser(userId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Delete user (CASCADE DELETE handles related records)
  await db.delete(users).where(eq(users.id, userId));
}

// userAssignments functions removed - table no longer exists




// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export async function getAllEmailTemplates() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db
    .select()
    .from(emailTemplates)
    .orderBy(desc(emailTemplates.createdAt));
}

export async function getEmailTemplateById(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, id))
    .limit(1);
  
  return results[0] || null;
}

export async function createEmailTemplate(data: {
  name: string;
  description?: string | null;
  subject: string;
  body: string;
  language?: string;
  variables?: string | null;
  category?: string | null;
  createdBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const id = crypto.randomUUID();
  await db.insert(emailTemplates).values({
    id,
    ...data,
  });
  
  return { id };
}

export async function updateEmailTemplate(id: string, data: Partial<{
  name: string;
  description: string | null;
  subject: string;
  body: string;
  language: string;
  variables: string | null;
  category: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(emailTemplates)
    .set(data)
    .where(eq(emailTemplates.id, id));
}

export async function deleteEmailTemplate(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .delete(emailTemplates)
    .where(eq(emailTemplates.id, id));
}

// ============================================================================
// EMAIL DRAFTS
// ============================================================================

export async function getAllEmailDrafts() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db
    .select()
    .from(emailDrafts)
    .orderBy(desc(emailDrafts.createdAt));
}

export async function getEmailDraftById(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results = await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.id, id))
    .limit(1);
  
  return results[0] || null;
}

export async function getEmailDraftsByStatus(status: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.reviewStatus, status as any))
    .orderBy(desc(emailDrafts.createdAt));
}

export async function updateEmailDraft(id: string, data: Partial<{
  subject: string | null;
  body: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'sent';
  reviewedBy: string | null;
  sentBy: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(emailDrafts)
    .set({
      ...data,
      reviewedAt: data.reviewStatus ? new Date() : undefined,
      sentAt: data.reviewStatus === 'sent' ? new Date() : undefined,
    })
    .where(eq(emailDrafts.id, id));
}

export async function deleteEmailDraft(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .delete(emailDrafts)
    .where(eq(emailDrafts.id, id));
}

// ============================================================================
// EMAIL RESPONSES
// ============================================================================

export async function getAllEmailResponses() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db
    .select()
    .from(emailResponses)
    .orderBy(desc(emailResponses.receivedAt));
}

export async function getEmailResponseById(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results = await db
    .select()
    .from(emailResponses)
    .where(eq(emailResponses.id, id))
    .limit(1);
  
  return results[0] || null;
}

export async function getEmailResponsesByContact(contactId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db
    .select()
    .from(emailResponses)
    .where(eq(emailResponses.contactId, contactId))
    .orderBy(desc(emailResponses.receivedAt));
}

export async function updateEmailResponse(id: string, data: Partial<{
  sentiment: 'positive' | 'neutral' | 'negative' | 'interested' | 'not_interested';
  requiresAction: boolean;
  actionType: string | null;
  processedBy: string | null;
  notes: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(emailResponses)
    .set({
      ...data,
      processedAt: data.processedBy ? new Date() : undefined,
    })
    .where(eq(emailResponses.id, id));
}



// ============================================================================
// HUNTER RESULTS
// ============================================================================

export async function listHunterResults(filters: {
  reviewStatus?: "all" | "pending" | "approved" | "rejected";
  dataSource?: string;
  corporationId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { reviewStatus = "all", dataSource, corporationId, limit = 50, offset = 0 } = filters;
  
  let query: any = db.select().from(hunterResults);
  
  if (reviewStatus !== "all") {
    query = query.where(eq(hunterResults.reviewStatus, reviewStatus as any));
  }
  
  if (dataSource) {
    query = query.where(eq(hunterResults.dataSource, dataSource));
  }
  
  if (corporationId) {
    query = query.where(eq(hunterResults.corporationId, corporationId));
  }
  
  const results = await query
    .orderBy(desc(hunterResults.createdAt))
    .limit(limit)
    .offset(offset);
    
  return results;
}

export async function getHunterResultById(id: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results = await db
    .select()
    .from(hunterResults)
    .where(eq(hunterResults.id, id))
    .limit(1);
    
  return results[0] || null;
}

export async function updateHunterResultReviewStatus(
  id: string,
  reviewStatus: "pending" | "approved" | "rejected",
  reviewedBy: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(hunterResults)
    .set({
      reviewStatus: reviewStatus as any,
      reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(hunterResults.id, id));
    
  return { success: true };
}

export async function createContactFromHunterResult(resultId: string, createdBy: string) {
  const result = await getHunterResultById(resultId);
  
  if (!result) {
    throw new Error("Hunter result not found");
  }
  
  // Create contact
  const contactData = {
    firstName: result.firstName || "",
    lastName: result.lastName || "",
    email: result.email || "",
    phone: result.phoneNumber || null,
    jobTitle: result.title || null,
    linkedinUrl: result.linkedinUrl || null,
    source: `hunter_${result.dataSource}`,
    notes: `Imported from Hunter Agent (${result.dataSource})`,
  } as any;
  const contactId = await createContact(contactData, createdBy);
  
  // Mark as approved
  await updateHunterResultReviewStatus(resultId, "approved", createdBy);
  
  return { contactId, success: true };
}

export async function getHunterResultsStats() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(hunterResults);
    
  const pending = await db
    .select({ count: sql<number>`count(*)` })
    .from(hunterResults)
    .where(eq(hunterResults.reviewStatus, "pending"));
    
  const approved = await db
    .select({ count: sql<number>`count(*)` })
    .from(hunterResults)
    .where(eq(hunterResults.reviewStatus, "approved"));
    
  const rejected = await db
    .select({ count: sql<number>`count(*)` })
    .from(hunterResults)
    .where(eq(hunterResults.reviewStatus, "rejected"));
    
  return {
    total: total[0]?.count || 0,
    pending: pending[0]?.count || 0,
    approved: approved[0]?.count || 0,
    rejected: rejected[0]?.count || 0,
  };
}

// ============================================================================
// AUTHENTICATION (for REST API / JWT)
// ============================================================================

import crypto from "crypto";
import { encryptCredential, decryptCredential } from './credentialService';

/**
 * Authenticate user with email and password
 * Uses SHA-256 hash (NOT bcrypt) for password verification
 * Returns user object if credentials are valid, null otherwise
 */
export async function authenticateUser(email: string, password: string) {
  const db = await getDb();
  if (!db) {
    console.error("[Auth] Database not available");
    return null;
  }

  try {
    // Find user by email
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      console.log(`[Auth] User not found: ${email}`);
      return null;
    }

    const user = result[0];

    // Check if user has a password hash
    if (!user.passwordHash) {
      console.log(`[Auth] User ${email} has no password hash`);
      return null;
    }

    // Calculate SHA-256 hash of provided password
    const hash = crypto.createHash('sha256').update(password).digest('hex');


    // Compare hashes
    if (hash !== user.passwordHash) {
      console.log(`[Auth] Invalid password for: ${email}`);
      return null;
    }

    console.log(`[Auth] Login successful: ${email}`);
    
    // Update lastSignedIn timestamp
    try {
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      console.log(`[Auth] Updated lastSignedIn for: ${email}`);
    } catch (updateError) {
      console.error(`[Auth] Failed to update lastSignedIn for: ${email}`, updateError);
    }
    
    return user;
  } catch (error) {
    console.error("[Auth] Error during authentication:", error);
    return null;
  }
}

// ============================================================================
// REST API HELPER FUNCTIONS
// ============================================================================

export async function searchContactsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select()
    .from(contacts)
    .leftJoin(contactEmails, eq(contacts.id, contactEmails.contactId))
    .where(eq(contactEmails.email, email));
  
  return results.map(r => r.contacts);
}

export async function getCompanyById(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getCorporationById(id: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(corporations)
    .where(eq(corporations.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Create contact (simplified version for REST API)
 * Does not require companyId
 */
export async function createContactSimple(data: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  companyId?: string | null;
  source?: string;
  createdBy: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const contactId = crypto.randomUUID();
    
    // Insert contact
    await db.insert(contacts).values({
      id: contactId,
      firstName: data.firstName,
      lastName: data.lastName,
      jobTitle: data.title,
      phoneBusiness: data.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // If email provided, add to contact_emails
    if (data.email) {
      await db.insert(contactEmails).values({
        id: crypto.randomUUID(),
        contactId,
        email: data.email,
        emailType: "work",
        isPrimary: true,
      });
    }
    
    // If companyId provided, link to company
    if (data.companyId) {
      await db.insert(contactCompanyRelations).values({
        id: crypto.randomUUID(),
        contactId,
        companyId: data.companyId,
        email: data.email,
        position: data.title,
        isPrimary: true,
      });
    }
    
    return contactId;
  } catch (error) {
    console.error("[createContactSimple] Error:", error);
    throw error;
  }
}

export async function getAllDeals() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(deals);
  return result;
}

export async function getAllActivities() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(activities);
  return result;
}

// ============================================================================
// EMAIL ACCOUNTS CRUD Functions
// ============================================================================

// Get all email accounts

// ============================================================
// EMAIL ACCOUNT FUNCTIONS (SmarterMail API)
// ============================================================

// Get all email accounts for a user
export async function getEmailAccounts(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailAccountsNew).where(eq(emailAccountsNew.userId, userId)).orderBy(desc(emailAccountsNew.createdAt));
}

// Get single email account by ID
export async function getEmailAccount(id: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db.select().from(emailAccountsNew).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
  return account || null;
}

// Create new email account
export async function createEmailAccount(data: {
  userId: string;
  emailAddress: string;
  passwordEncrypted: string;
  serverUrl?: string;
  isPrimary?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  
  const [account] = await db.insert(emailAccountsNew).values({
    userId: data.userId,
    emailAddress: data.emailAddress,
    passwordEncrypted: data.passwordEncrypted,
    serverUrl: data.serverUrl || 'https://mail.bl2020.com',
    isPrimary: data.isPrimary || false,
    isActive: true,
  });
  
  return { id: 0, userId: data.userId, emailAddress: data.emailAddress, passwordEncrypted: data.passwordEncrypted, serverUrl: data.serverUrl || 'https://mail.bl2020.com', isPrimary: data.isPrimary || false, isActive: true, useForCaldav: false, createdAt: new Date(), updatedAt: new Date() };
}

// Update email account
export async function updateEmailAccount(id: number, userId: string, data: Partial<{
  emailAddress: string;
  password: string;
  serverUrl: string;
  isPrimary: boolean;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordEncrypted = encryptCredential(data.password);
    delete updateData.password;
  }
  
  await db.update(emailAccountsNew).set(updateData).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
}

// Delete email account
export async function deleteEmailAccount(id: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailAccountsNew).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
}

// Get active email accounts
export async function getActiveEmailAccounts(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailAccountsNew).where(and(eq(emailAccountsNew.userId, userId), eq(emailAccountsNew.isActive, true)));
}

// Get decrypted password for an account
export async function getEmailAccountWithPassword(id: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db.select().from(emailAccountsNew).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
  
  if (!account) return null;
  
  const password = decryptCredential(account.passwordEncrypted);
  return {
    ...account,
    password,
  };
}

// Create email fetch log entry
export async function createEmailFetchLog(data: {
  emailAccountId: string;
  messageId?: string;
  fromAddress?: string;
  toAddress?: string;
  subject?: string;
  status?: string;
  matchedContactId?: string;
  matchedCompanyId?: string;
  activityId?: string;
  errorMessage?: string;
}) {
  const id = crypto.randomUUID();
  const db = await getDb(); if (!db) throw new Error("Database not available"); await db.insert(emailFetchLog).values({
    id,
    ...data,
  });
  return { id, ...data };
}


// ============================================================================
// SMARTERMAIL - PROJEKT INTEGRATION
// ============================================================================

export async function linkEmailToProject(
  emailId: string,
  projectId: string,
  taskId?: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const id = `epl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(emailProjectLinks).values({
    id,
    emailId,
    projectId,
    taskId: taskId || null,
  });

  return id;
}

export async function getProjectEmails(projectId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailProjectLinks)
    .where(eq(emailProjectLinks.projectId, projectId));
}

export async function getProjectStats(projectId: string) {
  const db = await getDb();
  if (!db) return null;

  // Timesheets
  const timesheets = await db
    .select()
    .from(projectTimesheets)
    .where(eq(projectTimesheets.projectId, projectId));

  // Budget Plans
  const budgetPlans = await db
    .select()
    .from(projectBudgetPlans)
    .where(eq(projectBudgetPlans.projectId, projectId));

  // Berechnung
  const totalHours = timesheets.reduce((sum, ts) => {
    const hours = typeof ts.hours === 'string' ? parseFloat(ts.hours) : ts.hours;
    return sum + (isNaN(hours) ? 0 : hours);
  }, 0);

  const spent = timesheets.reduce((sum, ts) => {
    const cost = typeof ts.cost === 'string' ? parseFloat(ts.cost) : ts.cost;
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);

  const budget = budgetPlans.reduce((sum, bp) => {
    const amount = typeof bp.amount === 'string' ? parseFloat(bp.amount) : bp.amount;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const budgetSpent = budgetPlans.reduce((sum, bp) => {
    const spent = bp.spent == null ? 0 : (typeof bp.spent === 'string' ? parseFloat(bp.spent) : bp.spent);
    return sum + (spent ?? 0);
  }, 0);

  return {
    emailCount: await db
      .select({ count: sql`COUNT(*)` })
      .from(emailProjectLinks)
      .where(eq(emailProjectLinks.projectId, projectId))
      .then(r => r[0]?.count || 0),
    totalHours,
    spent,
    budget,
    budgetSpent,
    budgetRemaining: budget - budgetSpent,
    budgetUtilization: budget > 0 ? (budgetSpent / budget) * 100 : 0,
  };
}

export async function addProjectTimesheet(
  projectId: string,
  userId: string,
  hours: number,
  cost: number,
  description?: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const id = `pts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(projectTimesheets).values({
    id,
    projectId,
    userId,
    hours: hours.toString(),
    cost: cost.toString(),
    date: new Date(),
    description: description || null,
  });

  return id;
}

export async function addProjectBudget(
  projectId: string,
  category: string,
  amount: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const id = `pbp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(projectBudgetPlans).values({
    id,
    projectId,
    category,
    amount: amount.toString(),
    spent: '0',
  });

  return id;
}



// ============================================================================
// EMAIL FETCH LOGS
// ============================================================================
export async function getEmailFetchLogs(emailAccountId: string, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db
    .select()
    .from(emailFetchLog)
    .where(eq(emailFetchLog.emailAccountId, emailAccountId))
    .orderBy(desc(emailFetchLog.processedAt))
    .limit(limit);
}

// ============================================================================
// RBAC: USER ASSIGNMENTS (staff_plus entity access control)
// user_account_assignments stores {userId, corporationId}
// rbac.ts expects {entityType, entityId} - we map corporationId -> entityId
// ============================================================================
export async function getUserAssignments(userId: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const rows = await db
    .select()
    .from(userAccountAssignments)
    .where(eq(userAccountAssignments.userId, userId));
  // Map to the shape rbac.ts expects: {entityType, entityId}
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    entityType: 'company' as const,
    entityId: r.corporationId,
    assignedAt: r.assignedAt,
    assignedBy: r.assignedBy,
  }));
}

export async function assignUserEntity(
  userId: string,
  entityType: 'company' | 'contact',
  entityId: string,
  assignedBy: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (entityType !== 'company') {
    // contact assignments not yet supported in schema - log and skip
    console.warn('[db] assignUserEntity: contact assignments not yet supported, skipping');
    return;
  }
  const id = `uaa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.insert(userAccountAssignments).values({
    id,
    userId,
    corporationId: entityId,
    assignedBy,
  });
}

export async function unassignUserEntity(
  userId: string,
  entityType: 'company' | 'contact',
  entityId: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (entityType !== 'company') {
    console.warn('[db] unassignUserEntity: contact assignments not yet supported, skipping');
    return;
  }
  await db
    .delete(userAccountAssignments)
    .where(
      and(
        eq(userAccountAssignments.userId, userId),
        eq(userAccountAssignments.corporationId, entityId)
      )
    );
}


/**
 * Get CalDAV credentials for a user from email_accounts_new.
 * Returns { email, password } from the primary active account with useForCaldav=true.
 */
export async function getCaldavCredentials(userId: string): Promise<{ email: string; password: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const { decryptCredential } = await import('./credentialService');
  const accounts = await db
    .select()
    .from(emailAccountsNew)
    .where(
      and(
        eq(emailAccountsNew.userId, userId),
        eq(emailAccountsNew.isActive, true),
        eq(emailAccountsNew.useForCaldav, true)
      )
    )
    .orderBy(desc(emailAccountsNew.isPrimary), desc(emailAccountsNew.createdAt))
    .limit(1);
  if (accounts.length === 0) return null;
  const account = accounts[0];
  try {
    const password = decryptCredential(account.passwordEncrypted);
    return { email: account.emailAddress, password };
  } catch (e) {
    console.warn('[db] getCaldavCredentials: failed to decrypt for user', userId, e);
    return null;
  }
}


// ─── E-Mail-Kontakt-Matching ───────────────────────────────────────────────

/**
 * Findet alle Kontakte deren hinterlegte E-Mail-Adressen (email..email5)
 * mit einer der übergebenen Adressen übereinstimmen.
 * Normalisierung: lowercase + trim. Kein Fuzzy-Matching.
 */
export async function matchContactsForEmail(
  fromAddress: string,
  toAddresses: string[],
  ccAddresses: string[]
): Promise<string[]> {
  const dbInstance = await getDb();
  if (!dbInstance) return [];

  const allAddresses = [fromAddress, ...toAddresses, ...ccAddresses]
    .map(a => a.toLowerCase().trim())
    .filter(Boolean);

  if (allAddresses.length === 0) return [];

  const ph = allAddresses.map(() => '?').join(', ');
  const args5 = [...allAddresses, ...allAddresses, ...allAddresses, ...allAddresses, ...allAddresses];

  const [contactRows] = await (dbInstance as any).$client.execute(
    `SELECT DISTINCT id FROM contacts
     WHERE LOWER(TRIM(email))  IN (${ph})
        OR LOWER(TRIM(email2)) IN (${ph})
        OR LOWER(TRIM(email3)) IN (${ph})
        OR LOWER(TRIM(email4)) IN (${ph})
        OR LOWER(TRIM(email5)) IN (${ph})`,
    args5
  ) as any;

  let relRowsRaw: any[] = [];
  try {
    const [r] = await (dbInstance as any).$client.execute(
      `SELECT DISTINCT contactId AS id FROM contact_company_relations
       WHERE LOWER(TRIM(email))  IN (${ph})
          OR LOWER(TRIM(email2)) IN (${ph})
          OR LOWER(TRIM(email3)) IN (${ph})
          OR LOWER(TRIM(email4)) IN (${ph})
          OR LOWER(TRIM(email5)) IN (${ph})`,
      args5
    ) as any;
    relRowsRaw = Array.isArray(r) ? r : [];
  } catch (relErr: any) {
    console.error('[matchContactsForEmail] contact_company_relations query failed:', relErr.message);
  }

  const ids = new Set<string>();
  for (const row of (contactRows as any[])) ids.add(row.id);
  for (const row of relRowsRaw) ids.add(row.id);
  return Array.from(ids);
}

/**
 * Verknüpft eine E-Mail mit einem Kontakt in archived_emails.
 * Idempotent: doppelte (email_id, contact_id) werden via INSERT IGNORE ignoriert.
 */
export async function linkEmailToContactDb(params: {
  emailId: string;
  contactId: string;
  userId: string;
  fromAddress?: string;
  fromName?: string;
  toAddress?: string;
  ccAddress?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  emailDate?: Date;
  folder?: string;
}): Promise<{ inserted: boolean }> {
  const dbInstance = await getDb();
  if (!dbInstance) return { inserted: false };

  try {
    const [result] = await (dbInstance as any).$client.execute(
      `INSERT IGNORE INTO archived_emails
       (email_id, contact_id, user_id, folder, from_address, from_name,
        to_address, cc_address, subject, body, html_body, email_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
      [
        params.emailId,
        params.contactId,
        params.userId,
        params.folder ?? 'INBOX',
        params.fromAddress ?? '',
        params.fromName ?? '',
        params.toAddress ?? '',
        params.ccAddress ?? '',
        params.subject ?? '',
        params.body ?? '',
        params.htmlBody ?? '',
        params.emailDate ?? new Date(),
      ]
    ) as any;
    return { inserted: (result as any).affectedRows > 0 };
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') return { inserted: false };
    throw e;
  }
}

/**
 * Entfernt eine Verknüpfung zwischen E-Mail und Kontakt.
 */
export async function unlinkEmailFromContactDb(emailId: string, contactId: string): Promise<void> {
  const dbInstance = await getDb();
  if (!dbInstance) return;
  await (dbInstance as any).$client.execute(
    'DELETE FROM archived_emails WHERE email_id = ? AND contact_id = ?',
    [emailId, contactId]
  );
}
