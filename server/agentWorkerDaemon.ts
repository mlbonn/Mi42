import "dotenv/config";
import { claimNextAgentJob } from "./agents/agentDb";
import { runAgentJob } from "./agents/runtime/agentRunner";
import { validateEnv } from './_core/validateEnv';

const POLL_INTERVAL_MS = 30_000;
const workerId = `agent-worker-${process.pid}`;
let isProcessing = false;

async function poll() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const job = await claimNextAgentJob();
    if (!job) {
      
validateEnv();
console.log("[AgentWorker] No pending jobs");
      return;
    }

    console.log(`[AgentWorker] Processing job ${job.id} (${job.type})`);
    await runAgentJob({ id: job.id, type: job.type, payload: job.payload });
    console.log(`[AgentWorker] Completed job ${job.id}`);
  } catch (error) {
    console.error("[AgentWorker] Error:", error);
  } finally {
    isProcessing = false;
  }
}

console.log("FRIDAY CRM - Agent Worker Daemon");
console.log(`Worker ID: ${workerId}`);

poll();
setInterval(poll, POLL_INTERVAL_MS);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
