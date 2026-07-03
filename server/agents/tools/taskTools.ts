import { getDb } from "../../db";
import { tasks } from "../../../drizzle/schema";

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

    return { id };
  },
};
