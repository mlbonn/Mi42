import crypto from "crypto";
/**
 * Complete REST API Middleware for VSTO Add-in
 * Provides all endpoints needed for Outlook integration
 */

import { Router } from "express";
import { 
  getAllContacts, 
  searchContactsByEmail, 
  getContact,
  createContact as dbCreateContact,
  getCompany,
  getCorporation,
  getActivitiesByContact,
  createActivity as dbCreateActivity,
  getDb
} from "../db";
import { contacts } from "../../drizzle/schema";

const router = Router();
router.use((req, res, next) => {  console.log("[DEBUG] REST API request:", req.method, req.path);  next();});

// JWT Middleware (assumes JWT auth is already set up)
const authenticateJWT = (req: any, res: any, next: any) => {
  console.log("[DEBUG AUTH] Checking auth for:", req.method, req.path, "Header:", req.headers.authorization?.substring(0, 20));
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Token validation would happen here
  // For now, we assume the token is valid if present
  next();
};

// Apply JWT middleware to all routes
router.use(authenticateJWT);

/**
 * GET /api/contacts
 * Get all contacts with pagination
 */
router.get("/contacts", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const allContacts = await getAllContacts();

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedContacts = allContacts.slice(startIndex, endIndex);

    res.json({
      data: paginatedContacts,
      pagination: {
        page,
        limit,
        total: allContacts.length,
        totalPages: Math.ceil(allContacts.length / limit),
      },
    });
  } catch (error) {
    console.error("[REST API] Error getting contacts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/contacts/search?email=xxx
 * Search contact by email
 */
router.get("/contacts/search", async (req, res) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    const contact = await searchContactsByEmail(email);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    console.error("[REST API] Error searching contact:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
router.get("/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await getContact(id);

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (error) {
    console.error("[REST API] Error getting contact:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/contacts
 * Create new contact
 */
router.post("/contacts", async (req, res) => {
  try {
    const { firstName, lastName, email, company, position, phone } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName and lastName are required" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Create contact
    const contactId = crypto.randomUUID();
    const newContact = {
      firstName,
      lastName,
      jobTitle: position || null,
      phone: phone || null,
      decisionMaker: false,
      contactStatus: "Cold" as const,
    };

    await db.insert(contacts).values(newContact);

    // If email provided, create contact_company_relations entry
    if (email) {
      // For now, we'll store email in a simple way
      // In production, you'd want to handle contact_company_relations properly
      console.log(`[REST API] Email ${email} should be stored in contact_company_relations`);
    }

    res.status(201).json({
      ...newContact,
    });
  } catch (error) {
    console.error("[REST API] Error creating contact:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/activities
 * Create activity (import email)
 */
router.post("/activities", async (req, res) => {
  console.log("[DEBUG] POST /activities called with body:", req.body);
  try {
    const {
      contactId,
      subject,
      content,
      direction,
      type,
      activityDate,
      hasAttachment,
      attachmentCount,
    } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: "contactId is required" });
    }

    if (!subject) {
      return res.status(400).json({ error: "subject is required" });
    }

    // Get contact to find companyId and corporationId
    const contact = await getContact(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const activityId = crypto.randomUUID();
    const newActivity = {
      id: activityId,
      contactId,
      companyId: (contact as any).companyId || null,
      corporationId: null as any, // Will be set if company has corporation
      subject: subject || "",
      content: content || "",
      activityType: type || "email",
      direction: direction || "inbound",
      activityDate: activityDate ? new Date(activityDate) : new Date(),
      hasAttachment: hasAttachment || false,
      attachmentCount: attachmentCount || 0,
    };

    // If contact has company, get corporation
    if ((contact as any).companyId) {
      const company = await getCompany((contact as any).companyId);
      if (company && company.corporationId) {
        newActivity.corporationId = company.corporationId;
      }
    }

    await dbCreateActivity(newActivity as any);

    res.status(201).json({
      id: activityId,
    });
  } catch (error) {
    console.error("[REST API] Error creating activity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/activities/contact/:contactId
 * Get activities by contact
 */
router.get("/activities/contact/:contactId", async (req, res) => {
  try {
    const { contactId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const allActivities = await getActivitiesByContact(contactId);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = allActivities.slice(startIndex, endIndex);

    res.json({
      data: paginatedActivities,
      pagination: {
        page,
        limit,
        total: allActivities.length,
        totalPages: Math.ceil(allActivities.length / limit),
      },
    });
  } catch (error) {
    console.error("[REST API] Error getting activities:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/companies/:id
 * Get company by ID
 */
router.get("/companies/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const company = await getCompany(id);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    console.error("[REST API] Error getting company:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/corporations/:id
 * Get corporation by ID
 */
router.get("/corporations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const corporation = await getCorporation(id);

    if (!corporation) {
      return res.status(404).json({ error: "Corporation not found" });
    }

    res.json(corporation);
  } catch (error) {
    console.error("[REST API] Error getting corporation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
