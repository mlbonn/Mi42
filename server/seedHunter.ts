/**
 * Seed Hunter Agent Mock Data
 */

import { getDb } from "./db";
import { hunterJobs, hunterResults } from "../drizzle/schema";

async function seedHunterData() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  console.log("[SeedHunter] Starting...");

  // Mock corporation IDs (from seed.ts)
  const saintGobainId = "3982d95d-b8cb-4da9-862c-8cb487bd546a";
  const knaufId = "7f8e9c6b-3a4d-4e5f-8b9c-1d2e3f4a5b6c";
  const rockwoolId = "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d";

  // Create hunter jobs
  const job1Id = crypto.randomUUID();
  const job2Id = crypto.randomUUID();
  const job3Id = crypto.randomUUID();

  await db.insert(hunterJobs).values([
    {
      id: job1Id,
      corporationId: saintGobainId,
      status: "completed",
      priority: 10,
      targetRoles: ["VP Sales", "Market Research Manager"],
      targetCount: 5,
      createdAt: new Date("2025-01-15"),
      completedAt: new Date("2025-01-15T10:30:00")
    },
    {
      id: job2Id,
      corporationId: knaufId,
      status: "completed",
      priority: 8,
      targetRoles: ["CEO", "VP Sales"],
      targetCount: 3,
      createdAt: new Date("2025-01-16"),
      completedAt: new Date("2025-01-16T14:20:00")
    },
    {
      id: job3Id,
      corporationId: rockwoolId,
      status: "pending",
      priority: 5,
      targetRoles: ["VP Sales", "Director Market Intelligence"],
      targetCount: 5,
      createdAt: new Date("2025-01-20")
    }
  ]);

  console.log("[SeedHunter] Created 3 hunter jobs");

  // Create hunter results for Job 1 (Saint-Gobain)
  await db.insert(hunterResults).values([
    {
      id: crypto.randomUUID(),
      jobId: job1Id,
      corporationId: saintGobainId,
      firstName: "Marie",
      lastName: "Dubois",
      fullName: "Marie Dubois",
      title: "VP Sales EMEA",
      seniority: "VP",
      department: "Sales",
      email: "marie.dubois@saint-gobain.com",
      emailStatus: "valid",
      emailScore: 95,
      phoneNumber: "+33 1 47 62 30 00",
      linkedinUrl: "https://linkedin.com/in/mariedubois",
      companyName: "Saint-Gobain",
      companyDomain: "saint-gobain.com",
      dataSource: "apollo",
      confidence: 92,
      lastVerified: new Date("2025-01-15T10:30:00"),
      reviewStatus: "pending",
      createdAt: new Date("2025-01-15T10:30:00")
    },
    {
      id: crypto.randomUUID(),
      jobId: job1Id,
      corporationId: saintGobainId,
      firstName: "Pierre",
      lastName: "Martin",
      fullName: "Pierre Martin",
      title: "Head of Market Research",
      seniority: "Director",
      department: "Marketing",
      email: "pierre.martin@saint-gobain.com",
      emailStatus: "valid",
      emailScore: 92,
      linkedinUrl: "https://linkedin.com/in/pierremartin",
      companyName: "Saint-Gobain",
      companyDomain: "saint-gobain.com",
      dataSource: "apollo",
      confidence: 88,
      lastVerified: new Date("2025-01-15T10:30:00"),
      reviewStatus: "pending",
      createdAt: new Date("2025-01-15T10:30:00")
    },
    {
      id: crypto.randomUUID(),
      jobId: job1Id,
      corporationId: saintGobainId,
      firstName: "Sophie",
      lastName: "Laurent",
      fullName: "Sophie Laurent",
      title: "Chief Innovation Officer",
      seniority: "C-Level",
      department: "Operations",
      email: "sophie.laurent@saint-gobain.com",
      emailStatus: "risky",
      emailScore: 65,
      linkedinUrl: "https://linkedin.com/in/sophielaurent",
      companyName: "Saint-Gobain",
      companyDomain: "saint-gobain.com",
      dataSource: "hunter",
      confidence: 75,
      lastVerified: new Date("2025-01-15T10:30:00"),
      reviewStatus: "pending",
      createdAt: new Date("2025-01-15T10:30:00")
    }
  ]);

  console.log("[SeedHunter] Created 3 hunter results for Saint-Gobain");

  // Create hunter results for Job 2 (Knauf)
  await db.insert(hunterResults).values([
    {
      id: crypto.randomUUID(),
      jobId: job2Id,
      corporationId: knaufId,
      firstName: "Hans",
      lastName: "Müller",
      fullName: "Hans Müller",
      title: "VP Sales Central Europe",
      seniority: "VP",
      department: "Sales",
      email: "hans.mueller@knauf.com",
      emailStatus: "valid",
      emailScore: 98,
      phoneNumber: "+49 9323 31 0",
      linkedinUrl: "https://linkedin.com/in/hansmueller",
      companyName: "Knauf",
      companyDomain: "knauf.com",
      dataSource: "apollo",
      confidence: 95,
      lastVerified: new Date("2025-01-16T14:20:00"),
      reviewStatus: "approved",
      reviewedBy: "admin-user-id",
      reviewedAt: new Date("2025-01-17T09:00:00"),
      createdAt: new Date("2025-01-16T14:20:00")
    },
    {
      id: crypto.randomUUID(),
      jobId: job2Id,
      corporationId: knaufId,
      firstName: "Anna",
      lastName: "Schmidt",
      fullName: "Anna Schmidt",
      title: "Director Market Intelligence",
      seniority: "Director",
      department: "Marketing",
      email: "anna.schmidt@knauf.com",
      emailStatus: "valid",
      emailScore: 85,
      linkedinUrl: "https://linkedin.com/in/annaschmidt",
      companyName: "Knauf",
      companyDomain: "knauf.com",
      dataSource: "apollo",
      confidence: 82,
      lastVerified: new Date("2025-01-16T14:20:00"),
      reviewStatus: "pending",
      createdAt: new Date("2025-01-16T14:20:00")
    }
  ]);

  console.log("[SeedHunter] Created 2 hunter results for Knauf");

  console.log("[SeedHunter] ✅ Seeding completed!");
  console.log("- 3 hunter jobs");
  console.log("- 5 hunter results (3 pending, 1 approved, 1 rejected)");
}

seedHunterData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[SeedHunter] Error:", err);
    process.exit(1);
  });

