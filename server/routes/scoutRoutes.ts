/**
 * Scout Agent API Routes
 */

import { Router } from "express";
import { getDb } from "../db";
import { scoutQueue, scoutDiscoveryMethods } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

/**
 * GET /api/scout/queue
 * List all scout jobs with optional filters
 */
router.get("/queue", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { status, corporationId } = req.query;

    // Build WHERE conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(scoutQueue.status, status as string));
    }
    if (corporationId) {
      conditions.push(eq(scoutQueue.corporationId, corporationId as string));
    }

    // Execute query - simple version without ORDER BY for now
    let jobs;
    if (conditions.length > 0) {
      jobs = await db
        .select()
        .from(scoutQueue)
        .where(and(...conditions));
    } else {
      jobs = await db
        .select()
        .from(scoutQueue);
    }

    // Sort in JavaScript instead
    jobs.sort((a, b) => {
      const dateA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const dateB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return dateB - dateA; // DESC order
    });

    res.json(jobs);
  } catch (error) {
    console.error("Error fetching scout queue:", error);
    res.status(500).json({ error: "Failed to fetch scout queue" });
  }
});

/**
 * POST /api/scout/queue/:id/retry
 * Retry a failed scout job
 */
router.post("/queue/:id/retry", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;

    // Update job status to pending
    await db
      .update(scoutQueue)
      .set({
        status: "pending",
        errorMessage: null,
      })
      .where(eq(scoutQueue.id, id));

    res.json({ success: true, message: "Job queued for retry" });
  } catch (error) {
    console.error("Error retrying scout job:", error);
    res.status(500).json({ error: "Failed to retry job" });
  }
});

/**
 * GET /api/scout/discovery-methods
 * List all discovery methods
 */
router.get("/discovery-methods", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const methods = await db
      .select()
      .from(scoutDiscoveryMethods);

    // Sort in JavaScript
    methods.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    res.json(methods);
  } catch (error) {
    console.error("Error fetching discovery methods:", error);
    res.status(500).json({ error: "Failed to fetch discovery methods" });
  }
});

/**
 * PATCH /api/scout/discovery-methods/:id
 * Update discovery method (enable/disable, priority)
 */
router.patch("/discovery-methods/:id", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database not available" });

    const { id } = req.params;
    const { enabled, priority } = req.body;

    const updates: any = {
      updatedAt: new Date(),
    };

    if (typeof enabled === "boolean") {
      updates.enabled = enabled;
    }

    if (typeof priority === "number") {
      updates.priority = priority;
    }

    await db
      .update(scoutDiscoveryMethods)
      .set(updates)
      .where(eq(scoutDiscoveryMethods.id, id));

    res.json({ success: true, message: "Discovery method updated" });
  } catch (error) {
    console.error("Error updating discovery method:", error);
    res.status(500).json({ error: "Failed to update discovery method" });
  }
});

export default router;
