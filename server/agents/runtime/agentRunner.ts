import { getAgentByJobType } from "./agentRegistry";
import {
  createAgentRun,
  completeAgentRun,
  failAgentRun,
  completeAgentJob,
  failAgentJob,
} from "../agentDb";

const LLM_TIMEOUT_MS = 30_000;  // 30 Sekunden Timeout pro LLM-Aufruf
const MAX_RETRIES = 2;           // max. 2 Wiederholungen bei transienten Fehlern

// ─── LLM-Absicherung (B5) ────────────────────────────────────────────────────

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("overloaded") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused")
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`LLM timeout after ${ms}ms (${label})`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransientError(err) || attempt === maxRetries) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(`[AgentRunner] ${label} attempt ${attempt + 1} failed (transient), retrying in ${backoff}ms...`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  throw lastError;
}

// ─── Job Runner ───────────────────────────────────────────────────────────────

export async function runAgentJob(job: {
  id: string;
  type: string;          // Schema-Feldname: type (nicht agentId)
  payload: unknown;      // Schema-Feldname: payload (nicht triggerPayload)
}) {
  const agent = getAgentByJobType(job.type);
  let runId: string | undefined;

  try {
    const input = await agent.buildInput(job.payload as never);

    runId = await createAgentRun({
      jobId: job.id,
      agentName: agent.name,
      promptVersion: agent.promptVersion,
      inputJson: input,
    });

    // LLM-Aufruf mit Timeout + Retry
    const output = await runWithRetry(
      () => withTimeout(
        agent.run({ jobId: job.id, runId: runId!, input }),
        LLM_TIMEOUT_MS,
        `${agent.name}.run`
      ),
      MAX_RETRIES,
      agent.name
    );

    // Zod-Validierung des Outputs
    let parsed: unknown;
    try {
      parsed = agent.outputSchema.parse(output);
    } catch (zodErr) {
      const msg = zodErr instanceof Error ? zodErr.message : String(zodErr);
      throw new Error(`Output validation failed for ${agent.name}: ${msg}`);
    }

    if (agent.apply) {
      await agent.apply({ jobId: job.id, runId: runId!, output: parsed as any });
    }

    await completeAgentRun(runId!, parsed);
    await completeAgentJob(job.id);

    return parsed;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (runId) await failAgentRun(runId, msg);
    await failAgentJob(job.id, msg);
    throw error;
  }
}
