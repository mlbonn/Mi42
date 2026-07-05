import { getAgentByJobType } from "./runtime/agentRegistry";
import {
  createAgentRun,
  completeAgentRun,
  failAgentRun,
  completeAgentJob,
  failAgentJob,
} from "./agentDb";

const LLM_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

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
    timer = setTimeout(
      () => reject(new Error(`LLM timeout after ${ms}ms (${label})`)),
      ms
    );
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
      console.warn(
        `[AgentRunner] ${label} attempt ${attempt + 1} failed (transient), retrying in ${backoff}ms...`
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError;
}

export async function runAgentJob(job: {
  id: string;
  type: string;
  payload: unknown;
}) {
  console.log(`[AgentRunner] Running job ${job.id} of type ${job.type}`);
  const agent = getAgentByJobType(job.type);
  let runId: string | undefined;

  try {
    const input = await (agent as any).buildInput(job.payload as never);
    runId = await createAgentRun({
      jobId: job.id,
      agentName: (agent as any).name ?? job.type,
      promptVersion: (agent as any).promptVersion,
      inputJson: input,
    });

    const output = await runWithRetry(
      () =>
        withTimeout(
          (agent as any).run({ jobId: job.id, runId: runId!, input }),
          LLM_TIMEOUT_MS,
          `${job.type}/${job.id}`
        ),
      MAX_RETRIES,
      `${job.type}/${job.id}`
    );

    await completeAgentRun(runId, output);
    // apply() ist optional – nur wenn der Agent eine apply-Methode hat
    if (typeof (agent as any).apply === "function") {
      await (agent as any).apply({ jobId: job.id, runId: runId!, output });
    }
    await completeAgentJob(job.id);
    console.log(`[AgentRunner] Job ${job.id} completed successfully`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AgentRunner] Job ${job.id} failed: ${msg}`);
    if (runId) {
      await failAgentRun(runId, msg).catch(() => {});
    }
    await failAgentJob(job.id, msg).catch(() => {});
  }
}
