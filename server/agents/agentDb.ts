import { and, asc, eq, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  agentJobs,
  agentRuns,
  agentSuggestions,
  agentToolCalls,
  tasks,
} from "../../drizzle/schema";

export async function enqueueAgentJob(input: {
  type: string;
  entityType?: string;
  entityId?: string;
  payload?: unknown;
  priority?: number;
  scheduledAt?: Date;
  createdBy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(agentJobs).values({
    id,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload as Record<string, unknown>,
    priority: input.priority ?? 5,
    scheduledAt: input.scheduledAt ?? new Date(),
    createdBy: input.createdBy,
    status: "pending",
  });

  return id;
}

export async function claimNextAgentJob(workerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const jobs = await db
    .select()
    .from(agentJobs)
    .where(
      and(eq(agentJobs.status, "pending"), lte(agentJobs.scheduledAt, new Date()))
    )
    .orderBy(asc(agentJobs.priority), asc(agentJobs.scheduledAt))
    .limit(1);

  const job = jobs[0];
  if (!job) return null;

  await db
    .update(agentJobs)
    .set({
      status: "processing",
      lockedBy: workerId,
      lockedAt: new Date(),
      attempts: (job.attempts ?? 0) + 1,
    })
    .where(eq(agentJobs.id, job.id));

  return { ...job, status: "processing" as const };
}

export async function createAgentRun(input: {
  jobId: string;
  agentName: string;
  model?: string;
  promptVersion?: string;
  inputJson?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(agentRuns).values({
    id,
    jobId: input.jobId,
    agentName: input.agentName,
    model: input.model,
    promptVersion: input.promptVersion,
    inputJson: input.inputJson as Record<string, unknown>,
    status: "running",
    startedAt: new Date(),
  });

  return id;
}

export async function completeAgentRun(runId: string, outputJson: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(agentRuns)
    .set({
      status: "completed",
      outputJson: outputJson as Record<string, unknown>,
      finishedAt: new Date(),
    })
    .where(eq(agentRuns.id, runId));
}

export async function failAgentRun(runId: string, error: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const msg = error instanceof Error ? error.message : String(error);
  await db
    .update(agentRuns)
    .set({
      status: "failed",
      errorMessage: msg,
      finishedAt: new Date(),
    })
    .where(eq(agentRuns.id, runId));
}

export async function completeAgentJob(jobId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(agentJobs)
    .set({ status: "completed" })
    .where(eq(agentJobs.id, jobId));
}

export async function failAgentJob(jobId: string, error: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const msg = error instanceof Error ? error.message : String(error);
  const job = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.id, jobId))
    .limit(1);

  const current = job[0];
  const attempts = current?.attempts ?? 1;
  const maxAttempts = current?.maxAttempts ?? 3;

  await db
    .update(agentJobs)
    .set({
      status: attempts >= maxAttempts ? "failed" : "pending",
      errorMessage: msg,
      lockedBy: null,
      lockedAt: null,
    })
    .where(eq(agentJobs.id, jobId));
}

export async function logToolCall(input: {
  runId: string;
  toolName: string;
  argumentsJson?: unknown;
  resultJson?: unknown;
  sideEffectLevel?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(agentToolCalls).values({
    id: crypto.randomUUID(),
    runId: input.runId,
    toolName: input.toolName,
    argumentsJson: input.argumentsJson as Record<string, unknown>,
    resultJson: input.resultJson as Record<string, unknown>,
    sideEffectLevel: input.sideEffectLevel ?? 0,
  });
}
