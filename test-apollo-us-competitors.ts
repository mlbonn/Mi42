/**
 * Test Apollo API with US Building Materials Competitors
 * Run: pnpm tsx test-apollo-us-competitors.ts
 */

import "dotenv/config";
import { searchPeople } from "./server/integrations/apollo";

async function testApolloUSCompetitors() {
  console.log("=".repeat(80));
  console.log("Apollo API Test - US Building Materials & HVAC Competitors");
  console.log("=".repeat(80));
  console.log("");

  // US Competitors grouped by category
  const competitors = {
    "Insulation & Building Envelope": [
      { name: "Owens Corning", domain: "owenscorning.com" },
      { name: "Johns Manville", domain: "jm.com" },
      { name: "Carlisle Companies", domain: "carlisle.com" },
      { name: "GAF Materials", domain: "gaf.com" },
    ],
    "Aggregates & Heavy Building Materials": [
      { name: "Vulcan Materials", domain: "vulcanmaterials.com" },
      { name: "Martin Marietta", domain: "martinmarietta.com" },
      { name: "Summit Materials", domain: "summit-materials.com" },
    ],
    "Fiber Cement & Exterior Products": [
      { name: "James Hardie", domain: "jameshardie.com" },
      { name: "Nichiha USA", domain: "nichiha.com" },
    ],
    "HVAC & Climate Control": [
      { name: "Carrier Global", domain: "carrier.com" },
      { name: "Trane Technologies", domain: "tranetechnologies.com" },
      { name: "Lennox International", domain: "lennoxinternational.com" },
      { name: "Johnson Controls", domain: "johnsoncontrols.com" },
    ],
  };

  const results: any[] = [];

  for (const [category, companies] of Object.entries(competitors)) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Category: ${category}`);
    console.log("=".repeat(80));

    for (const company of companies) {
      console.log(`\n📍 Testing: ${company.name} (${company.domain})`);
      console.log("-".repeat(80));

      try {
        // Test with optimized filters (broad seniorities, no titles)
        const result = await searchPeople({
          organizationDomain: company.domain,
          personSeniorities: ["c_suite", "vp", "director", "manager"],
          perPage: 10
        });

        const found = result.people.length;
        console.log(`✅ Found: ${found} contacts`);

        if (found > 0) {
          console.log(`\nSample contacts:`);
          result.people.slice(0, 3).forEach((person, idx) => {
            console.log(`  ${idx + 1}. ${person.name}`);
            console.log(`     Title: ${person.title || "N/A"}`);
            console.log(`     Seniority: ${person.seniority || "N/A"}`);
            console.log(`     Email: ${person.email || "Not available"}`);
            console.log(`     LinkedIn: ${person.linkedin_url ? "Yes" : "No"}`);
          });
        }

        results.push({
          category,
          company: company.name,
          domain: company.domain,
          contacts: found,
          success: found > 0
        });

      } catch (error) {
        console.error(`❌ Error testing ${company.name}:`, error);
        results.push({
          category,
          company: company.name,
          domain: company.domain,
          contacts: 0,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Summary Report
  console.log("\n\n");
  console.log("=".repeat(80));
  console.log("SUMMARY REPORT");
  console.log("=".repeat(80));
  console.log("");

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalContacts = results.reduce((sum, r) => sum + r.contacts, 0);

  console.log(`Total Companies Tested: ${results.length}`);
  console.log(`Successful (>0 contacts): ${successful.length}`);
  console.log(`Failed (0 contacts): ${failed.length}`);
  console.log(`Total Contacts Found: ${totalContacts}`);
  console.log(`Average per Company: ${(totalContacts / results.length).toFixed(1)}`);
  console.log("");

  console.log("Results by Category:");
  for (const [category, companies] of Object.entries(competitors)) {
    const categoryResults = results.filter(r => r.category === category);
    const categoryTotal = categoryResults.reduce((sum, r) => sum + r.contacts, 0);
    console.log(`\n${category}:`);
    categoryResults.forEach(r => {
      const status = r.success ? "✅" : "❌";
      console.log(`  ${status} ${r.company.padEnd(30)} ${r.contacts} contacts`);
    });
    console.log(`  Total: ${categoryTotal} contacts`);
  }

  console.log("\n");
  console.log("=".repeat(80));
  console.log("Conclusion:");
  console.log("=".repeat(80));
  
  if (successful.length > 0) {
    console.log("✅ Apollo.io works for US companies!");
    console.log(`   Best results: ${successful.sort((a, b) => b.contacts - a.contacts).slice(0, 3).map(r => `${r.company} (${r.contacts})`).join(", ")}`);
  } else {
    console.log("❌ Apollo.io returned 0 contacts for all US companies");
    console.log("   This indicates a broader API issue or account limitation");
  }

  if (failed.length > 0 && successful.length > 0) {
    console.log(`\n⚠️  ${failed.length} companies returned 0 contacts:`);
    failed.forEach(r => console.log(`   - ${r.company} (${r.domain})`));
  }

  console.log("\n");
}

testApolloUSCompetitors();

