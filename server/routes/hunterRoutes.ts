/**
 * Hunter Agent API Routes
 */

import { Router } from "express";
import { getDb } from "../db";
import { hunterResults, hunterQueue } from "../../drizzle/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { enrichPerson } from "../integrations/apolloEnrichment";

const router = Router();

/**
 * GET /api/hunter/contacts
 * List all found contacts with filters
 */
router.get("/contacts", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { status, emailStatus } = req.query;

    let query = db
      .select({
        id: hunterResults.id,
        corporationId: hunterResults.corporationId,
        companyId: hunterResults.corporationId,
        firstName: hunterResults.firstName,
        lastName: hunterResults.lastName,
        email: hunterResults.email,
        emailStatus: hunterResults.emailStatus,
        phone: hunterResults.phoneNumber,
        linkedinUrl: hunterResults.linkedinUrl,
        title: hunterResults.title,
        seniority: hunterResults.seniority,
        department: hunterResults.department,
        confidence: hunterResults.confidence,
        dataSource: hunterResults.dataSource,
        status: hunterResults.reviewStatus,
        createdAt: hunterResults.createdAt,
        updatedAt: hunterResults.lastVerified,
      })
      .from(hunterResults);

    // Apply filters
    const conditions = [];
    if (status) {
      conditions.push(eq(hunterResults.reviewStatus, status as any));
    }
    if (emailStatus) {
      conditions.push(eq(hunterResults.emailStatus, emailStatus as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const contacts = await query.orderBy(desc(hunterResults.createdAt));

    res.json(contacts);
  } catch (error) {
    console.error("Error fetching hunter contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

/**
 * POST /api/hunter/contacts/bulk-approve
 * Bulk approve contacts
 */
router.post("/contacts/bulk-approve", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid ids array" });
    }

    await db
      .update(hunterResults)
      .set({
        reviewStatus: "approved",
      })
      .where(inArray(hunterResults.id, ids));

    res.json({ success: true, message: `${ids.length} contacts approved` });
  } catch (error) {
    console.error("Error bulk approving contacts:", error);
    res.status(500).json({ error: "Failed to approve contacts" });
  }
});

/**
 * POST /api/hunter/contacts/bulk-reject
 * Bulk reject contacts
 */
router.post("/contacts/bulk-reject", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid ids array" });
    }

    await db
      .update(hunterResults)
      .set({
        reviewStatus: "rejected",
      })
      .where(inArray(hunterResults.id, ids));

    res.json({ success: true, message: `${ids.length} contacts rejected` });
  } catch (error) {
    console.error("Error bulk rejecting contacts:", error);
    res.status(500).json({ error: "Failed to reject contacts" });
  }
});

/**
 * GET /api/hunter/data-sources
 * Get status of all data sources (Apollo, Hunter.io, LinkedIn)
 */
router.get("/data-sources", async (req, res) => {
  try {
    const sources = [
      {
        id: "apollo",
        name: "Apollo.io",
        type: "Enrichment API",
        status: process.env.APOLLO_API_KEY ? "configured" : "not_configured",
        apiKey: process.env.APOLLO_API_KEY ? "***" + process.env.APOLLO_API_KEY.slice(-4) : null,
        creditsUsed: null, // TODO: Track usage
        creditsRemaining: null,
        lastUsed: null,
      },
      {
        id: "hunter",
        name: "Hunter.io",
        type: "Email Finder",
        status: "not_configured",
        apiKey: null,
        creditsUsed: null,
        creditsRemaining: null,
        lastUsed: null,
      },
      {
        id: "linkedin",
        name: "LinkedIn Sales Navigator",
        type: "People Search",
        status: "pending_approval",
        apiKey: null,
        creditsUsed: null,
        creditsRemaining: null,
        lastUsed: null,
      },
    ];

    res.json(sources);
  } catch (error) {
    console.error("Error fetching data sources:", error);
    res.status(500).json({ error: "Failed to fetch data sources" });
  }
});

/**
 * POST /api/hunter/data-sources/:source/test
 * Test API connection for a data source
 */
router.post("/data-sources/:source/test", async (req, res) => {
  try {
    const { source } = req.params;

    if (source === "apollo") {
      if (!process.env.APOLLO_API_KEY) {
        return res.status(400).json({ 
          success: false, 
          error: "Apollo API key not configured" 
        });
      }

      // Test with a simple enrichment
      const testResult = await enrichPerson({
        email: "test@example.com",
      });

      if (testResult) {
        res.json({ 
          success: true, 
          message: "Apollo API connection successful",
          testData: testResult 
        });
      } else {
        res.json({ 
          success: false, 
          error: "Apollo API returned no data" 
        });
      }
    } else {
      res.status(400).json({ error: "Unknown data source" });
    }
  } catch (error: any) {
    console.error("Error testing data source:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to test connection" 
    });
  }
});


/**
 * GET /api/hunter/queue
 * List all hunter queue jobs with optional filters
 */
router.get("/queue", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const { status } = req.query;
    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(hunterQueue.status, status as string));
    }
    let jobs;
    if (conditions.length > 0) {
      jobs = await db.select().from(hunterQueue).where(and(...conditions));
    } else {
      jobs = await db.select().from(hunterQueue);
    }
    jobs.sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching hunter queue:", error);
    res.status(500).json({ error: "Failed to fetch hunter queue" });
  }
});

/**
 * POST /api/hunter/queue/:id/retry
 * Retry a failed hunter job
 */
router.post("/queue/:id/retry", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const { id } = req.params;
    await db
      .update(hunterQueue)
      .set({ status: "pending", errorMessage: null })
      .where(eq(hunterQueue.id, id));
    res.json({ success: true, message: "Job queued for retry" });
  } catch (error) {
    console.error("Error retrying hunter job:", error);
    res.status(500).json({ error: "Failed to retry job" });
  }
});

export default router;

