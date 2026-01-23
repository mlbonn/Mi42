/**
 * Test Scout Worker - Check queue status and process jobs
 */

import { getDb } from "./server/db";
import { scoutQueue } from "./drizzle/schema";
import { processNextQueueJob } from "./server/scoutWorker";

async function main() {
  console.log("=== Scout Worker Test ===\n");

  // Check queue status
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  const jobs = await db.select().from(scoutQueue);
  
  console.log(`Total jobs in queue: ${jobs.length}\n`);
  
  jobs.forEach((job, index) => {
    const seedData = job.seedData as any;
    console.log(`Job ${index + 1}:`);
    console.log(`  ID: ${job.id}`);
    console.log(`  Type: ${job.seedType}`);
    console.log(`  Company: ${seedData?.companyName || "N/A"}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Generation: ${job.generation}`);
    if (job.metadata) {
      const metadata = job.metadata as any;
      if (metadata.analysis) {
        console.log(`  Analysis:`);
        console.log(`    Industries: ${metadata.analysis.industries?.join(", ")}`);
        console.log(`    Products: ${metadata.analysis.products?.join(", ")}`);
      }
    }
    console.log("");
  });

  // Process next job
  console.log("\n=== Processing next job ===\n");
  const result = await processNextQueueJob();
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);

