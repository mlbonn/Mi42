/**
 * Test new Hunter workflow with Enrichment API
 * Run: pnpm tsx test-hunter-enrichment.ts
 */

import "dotenv/config";
import { generateEmailPatterns } from "./server/services/emailPatternGenerator";
import { enrichPeopleBatch } from "./server/integrations/apolloEnrichment";

async function testHunterEnrichment() {
  console.log("=".repeat(80));
  console.log("Hunter Agent - New Enrichment Workflow Test");
  console.log("=".repeat(80));
  console.log("");

  // Test companies (mix of EU and US)
  const testCompanies = [
    {
      name: "Siemens AG",
      domain: "siemens.com",
      industry: "Industrial Automation",
      region: "EU"
    },
    {
      name: "Carrier Global",
      domain: "carrier.com",
      industry: "HVAC",
      region: "US"
    },
    {
      name: "Kingspan Group",
      domain: "kingspan.com",
      industry: "Building Materials",
      region: "EU"
    }
  ];

  const targetTitles = [
    "CEO", "CTO", "CFO",
    "VP Sales", "VP Marketing", "VP Strategy",
    "Director Sales", "Director Marketing",
    "Market Intelligence Manager", "Strategy Manager"
  ];

  const targetSeniorities = ["c_suite", "vp", "director", "manager"];

  for (const company of testCompanies) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Testing: ${company.name} (${company.domain}) - ${company.region}`);
    console.log("=".repeat(80));

    try {
      // Step 1: Generate email patterns
      console.log(`\n📧 Step 1: Generating email patterns with GPT-4...`);
      const patterns = await generateEmailPatterns({
        companyName: company.name,
        domain: company.domain,
        industry: company.industry,
        targetTitles,
        targetSeniorities,
        count: 5 // Test with 5 patterns
      });

      console.log(`✅ Generated ${patterns.length} patterns`);
      patterns.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.email}`);
        console.log(`      Name: ${p.firstName} ${p.lastName}`);
        console.log(`      Title: ${p.title}`);
        console.log(`      Confidence: ${p.confidence}%`);
        console.log(`      Reasoning: ${p.reasoning}`);
      });

      // Step 2: Enrich with Apollo
      console.log(`\n🔍 Step 2: Enriching with Apollo Enrichment API...`);
      const enrichmentInputs = patterns.map(p => ({
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        domain: company.domain,
        organizationName: company.name
      }));

      const enriched = await enrichPeopleBatch(enrichmentInputs);

      const successful = enriched.filter(e => e !== null);
      console.log(`✅ Enriched ${successful.length}/${patterns.length} contacts`);

      successful.forEach((person, idx) => {
        if (!person) return;
        console.log(`\n   ${idx + 1}. ${person.name}`);
        console.log(`      Email: ${person.email} (${person.emailStatus})`);
        console.log(`      Title: ${person.title || "N/A"}`);
        console.log(`      LinkedIn: ${person.linkedinUrl ? "Yes" : "No"}`);
        console.log(`      Phone: ${person.phoneNumbers.length > 0 ? person.phoneNumbers[0] : "N/A"}`);
        console.log(`      Confidence: ${person.confidence}%`);
      });

      // Step 3: Calculate final scores
      console.log(`\n📊 Step 3: Final Confidence Scores...`);
      const results = patterns.map((pattern, idx) => {
        const enrichedPerson = enriched[idx];
        if (!enrichedPerson) return null;

        const finalConfidence = Math.round(
          (pattern.confidence * 0.3) + (enrichedPerson.confidence * 0.7)
        );

        return {
          email: pattern.email,
          name: enrichedPerson.name,
          title: enrichedPerson.title || pattern.title,
          patternConfidence: pattern.confidence,
          enrichmentConfidence: enrichedPerson.confidence,
          finalConfidence,
          emailStatus: enrichedPerson.emailStatus,
          hasLinkedIn: !!enrichedPerson.linkedinUrl,
          hasPhone: enrichedPerson.phoneNumbers.length > 0
        };
      }).filter(r => r !== null);

      results.sort((a, b) => (b?.finalConfidence || 0) - (a?.finalConfidence || 0));

      console.log(`\nTop contacts (sorted by confidence):`);
      results.forEach((r, idx) => {
        if (!r) return;
        const status = r.finalConfidence >= 50 ? "✅" : "❌";
        console.log(`   ${status} ${idx + 1}. ${r.name} (${r.finalConfidence}%)`);
        console.log(`      Email: ${r.email} (${r.emailStatus})`);
        console.log(`      Title: ${r.title}`);
        console.log(`      Pattern: ${r.patternConfidence}% | Enrichment: ${r.enrichmentConfidence}%`);
        console.log(`      LinkedIn: ${r.hasLinkedIn ? "Yes" : "No"} | Phone: ${r.hasPhone ? "Yes" : "No"}`);
      });

      const highConfidence = results.filter(r => r && r.finalConfidence >= 50).length;
      console.log(`\n📈 Summary: ${highConfidence}/${results.length} contacts with ≥50% confidence`);

    } catch (error) {
      console.error(`\n❌ Error testing ${company.name}:`, error);
    }
  }

  console.log("\n\n");
  console.log("=".repeat(80));
  console.log("Test Complete!");
  console.log("=".repeat(80));
  console.log(`
Next Steps:
1. Review generated email patterns - are they realistic?
2. Check enrichment success rate - how many emails were validated?
3. Verify confidence scores - are they reasonable?
4. If successful: Replace old hunterService.ts with hunterServiceNew.ts
5. Deploy to Hetzner and test with real corporations
  `);
}

testHunterEnrichment();

