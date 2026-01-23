/**
 * FRIDAY CRM - Scout Agent Database Helpers
 */

import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  scoutQueue,
  scoutDiscoveryMethods,
  corporations,
  InsertScoutQueueJob,
  InsertScoutDiscoveryMethod,
  ScoutQueueJob,
  ScoutDiscoveryMethod,
} from "../drizzle/schema";

// ============================================================================
// SCOUT QUEUE
// ============================================================================

export async function addToScoutQueue(job: InsertScoutQueueJob): Promise<ScoutQueueJob> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(scoutQueue).values({ ...job, id });
  
  const result = await db.select().from(scoutQueue).where(eq(scoutQueue.id, id)).limit(1);
  return result[0];
}

export async function getScoutQueueJobs(filters?: {
  status?: string;
  generation?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(scoutQueue);
  
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(scoutQueue.status, filters.status));
  }
  if (filters?.generation !== undefined) {
    conditions.push(eq(scoutQueue.generation, filters.generation));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(
    scoutQueue.priority,
    scoutQueue.generation,
    scoutQueue.scheduledAt
  ) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

export async function updateScoutQueueJob(
  id: string,
  updates: Partial<ScoutQueueJob>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(scoutQueue).set(updates).where(eq(scoutQueue.id, id));
}

export async function deleteScoutQueueJob(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(scoutQueue).where(eq(scoutQueue.id, id));
}

export async function retryScoutQueueJob(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(scoutQueue)
    .set({
      status: "Pending",
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    })
    .where(eq(scoutQueue.id, id));
}

export async function getScoutQueueStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };

  const stats = await db
    .select({
      status: scoutQueue.status,
      count: sql<number>`count(*)`,
    })
    .from(scoutQueue)
    .groupBy(scoutQueue.status);

  const result = {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
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

// ============================================================================
// SCOUT DISCOVERY METHODS
// ============================================================================

export async function getDiscoveryMethods() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(scoutDiscoveryMethods).orderBy(scoutDiscoveryMethods.priority);
}

export async function updateDiscoveryMethod(
  id: string,
  updates: Partial<ScoutDiscoveryMethod>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(scoutDiscoveryMethods).set(updates).where(eq(scoutDiscoveryMethods.id, id));
}

export async function createDiscoveryMethod(data: {
  name: string;
  enabled?: boolean;
  priority?: number;
  config?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(scoutDiscoveryMethods).values({
    id,
    name: data.name,
    enabled: data.enabled ?? true,
    priority: data.priority ?? 5,
    config: data.config ? JSON.stringify(data.config) : null,
    successCount: 0,
    failureCount: 0,
  });

  const result = await db
    .select()
    .from(scoutDiscoveryMethods)
    .where(eq(scoutDiscoveryMethods.id, id))
    .limit(1);
  return result[0];
}

export async function deleteDiscoveryMethod(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(scoutDiscoveryMethods).where(eq(scoutDiscoveryMethods.id, id));
}

export async function seedDiscoveryMethods() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(scoutDiscoveryMethods).limit(1);
  if (existing.length > 0) return; // Already seeded

  const methods: InsertScoutDiscoveryMethod[] = [
    {
      id: crypto.randomUUID(),
      name: "Competitor Search",
      enabled: true,
      priority: 1,
      config: JSON.stringify({
        sources: ["Google", "LinkedIn", "Crunchbase"],
        similarityThreshold: 60,
      }),
      successCount: 0,
      failureCount: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "Association Crawl",
      enabled: true,
      priority: 2,
      config: JSON.stringify({
        associations: ["EAPA", "GIPS", "BauVerbände"],
      }),
      successCount: 0,
      failureCount: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "Product Catalog Comparison",
      enabled: true,
      priority: 3,
      config: JSON.stringify({
        minProductOverlap: 0.4,
      }),
      successCount: 0,
      failureCount: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "Shared Customer Analysis",
      enabled: true,
      priority: 4,
      config: JSON.stringify({
        minSharedCustomers: 3,
      }),
      successCount: 0,
      failureCount: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "Press Monitoring",
      enabled: true,
      priority: 5,
      config: JSON.stringify({
        sources: ["Construction News", "Building Material News"],
        keywords: ["expansion", "new factory", "acquisition"],
      }),
      successCount: 0,
      failureCount: 0,
    },
  ];

  await db.insert(scoutDiscoveryMethods).values(methods);
}

// ============================================================================
// SCOUT SUGGESTIONS (Corporations with scoutStatus = "Pending")
// ============================================================================

export async function getScoutSuggestions(filters?: {
  generation?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let conditions = [eq(corporations.scoutStatus, "Pending")];
  
  if (filters?.generation !== undefined) {
    conditions.push(eq(corporations.scoutGeneration, filters.generation));
  }

  let query = db
    .select()
    .from(corporations)
    .where(and(...conditions));

  if (filters?.limit) {
    return await query.orderBy(desc(corporations.discoveredAt)).limit(filters.limit);
  }

  return await query.orderBy(desc(corporations.discoveredAt));
}

export async function approveScoutSuggestion(corporationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update corporation status
  await db
    .update(corporations)
    .set({
      scoutStatus: "Approved",
      status: "Target",
    })
    .where(eq(corporations.id, corporationId));

  // Add to Hunter Queue for contact discovery
  const { createHunterJob } = await import("./hunterDb");
  
  await createHunterJob({
    corporationId: corporationId,
    targetRoles: ["CEO", "VP Sales", "Market Research Manager", "Head of Procurement"],
    targetCount: 5,
    priority: 5,
    status: "pending",
  });
  
  console.log(`[Scout] Approved corporation ${corporationId}, added to Hunter Queue`);
}

export async function rejectScoutSuggestion(corporationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(corporations)
    .set({
      scoutStatus: "Rejected",
    })
    .where(eq(corporations.id, corporationId));
}

export async function getScoutGenerationStats() {
  const db = await getDb();
  if (!db) return [];

  const stats = await db
    .select({
      generation: corporations.scoutGeneration,
      count: sql<number>`count(*)`,
      approved: sql<number>`sum(case when scout_status = 'Approved' then 1 else 0 end)`,
      pending: sql<number>`sum(case when scout_status = 'Pending' then 1 else 0 end)`,
      rejected: sql<number>`sum(case when scout_status = 'Rejected' then 1 else 0 end)`,
    })
    .from(corporations)
    .groupBy(corporations.scoutGeneration)
    .orderBy(corporations.scoutGeneration);

  return stats.map((s) => ({
    generation: s.generation || 0,
    count: Number(s.count) || 0,
    approved: Number(s.approved) || 0,
    pending: Number(s.pending) || 0,
    rejected: Number(s.rejected) || 0,
  }));
}

