/**
 * Hunter Agent Database Helpers
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { 
  hunterJobs, 
  hunterResults, 
  contacts,
  contactEmails,
  type InsertHunterJob, 
  type InsertHunterResult,
  type HunterJob,
  type HunterResult 
} from "../drizzle/schema";

// ============================================================================
// HUNTER JOBS
// ============================================================================

export async function createHunterJob(job: InsertHunterJob): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = job.id || crypto.randomUUID();
  await db.insert(hunterJobs).values({ ...job, id });
  return id;
}

export async function getHunterJob(id: string): Promise<HunterJob | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(hunterJobs).where(eq(hunterJobs.id, id)).limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function getAllHunterJobs(): Promise<HunterJob[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(hunterJobs).orderBy(desc(hunterJobs.createdAt));
}

export async function getHunterJobsByCorporation(corporationId: string): Promise<HunterJob[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(hunterJobs)
    .where(eq(hunterJobs.corporationId, corporationId))
    .orderBy(desc(hunterJobs.createdAt));
}

export async function updateHunterJob(id: string, updates: Partial<InsertHunterJob>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(hunterJobs).set(updates).where(eq(hunterJobs.id, id));
}

// ============================================================================
// HUNTER RESULTS
// ============================================================================

export async function createHunterResult(result: InsertHunterResult): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = result.id || crypto.randomUUID();
  await db.insert(hunterResults).values({ ...result, id });
  return id;
}

export async function getHunterResult(id: string): Promise<HunterResult | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(hunterResults).where(eq(hunterResults.id, id)).limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function getHunterResultsByJob(jobId: string): Promise<HunterResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(hunterResults)
    .where(eq(hunterResults.jobId, jobId))
    .orderBy(desc(hunterResults.confidence));
}

export async function getHunterResultsByCorporation(corporationId: string): Promise<HunterResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(hunterResults)
    .where(eq(hunterResults.corporationId, corporationId))
    .orderBy(desc(hunterResults.confidence));
}

export async function getPendingHunterResults(): Promise<HunterResult[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(hunterResults)
    .where(eq(hunterResults.reviewStatus, "pending"))
    .orderBy(desc(hunterResults.confidence));
}

export async function updateHunterResult(id: string, updates: Partial<InsertHunterResult>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(hunterResults).set(updates).where(eq(hunterResults.id, id));
}

export async function bulkUpdateHunterResults(
  ids: string[], 
  updates: Partial<InsertHunterResult>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const id of ids) {
    await db.update(hunterResults).set(updates).where(eq(hunterResults.id, id));
  }
}

// ============================================================================
// CONVERSION TO CONTACTS
// ============================================================================

export async function createContactFromHunterResult(resultId: string, userId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get hunter result
  const result = await getHunterResult(resultId);
  if (!result) throw new Error(`Hunter result ${resultId} not found`);

  // Create contact
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
    createdAt: new Date()
  });
  
  // Create contact email if available
  if (result.email) {
    await db.insert(contactEmails).values({
      id: crypto.randomUUID(),
      contactId,
      email: result.email,
      emailType: "work",
      isPrimary: true,
      createdAt: new Date()
    });
  }

  // Update hunter result
  await updateHunterResult(resultId, {
    reviewStatus: "approved",
    reviewedBy: userId,
    reviewedAt: new Date()
  });

  return contactId;
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getHunterStats(): Promise<{
  totalJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalResults: number;
  pendingReview: number;
  approvedResults: number;
  rejectedResults: number;
}> {
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
    pendingJobs: allJobs.filter(j => j.status === "pending").length,
    completedJobs: allJobs.filter(j => j.status === "completed").length,
    failedJobs: allJobs.filter(j => j.status === "failed").length,
    totalResults: allResults.length,
    pendingReview: allResults.filter(r => r.reviewStatus === "pending").length,
    approvedResults: allResults.filter(r => r.reviewStatus === "approved").length,
    rejectedResults: allResults.filter(r => r.reviewStatus === "rejected").length
  };
}

