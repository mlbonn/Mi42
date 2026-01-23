/**
 * FRIDAY CRM - Hunter Agent Worker Daemon
 * Background worker that processes Hunter Queue jobs
 */

import "dotenv/config";
import { processPendingJobs } from "./services/hunterService";

const POLL_INTERVAL_MS = 30000; // 30 seconds

console.log("=".repeat(80));
console.log("FRIDAY CRM - Hunter Worker Daemon");
console.log("=".repeat(80));
console.log(`Started at: ${new Date().toISOString()}`);
console.log(`Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
console.log("");

// Check configuration
console.log("Configuration:");
console.log(`- Apollo API configured: ${!!process.env.APOLLO_API_KEY}`);
console.log(`- Hunter.io API configured: ${!!process.env.HUNTER_API_KEY}`);
console.log(`- Database: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.split("@")[1] : "Not configured"}`);
console.log("");

/**
 * Main polling loop
 */
async function pollQueue() {
  try {
    console.log(`[${new Date().toISOString()}] Polling Hunter Queue...`);
    await processPendingJobs();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing queue:`, error);
  }
}

// Start polling
console.log("Starting Hunter Worker Daemon...");
console.log("");

// Initial poll
pollQueue();

// Set up interval
setInterval(pollQueue, POLL_INTERVAL_MS);

// Keep process alive
process.on("SIGINT", () => {
  console.log("\nShutting down Hunter Worker Daemon...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down Hunter Worker Daemon...");
  process.exit(0);
});

