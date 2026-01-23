/**
 * FRIDAY CRM - Scout Agent Worker
 * Processes scout queue jobs: website analysis and competitor discovery
 */

import * as scoutDb from "./scoutDb";
import * as db from "./db";
import { ScoutQueueJob } from "../drizzle/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// ============================================================================
// MAIN WORKER FUNCTION
// ============================================================================

export async function processNextQueueJob(): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    // Get next pending job
    const jobs = await scoutDb.getScoutQueueJobs({
      status: "Pending",
      limit: 1,
    });

    if (jobs.length === 0) {
      return { success: false, error: "No pending jobs" };
    }

    const job = jobs[0];

    // Update status to Processing
    await scoutDb.updateScoutQueueJob(job.id, {
      status: "Processing",
      startedAt: new Date(),
    });

    try {
      // Process the job based on seed type
      await processJob(job);

      // Mark as completed
      await scoutDb.updateScoutQueueJob(job.id, {
        status: "Completed",
        completedAt: new Date(),
      });

      return { success: true, jobId: job.id };
    } catch (error: any) {
      // Mark as failed
      await scoutDb.updateScoutQueueJob(job.id, {
        status: "Failed",
        completedAt: new Date(),
        errorMessage: error.message,
        metadata: { error: error.message },
      });

      return { success: false, jobId: job.id, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// JOB PROCESSING
// ============================================================================

async function processJob(job: ScoutQueueJob) {
  const seedData = job.seedData as any;

  switch (job.seedType) {
    case "manual":
      await processManualSeed(job, seedData);
      break;
    case "linkedin":
      await processLinkedInSeed(job, seedData);
      break;
    case "press":
      await processPressSeed(job, seedData);
      break;
    default:
      throw new Error(`Unknown seed type: ${job.seedType}`);
  }
}

// ============================================================================
// MANUAL SEED PROCESSING
// ============================================================================

async function processManualSeed(
  job: ScoutQueueJob,
  seedData: { companyName: string; website: string }
) {
  console.log(`Processing manual seed: ${seedData.companyName} (${seedData.website})`);

  // Step 1: Fetch website content
  const websiteContent = await fetchWebsiteContent(seedData.website);

  // Step 2: Analyze with OpenAI
  const analysis = await analyzeWebsiteWithAI(
    seedData.companyName,
    seedData.website,
    websiteContent
  );

  // Step 3: Store analysis results
  await scoutDb.updateScoutQueueJob(job.id, {
    metadata: {
      companyName: seedData.companyName,
      website: seedData.website,
      analysis,
      processedAt: new Date().toISOString(),
    },
  });

  // Step 4: Search for competitors
  console.log(`Analysis complete for ${seedData.companyName}`);
  console.log(`Industries: ${analysis.industries?.join(", ")}`);
  console.log(`Products: ${analysis.products?.join(", ")}`);
  console.log(`Markets: ${analysis.markets?.join(", ")}`);
  
  // Step 5: Load Scout Settings (use admin user ID for now - TODO: get from job context)
  const settingsRaw = await db.getScoutSettings('admin');
  const settings = settingsRaw ? {
    minRevenueMio: settingsRaw.minRevenueMio || 100,
    minEmployees: settingsRaw.minEmployees || 500,
    companyTypes: settingsRaw.companyTypes || ['Manufacturer'],
    targetMarkets: settingsRaw.targetMarkets || ['DE', 'US', 'UK', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'SE', 'DK', 'NO', 'FI'],
  } : undefined;
  console.log(`Scout Settings: minRevenue=${settings?.minRevenueMio}M EUR, minEmployees=${settings?.minEmployees}, types=${settings?.companyTypes?.join(',')}`);
  
  // Step 6: Discover competitors with GPT-4
  const competitors = await discoverCompetitors(seedData.companyName, analysis, settings);
  console.log(`Found ${competitors.length} competitors`);
  
  // Step 7: Create suggestions for review
  for (const competitor of competitors) {
    await createCompetitorSuggestion(competitor, job.generation || 0);
  }
}

// ============================================================================
// WEBSITE FETCHING
// ============================================================================

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract text content (simple version - remove HTML tags)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to first 8000 characters for AI analysis
    return text.substring(0, 8000);
  } catch (error: any) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return "";
  }
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

async function analyzeWebsiteWithAI(
  companyName: string,
  website: string,
  content: string
): Promise<{
  industries: string[];
  products: string[];
  markets: string[];
  countries: string[];
  description: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, using mock analysis");
    return {
      industries: ["Unknown"],
      products: ["Unknown"],
      markets: ["Unknown"],
      countries: ["Unknown"],
      description: `Analysis for ${companyName} - OpenAI API not configured`,
    };
  }

  try {
    const prompt = `Analyze this company website and extract key information.

Company: ${companyName}
Website: ${website}

Website Content:
${content}

Please provide a JSON response with the following structure:
{
  "industries": ["industry1", "industry2"],
  "products": ["product1", "product2"],
  "markets": ["market1", "market2"],
  "countries": ["country1", "country2"],
  "description": "brief company description"
}

Focus on:
- Main industries/sectors (e.g., "Building Materials", "Automotive", "Software")
- Key products or services
- Target markets or customer segments
- Geographic presence (countries)
- Brief description (1-2 sentences)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a business analyst extracting structured information from company websites. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response (remove markdown code blocks if present)
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const analysis = JSON.parse(jsonStr);
    return analysis;
  } catch (error: any) {
    console.error("AI analysis failed:", error.message);
    return {
      industries: ["Unknown"],
      products: ["Unknown"],
      markets: ["Unknown"],
      countries: ["Unknown"],
      description: `Analysis failed for ${companyName}: ${error.message}`,
    };
  }
}

// ============================================================================
// COMPETITOR DISCOVERY
// ============================================================================

interface CompetitorInfo {
  name: string;
  website: string;
  country: string;
  estimatedRevenue?: string;
  estimatedEmployees?: number;
  description: string;
}

async function discoverCompetitors(
  seedCompanyName: string,
  analysis: {
    industries: string[];
    products: string[];
    markets: string[];
    countries: string[];
    description: string;
  },
  settings?: {
    minRevenueMio: number;
    minEmployees: number;
    companyTypes: string[];
    targetMarkets: string[];
  }
): Promise<CompetitorInfo[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping competitor discovery");
    return [];
  }

  try {
    const prompt = `You are a B2B market research analyst. Find direct competitors of this company.

Company: ${seedCompanyName}
Industries: ${analysis.industries.join(", ")}
Products: ${analysis.products.join(", ")}
Markets: ${analysis.markets.join(", ")}
Description: ${analysis.description}

**IMPORTANT FILTERS:**
1. Company types: ${settings?.companyTypes.join(', ') || 'Manufacturers only'} (NO ${settings?.companyTypes.includes('Manufacturer') ? 'distributors, retailers' : 'other types'})
2. ONLY companies with >${settings?.minRevenueMio || 100}M EUR revenue OR >${settings?.minEmployees || 500} employees
3. Focus on these markets: ${settings?.targetMarkets.join(', ') || 'DE, US, UK, FR, IT, ES, NL, BE, AT, CH, PL, SE, DK, NO, FI'}

Provide a JSON array with 5-10 direct competitors:
[
  {
    "name": "Company Name",
    "website": "https://www.example.com",
    "country": "DE",
    "estimatedRevenue": "500M EUR",
    "estimatedEmployees": 2000,
    "description": "Brief description of what they manufacture"
  }
]

**IMPORTANT:** Use ISO 2-letter country codes (DE, US, FR, UK, CH, IT, ES, NL, BE, AT, PL, SE, DK, NO, FI) for the "country" field.

Only include companies that meet ALL criteria above.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a B2B market research analyst specializing in identifying manufacturing companies. Always respond with valid JSON arrays. Only include manufacturers with >100M EUR revenue or >500 employees.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response (remove markdown if present)
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const competitors: CompetitorInfo[] = JSON.parse(jsonStr);
    console.log(`GPT-4 found ${competitors.length} competitors for ${seedCompanyName}`);
    return competitors;
  } catch (error: any) {
    console.error("Competitor discovery failed:", error.message);
    return [];
  }
}

async function createCompetitorSuggestion(
  competitor: CompetitorInfo,
  parentGeneration: number
) {
  try {
    // Check if corporation already exists (simplified - just try to create)
    // TODO: Add proper duplicate check by name

    // Create corporation as Pending suggestion
    const corpData: any = {
      name: competitor.name,
      status: "Target",
      priority: "Medium",
      notes: `${competitor.description}\n\nEstimated Revenue: ${competitor.estimatedRevenue || 'Unknown'}\nEstimated Employees: ${competitor.estimatedEmployees || 'Unknown'}`,
      stage: "Producer",
      scoutStatus: "Pending",
      scoutGeneration: parentGeneration + 1,
      discoveryMethod: "competitor_analysis",
      discoveredAt: new Date(),
    };
    if (competitor.website) corpData.website = competitor.website;
    if (competitor.country) corpData.headquartersCountry = competitor.country;
    if (competitor.estimatedEmployees) corpData.employeeCount = competitor.estimatedEmployees;
    
    await db.createCorporation(corpData);

    console.log(`✅ Created suggestion: ${competitor.name} (Gen ${parentGeneration + 1})`);
  } catch (error: any) {
    console.error(`Failed to create suggestion for ${competitor.name}:`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    console.error(`Error details:`, JSON.stringify(error, null, 2));
  }
}

// ============================================================================
// LINKEDIN SEED PROCESSING (Placeholder)
// ============================================================================

async function processLinkedInSeed(
  job: ScoutQueueJob,
  seedData: { linkedinUrl: string }
) {
  console.log(`Processing LinkedIn seed: ${seedData.linkedinUrl}`);
  // TODO: Implement LinkedIn scraping/API
  throw new Error("LinkedIn seed processing not yet implemented");
}

// ============================================================================
// PRESS SEED PROCESSING (Placeholder)
// ============================================================================

async function processPressSeed(
  job: ScoutQueueJob,
  seedData: { pressUrl: string }
) {
  console.log(`Processing press seed: ${seedData.pressUrl}`);
  // TODO: Implement press article analysis
  throw new Error("Press seed processing not yet implemented");
}

