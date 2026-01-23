/**
 * Hunter Agent Service
 * Processes jobs to find and verify contacts
 */

import { searchPeople } from "../integrations/apollo";
import { findEmail, verifyEmail } from "../integrations/hunter";
import { getDb } from "../db";
import { hunterJobs, hunterResults, corporations, type InsertHunterResult } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Extract domain from URL
 */
function extractDomain(url: string | null): string {
  if (!url) return "";
  
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url.replace("www.", "").split("/")[0];
  }
}

/**
 * Map Apollo seniority to our format
 */
function mapSeniority(apolloSeniority: string): string {
  const mapping: Record<string, string> = {
    "c_suite": "C-Level",
    "vp": "VP",
    "director": "Director",
    "manager": "Manager",
    "senior": "Senior",
    "entry": "Entry"
  };
  return mapping[apolloSeniority] || apolloSeniority;
}

/**
 * Map Apollo department to our format
 */
function mapDepartment(departments: string[]): string {
  if (departments.length === 0) return "Unknown";
  
  const mapping: Record<string, string> = {
    "sales": "Sales",
    "marketing": "Marketing",
    "operations": "Operations",
    "engineering": "Engineering",
    "finance": "Finance",
    "hr": "Human Resources"
  };
  
  return mapping[departments[0]] || departments[0];
}

/**
 * Calculate confidence score
 */
function calculateConfidence(params: {
  emailStatus: string;
  emailScore: number | null;
  hasLinkedIn: boolean;
  dataSource: string;
}): number {
  let confidence = 50; // Base score

  // Email status
  if (params.emailStatus === "valid") confidence += 30;
  else if (params.emailStatus === "risky") confidence += 10;
  else if (params.emailStatus === "invalid") confidence -= 20;

  // Email score
  if (params.emailScore) {
    confidence += Math.round(params.emailScore * 0.2); // 0-20 points
  }

  // LinkedIn profile
  if (params.hasLinkedIn) confidence += 10;

  // Data source
  if (params.dataSource === "apollo") confidence += 10;

  return Math.min(100, Math.max(0, confidence));
}

/**
 * Process a hunter job
 */
export async function processHunterJob(jobId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[HunterService] Database not available");
    return;
  }

  try {
    // Get job
    const jobs = await db.select().from(hunterJobs).where(eq(hunterJobs.id, jobId)).limit(1);
    if (jobs.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }
    const job = jobs[0];

    // Update status to processing
    await db.update(hunterJobs)
      .set({ status: "processing" })
      .where(eq(hunterJobs.id, jobId));

    // Get corporation
    const corps = await db.select().from(corporations).where(eq(corporations.id, job.corporationId)).limit(1);
    if (corps.length === 0) {
      throw new Error(`Corporation ${job.corporationId} not found`);
    }
    const corporation = corps[0];

    // Extract domain
    const domain = extractDomain(corporation.website);
    if (!domain) {
      throw new Error(`No website found for corporation ${corporation.name}`);
    }

    console.log(`[HunterService] Processing job ${jobId} for ${corporation.name} (${domain})`);

    // Step 1: Search for people using Apollo
    const targetRoles = (job.targetRoles as string[]) || ["CEO", "VP Sales", "Market Research Manager"];
    const apolloResults = await searchPeople({
      organizationDomain: domain,
      personTitles: targetRoles,
      personSeniorities: ["c_suite", "vp", "director"],
      perPage: job.targetCount || 5
    });

    console.log(`[HunterService] Found ${apolloResults.people.length} people from Apollo`);

    // Step 2: Process each person
    const results: InsertHunterResult[] = [];
    
    for (const person of apolloResults.people) {
      let email = person.email;
      let emailStatus: "valid" | "invalid" | "risky" | "unknown" = "unknown";
      let emailScore: number | null = null;

      // If no email, try to find it
      if (!email) {
        console.log(`[HunterService] Finding email for ${person.name}`);
        const emailResult = await findEmail({
          domain,
          firstName: person.first_name,
          lastName: person.last_name
        });
        
        if (emailResult) {
          email = emailResult.email;
          emailScore = emailResult.score;
        }
      }

      // Verify email if we have one
      if (email) {
        console.log(`[HunterService] Verifying email ${email}`);
        const verification = await verifyEmail(email);
        // Map Hunter.io result to our enum
        if (verification.result === "deliverable") emailStatus = "valid";
        else if (verification.result === "undeliverable") emailStatus = "invalid";
        else if (verification.result === "risky") emailStatus = "risky";
        else emailStatus = "unknown";
        emailScore = verification.score;
      }

      // Calculate confidence
      const confidence = calculateConfidence({
        emailStatus,
        emailScore,
        hasLinkedIn: !!person.linkedin_url,
        dataSource: "apollo"
      });

      // Create result
      const result: InsertHunterResult = {
        jobId,
        corporationId: job.corporationId,
        firstName: person.first_name,
        lastName: person.last_name,
        fullName: person.name,
        title: person.title,
        seniority: mapSeniority(person.seniority),
        department: mapDepartment(person.departments),
        email: email || null,
        emailStatus,
        emailScore,
        phoneNumber: person.phone_numbers.length > 0 ? person.phone_numbers[0] : null,
        linkedinUrl: person.linkedin_url,
        companyName: person.organization_name,
        companyDomain: domain,
        dataSource: "apollo",
        confidence,
        lastVerified: new Date(),
        reviewStatus: "pending"
      };

      results.push(result);
    }

    // Step 3: Save results
    if (results.length > 0) {
      await db.insert(hunterResults).values(results);
      console.log(`[HunterService] Saved ${results.length} results`);
    }

    // Step 4: Update job status
    await db.update(hunterJobs)
      .set({ 
        status: "completed",
        completedAt: new Date()
      })
      .where(eq(hunterJobs.id, jobId));

    console.log(`[HunterService] Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`[HunterService] Job ${jobId} failed:`, error);
    
    // Update job with error
    await db.update(hunterJobs)
      .set({ 
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date()
      })
      .where(eq(hunterJobs.id, jobId));
  }
}

/**
 * Process all pending jobs
 */
export async function processPendingJobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const pending = await db.select()
    .from(hunterJobs)
    .where(eq(hunterJobs.status, "pending"))
    .limit(10);

  console.log(`[HunterService] Processing ${pending.length} pending jobs`);

  for (const job of pending) {
    await processHunterJob(job.id);
  }
}

