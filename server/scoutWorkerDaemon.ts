/**
 * FRIDAY CRM - Scout Agent Background Worker (Daemon)
 * Continuously processes scout queue jobs at regular intervals
 */

import 'dotenv/config';
import { processNextQueueJob } from "./scoutWorker.js";

const POLLING_INTERVAL_MS = 30000; // 30 seconds
const MAX_CONCURRENT_JOBS = 1; // Process one job at a time

let isProcessing = false;
let processCount = 0;
let errorCount = 0;
let lastProcessedAt: Date | null = null;

/**
 * Main worker loop - polls queue and processes jobs
 */
async function workerLoop() {
  if (isProcessing) {
    console.log("[Scout Worker] Already processing, skipping this interval");
    return;
  }

  isProcessing = true;

  try {
    console.log(`[Scout Worker] Checking queue... (processed: ${processCount}, errors: ${errorCount})`);

    const result = await processNextQueueJob();

    if (result.success) {
      processCount++;
      lastProcessedAt = new Date();
      console.log(`[Scout Worker] ✅ Job ${result.jobId} completed successfully`);
    } else {
      if (result.error !== "No pending jobs") {
        errorCount++;
        console.error(`[Scout Worker] ❌ Job failed: ${result.error}`);
      } else {
        console.log("[Scout Worker] No pending jobs in queue");
      }
    }
  } catch (error: any) {
    errorCount++;
    console.error("[Scout Worker] ❌ Unexpected error:", error.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Start the background worker
 */
export function startWorker() {
  console.log("=".repeat(60));
  console.log("FRIDAY CRM - Scout Agent Background Worker");
  console.log("=".repeat(60));
  console.log(`Polling interval: ${POLLING_INTERVAL_MS / 1000}s`);
  console.log(`Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
  console.log(`OpenAI API configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`Database: ${process.env.DATABASE_URL?.split("@")[1] || "Not configured"}`);
  console.log("=".repeat(60));

  // Initial run
  workerLoop();

  // Schedule periodic runs
  const intervalId = setInterval(workerLoop, POLLING_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[Scout Worker] Shutting down gracefully...");
    clearInterval(intervalId);
    console.log(`[Scout Worker] Stats - Processed: ${processCount}, Errors: ${errorCount}`);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[Scout Worker] Received SIGTERM, shutting down...");
    clearInterval(intervalId);
    process.exit(0);
  });
}

/**
 * Get worker statistics
 */
export function getWorkerStats() {
  return {
    processCount,
    errorCount,
    lastProcessedAt,
    isProcessing,
    uptime: process.uptime(),
  };
}

// Start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker();
}

