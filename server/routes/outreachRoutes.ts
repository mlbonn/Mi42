/**
 * Outreach Agent API Routes
 */

import { Router } from "express";
import { getDb } from "../db";
import { emailDrafts, emailResponses, emailTemplates } from "../../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

const router = Router();

// ============================================================================
// Email Drafts
// ============================================================================

/**
 * GET /api/outreach/drafts
 * List all email drafts
 */
router.get("/drafts", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { status } = req.query;

    let query: any = db.select().from(emailDrafts);

    if (status) {
      query = query.where(eq(emailDrafts.reviewStatus, status as any)) as any;
    }

    const drafts = await (query as any).orderBy(desc(emailDrafts.createdAt));

    res.json(drafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

/**
 * PATCH /api/outreach/drafts/:id
 * Update draft (subject, body)
 */
router.patch("/drafts/:id", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;
    const { subject, body } = req.body;

    const updates: any = {};

    if (subject) updates.subject = subject;
    if (body) updates.body = body;

    await db
      .update(emailDrafts)
      .set(updates)
      .where(eq(emailDrafts.id, id));

    res.json({ success: true, message: "Draft updated" });
  } catch (error) {
    console.error("Error updating draft:", error);
    res.status(500).json({ error: "Failed to update draft" });
  }
});

/**
 * POST /api/outreach/drafts/bulk-approve
 * Bulk approve drafts
 */
router.post("/drafts/bulk-approve", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid ids array" });
    }

    await db
      .update(emailDrafts)
      .set({
        reviewStatus: "approved",
        reviewedAt: new Date(),
      })
      .where(inArray(emailDrafts.id, ids));

    res.json({ success: true, message: `${ids.length} drafts approved` });
  } catch (error) {
    console.error("Error bulk approving drafts:", error);
    res.status(500).json({ error: "Failed to approve drafts" });
  }
});

/**
 * POST /api/outreach/drafts/bulk-reject
 * Bulk reject drafts
 */
router.post("/drafts/bulk-reject", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid ids array" });
    }

    await db
      .update(emailDrafts)
      .set({
        reviewStatus: "rejected",
      })
      .where(inArray(emailDrafts.id, ids));

    res.json({ success: true, message: `${ids.length} drafts rejected` });
  } catch (error) {
    console.error("Error bulk rejecting drafts:", error);
    res.status(500).json({ error: "Failed to reject drafts" });
  }
});

// ============================================================================
// Email Responses
// ============================================================================

/**
 * GET /api/outreach/responses
 * List all email responses
 */
router.get("/responses", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { qualification } = req.query;

    let query = db.select().from(emailResponses);

    if (qualification) {
      query = query.where(eq(emailResponses.notes, qualification as string)) as any;
    }

    const responses = await query.orderBy(desc(emailResponses.receivedAt));

    res.json(responses);
  } catch (error) {
    console.error("Error fetching responses:", error);
    res.status(500).json({ error: "Failed to fetch responses" });
  }
});

/**
 * POST /api/outreach/responses/:id/read
 * Mark response as read
 */
router.post("/responses/:id/read", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;

    await db
      .update(emailResponses)
      .set({
        requiresAction: true,
      })
      .where(eq(emailResponses.id, id));

    res.json({ success: true, message: "Response marked as read" });
  } catch (error) {
    console.error("Error marking response as read:", error);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

/**
 * POST /api/outreach/responses/:id/qualify
 * Qualify lead from response
 */
router.post("/responses/:id/qualify", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;
    const { qualification } = req.body;

    if (!["hot", "warm", "cold", "not_interested", "unqualified"].includes(qualification)) {
      return res.status(400).json({ error: "Invalid qualification value" });
    }

    await db
      .update(emailResponses)
      .set({
        notes: String(qualification),
        processedAt: new Date(),
      })
      .where(eq(emailResponses.id, id));

    res.json({ success: true, message: "Lead qualified" });
  } catch (error) {
    console.error("Error qualifying lead:", error);
    res.status(500).json({ error: "Failed to qualify lead" });
  }
});

// ============================================================================
// Email Templates
// ============================================================================

/**
 * GET /api/outreach/templates
 * List all email templates
 */
router.get("/templates", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { language, industry } = req.query;

    let query = db.select().from(emailTemplates);

    const conditions = [];
    if (language) {
      conditions.push(eq(emailTemplates.language, language as string));
    }
    if (industry) {
      conditions.push(eq(emailTemplates.category, industry as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const templates = await query.orderBy(desc(emailTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

/**
 * POST /api/outreach/templates
 * Create new template
 */
router.post("/templates", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { name, description, subject, body, language, industry, targetRole } = req.body;

    if (!name || !subject || !body || !language) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Extract variables from subject and body
    const variableRegex = /\{\{(\w+)\}\}/g;
    const subjectVars = [...subject.matchAll(variableRegex)].map((m: any) => m[1]);
    const bodyVars = [...body.matchAll(variableRegex)].map((m: any) => m[1]);
    const variables = Array.from(new Set([...subjectVars, ...bodyVars]));

    const templateId = crypto.randomUUID();
    await db
      .insert(emailTemplates)
      .values({
        id: templateId,
        name,
        description: description || "",
        subject,
        body,
        language,
        variables,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    const template = { id: templateId, name, subject, body };
    res.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

/**
 * PATCH /api/outreach/templates/:id
 * Update template
 */
router.patch("/templates/:id", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;
    const { name, description, subject, body, language, industry, targetRole } = req.body;

    const updates: any = {
      updatedAt: new Date(),
    };

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (subject) updates.subject = subject;
    if (body) updates.body = body;
    if (language) updates.language = language;
    if (industry !== undefined) updates.industry = industry || null;
    if (targetRole !== undefined) updates.targetRole = targetRole || null;

    // Update variables if subject or body changed
    if (subject || body) {
      const variableRegex = /\{\{(\w+)\}\}/g;
      const subjectVars = subject ? [...subject.matchAll(variableRegex)].map((m: any) => m[1]) : [];
      const bodyVars = body ? [...body.matchAll(variableRegex)].map((m: any) => m[1]) : [];
      updates.variables = Array.from(new Set([...subjectVars, ...bodyVars]));
    }

    await db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id));

    res.json({ success: true, message: "Template updated" });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
});

/**
 * DELETE /api/outreach/templates/:id
 * Delete template
 */
router.delete("/templates/:id", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;

    await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id));

    res.json({ success: true, message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete template" });
  }
});

/**
 * POST /api/outreach/templates/:id/duplicate
 * Duplicate template
 */
router.post("/templates/:id/duplicate", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;

    // Get original template
    const [original] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));

    if (!original) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Create duplicate
    const dupId = crypto.randomUUID();
    await db
      .insert(emailTemplates)
      .values({
        id: dupId,
        name: `${original.name} (Copy)`,
        description: original.description,
        subject: original.subject,
        body: original.body,
        language: original.language,
        variables: original.variables,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    const duplicate = { id: dupId, name: `${original.name} (Copy)` };
    res.json(duplicate);
  } catch (error) {
    console.error("Error duplicating template:", error);
    res.status(500).json({ error: "Failed to duplicate template" });
  }
});


/**
 * GET /api/outreach/queue
 * List all outreach agent jobs (from agent_jobs table)
 */
router.get("/queue", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const { status } = req.query;
    const { agentJobs } = await import("../../drizzle/schema");
    const { desc: descOp, eq: eqOp } = await import("drizzle-orm");
    let jobs;
    if (status && status !== "all") {
      jobs = await db
        .select()
        .from(agentJobs)
        .where(eqOp(agentJobs.status, status as any))
        .orderBy(descOp(agentJobs.createdAt));
    } else {
      jobs = await db
        .select()
        .from(agentJobs)
        .orderBy(descOp(agentJobs.createdAt));
    }
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching outreach queue:", error);
    res.status(500).json({ error: "Failed to fetch outreach queue" });
  }
});

/**
 * POST /api/outreach/queue/:id/retry
 * Retry a failed outreach agent job
 */
router.post("/queue/:id/retry", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });
    const { id } = req.params;
    const { agentJobs } = await import("../../drizzle/schema");
    const { eq: eqOp } = await import("drizzle-orm");
    await db
      .update(agentJobs)
      .set({ status: "pending" as any, errorMessage: null })
      .where(eqOp(agentJobs.id, id));
    res.json({ success: true, message: "Job queued for retry" });
  } catch (error) {
    console.error("Error retrying outreach job:", error);
    res.status(500).json({ error: "Failed to retry job" });
  }
});

export default router;

