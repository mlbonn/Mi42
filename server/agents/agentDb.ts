import { getDb } from '../db';
import { agentJobs, agentRuns, agentToolCalls, agentSuggestions, tasks } from '../../drizzle/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

// ─── Job Enqueue ────────────────────────────────────────────────────────────

export async function enqueueAgentJob(params: {
  type: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  priority?: number;
  createdBy?: string;
}) {
  const id = crypto.randomUUID();
  (await getDb())!.insert(agentJobs).values({
    id,
    type: params.type,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload ?? {},
    priority: params.priority ?? 5,
    status: 'pending',
    createdBy: params.createdBy,
    createdAt: new Date(),
  });
  return id;
}

// ─── Atomic Job Claiming (B1) ────────────────────────────────────────────────
// Nutzt SELECT + UPDATE WHERE status='pending' mit atomarem Guard gegen Race Conditions.

export async function claimNextAgentJob() {
  // Wähle den nächsten Job per SELECT
  const rows = await db
    .select()
    .from(agentJobs)
    .where(eq(agentJobs.status, 'pending'))
    .orderBy(sql`${agentJobs.priority} DESC, ${agentJobs.createdAt} ASC`)
    .limit(1);

  if (rows.length === 0) return null;

  const candidate = rows[0];
  const workerId = `worker-${process.pid}-${Date.now()}`;

  // Atomares UPDATE: nur wenn Status noch 'pending' ist
  const result = await db
    .update(agentJobs)
    .set({
      status: 'processing',
      lockedBy: workerId,
      lockedAt: new Date(),
    })
    .where(
      and(
        eq(agentJobs.id, candidate.id),
        eq(agentJobs.status, 'pending') // Guard gegen Race Condition
      )
    );

  // Drizzle gibt bei MySQL rowsAffected zurück
  const affected = (result as any).rowsAffected ?? (result as any)[0]?.affectedRows ?? 1;
  if (affected === 0) {
    // Ein anderer Worker hat diesen Job bereits geclaimt
    return null;
  }

  return { ...candidate, lockedBy: workerId };
}

// ─── Stale-Lock Recovery (B2) ────────────────────────────────────────────────
// Setzt Jobs zurück auf 'pending', die seit > timeoutMinutes im Status 'processing' hängen.

export async function recoverStaleJobs(timeoutMinutes = 15) {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  const result = await db
    .update(agentJobs)
    .set({
      status: 'pending',
      lockedBy: null,
      lockedAt: null,
    })
    .where(
      and(
        eq(agentJobs.status, 'processing'),
        lt(agentJobs.lockedAt, cutoff)
      )
    );

  const affected = (result as any).rowsAffected ?? (result as any)[0]?.affectedRows ?? 0;
  if (affected > 0) {
    console.log(`[AgentWorker] Recovered ${affected} stale job(s) (timeout: ${timeoutMinutes}min)`);
  }
  return affected;
}

// ─── Run Lifecycle ───────────────────────────────────────────────────────────

export async function createAgentRun(params: {
  jobId: string;
  agentName: string;
  promptVersion?: string;
  inputJson?: unknown;
}) {
  const id = crypto.randomUUID();
  (await getDb())!.insert(agentRuns).values({
    id,
    jobId: params.jobId,
    agentName: params.agentName,
    promptVersion: params.promptVersion,
    inputJson: params.inputJson as Record<string, unknown>,
    status: 'running',
    startedAt: new Date(),
  });
  return id;
}

export async function completeAgentRun(runId: string, outputJson: unknown) {
  await db
    .update(agentRuns)
    .set({
      status: 'completed',
      finishedAt: new Date(),
      outputJson: outputJson as Record<string, unknown>,
    })
    .where(eq(agentRuns.id, runId));
}

export async function failAgentRun(runId: string, errorMessage: string) {
  await db
    .update(agentRuns)
    .set({
      status: 'failed',
      finishedAt: new Date(),
      errorMessage,
    })
    .where(eq(agentRuns.id, runId));
}

// ─── Job Completion ──────────────────────────────────────────────────────────

export async function completeAgentJob(jobId: string) {
  await db
    .update(agentJobs)
    .set({
      status: 'completed',
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(agentJobs.id, jobId));
}

export async function failAgentJob(jobId: string, errorMessage: string) {
  await db
    .update(agentJobs)
    .set({
      status: 'failed',
      errorMessage,
      lockedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(agentJobs.id, jobId));
}

// ─── Tool Call Logging ───────────────────────────────────────────────────────

export async function logToolCall(params: {
  runId: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  sideEffectLevel?: number;
}) {
  const id = crypto.randomUUID();
  (await getDb())!.insert(agentToolCalls).values({
    id,
    runId: params.runId,
    toolName: params.toolName,
    argumentsJson: params.input as Record<string, unknown>,
    resultJson: params.output ? (params.output as Record<string, unknown>) : null,
    sideEffectLevel: params.sideEffectLevel ?? 0,
    createdAt: new Date(),
  });
  return id;
}

// ─── Suggestion Persistence ──────────────────────────────────────────────────

export async function saveAgentSuggestion(params: {
  agentRunId: string;
  entityType?: string;
  entityId?: string;
  suggestionType: string;
  payload: unknown;
  confidence?: number;
}) {
  const id = crypto.randomUUID();
  (await getDb())!.insert(agentSuggestions).values({
    id,
    agentRunId: params.agentRunId,
    entityType: params.entityType,
    entityId: params.entityId,
    suggestionType: params.suggestionType,
    suggestionJson: params.payload as Record<string, unknown>,
    confidence: params.confidence ? String(params.confidence) : null,
    status: 'pending',
    createdAt: new Date(),
  });
  return id;
}
