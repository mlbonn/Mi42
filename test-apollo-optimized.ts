/**
 * Test Apollo API with optimized filters
 * Run: tsx test-apollo-optimized.ts
 */

import "dotenv/config";
import { searchPeople } from "./server/integrations/apollo";

async function testApolloOptimized() {
  console.log("=".repeat(80));
  console.log("Apollo API Test - Optimized Filters");
  console.log("=".repeat(80));
  console.log("");

  // Test domains (EU manufacturers)
  const testDomains = [
    "siemens.com",      // Siemens (Germany)
    "basf.com",         // BASF (Germany)
    "sika.com",         // Sika (Switzerland)
    "kingspan.com",     // Kingspan (Ireland)
    "crh.com",          // CRH (Ireland)
  ];

  for (const domain of testDomains) {
    console.log(`\nTesting: ${domain}`);
    console.log("-".repeat(80));

    try {
      // Test 1: Only Seniorities (no titles, no departments)
      console.log("\n✅ Test 1: Only Seniorities (c_suite, vp, director, manager)");
      const result1 = await searchPeople({
        organizationDomain: domain,
        personSeniorities: ["c_suite", "vp", "director", "manager"],
        perPage: 10
      });
      console.log(`   Found: ${result1.people.length} contacts`);
      if (result1.people.length > 0) {
        console.log(`   Sample: ${result1.people[0].name} - ${result1.people[0].title} (${result1.people[0].seniority})`);
      }

      // Test 2: Only C-Suite + VP (narrower)
      console.log("\n✅ Test 2: Only C-Suite + VP");
      const result2 = await searchPeople({
        organizationDomain: domain,
        personSeniorities: ["c_suite", "vp"],
        perPage: 10
      });
      console.log(`   Found: ${result2.people.length} contacts`);
      if (result2.people.length > 0) {
        console.log(`   Sample: ${result2.people[0].name} - ${result2.people[0].title} (${result2.people[0].seniority})`);
      }

      // Test 3: With specific titles (old approach)
      console.log("\n❌ Test 3: With Specific Titles (old approach - likely 0 results)");
      const result3 = await searchPeople({
        organizationDomain: domain,
        personTitles: ["Market Intelligence Manager", "Market Research Manager", "Strategy Manager"],
        personSeniorities: ["c_suite", "vp", "director"],
        perPage: 10
      });
      console.log(`   Found: ${result3.people.length} contacts`);

      console.log("");
      console.log("Summary:");
      console.log(`  - Broad Seniorities (c_suite+vp+director+manager): ${result1.people.length} contacts`);
      console.log(`  - Narrow Seniorities (c_suite+vp): ${result2.people.length} contacts`);
      console.log(`  - Specific Titles: ${result3.people.length} contacts`);
      console.log("");

    } catch (error) {
      console.error(`Error testing ${domain}:`, error);
    }
  }

  console.log("=".repeat(80));
  console.log("Test complete!");
  console.log("=".repeat(80));
}

testApolloOptimized();

