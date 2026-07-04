import { getDb } from "../../db";
import { tasks } from "../../../drizzle/schema";
import { and, eq, gt } from "drizzle-orm";

export const taskTools = {
  async createTask(input: {
    title: string;
    description?: string;
    ownerUserId?: string;
    entityType?: string;
    entityId?: string;
    priority?: number;
    dueAt?: Date;
    sourceAgentRunId?: string;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // ─── Duplikatschutz (B6) ────────────────────────────────────────────────
    // Verhindert doppelte Tasks für dieselbe Entity + Titel innerhalb von 24h
    if (input.entityType && input.entityId) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            eq(tasks.entityType, input.entityType),
            eq(tasks.entityId, input.entityId),
            eq(tasks.title, input.title),
            gt(tasks.createdAt, cutoff)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(
          `[TaskTools] Duplicate task skipped: "${input.title}" for ${input.entityType}/${input.entityId}`
        );
        return { id: existing[0].id, duplicate: true };
      }
    }

    const id = crypto.randomUUID();
    await db.insert(tasks).values({
      id,
      title: input.title,
      description: input.description,
      ownerUserId: input.ownerUserId,
      entityType: input.entityType,
      entityId: input.entityId,
      priority: input.priority ?? 50,
      dueAt: input.dueAt,
      source: "agent",
      sourceAgentRunId: input.sourceAgentRunId,
      status: "open",
    });

    return { id, duplicate: false };
  },
};
