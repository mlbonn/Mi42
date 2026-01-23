/**
 * FRIDAY CRM - Scout Agent Worker (Company-First Workflow)
 * Discovers concrete companies and auto-groups them into corporations
 */

import * as scoutDb from "./scoutDb";
import * as db from "./db";
import { ScoutQueueJob } from "../drizzle/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface CompanyDiscovery {
  name: string;
  website: string;
  city: string;
  country: string;
  address?: string;
  description: string;
  products: string[];
  estimatedRevenue?: string;
  estimatedEmployees?: number;
  parentCorporation?: string; // Name of parent corporation (e.g. "BASF" for "BASF SE")
}

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
        metadata: {
          error: error.message,
          stack: error.stack,
        },
      });

      throw error;
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
  
  // Step 5: Load Scout Settings
  const settingsRaw = await db.getScoutSettings('admin');
  const settings = settingsRaw ? {
    minRevenueMio: settingsRaw.minRevenueMio || 100,
    minEmployees: settingsRaw.minEmployees || 500,
    companyTypes: settingsRaw.companyTypes || ['Manufacturer'],
    targetMarkets: settingsRaw.targetMarkets || ['DE', 'US', 'UK', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'PL', 'SE', 'DK', 'NO', 'FI'],
  } : undefined;
  console.log(`Scout Settings: minRevenue=${settings?.minRevenueMio}M EUR, minEmployees=${settings?.minEmployees}, types=${settings?.companyTypes?.join(',')}`);
  
  // Step 6: Discover COMPANIES (not corporations) with GPT-4
  const companies = await discoverCompanies(seedData.companyName, analysis, settings);
  console.log(`Found ${companies.length} competitor companies`);
  
  // Step 7: Create company suggestions for review
  for (const company of companies) {
    await createCompanySuggestion(company, job.generation || 0);
  }
}

// ============================================================================
// WEBSITE FETCHING
// ============================================================================

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Extract text content (remove HTML tags)
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.substring(0, 5000);
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
  description: string;
}> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, using fallback analysis");
    return {
      industries: ["Unknown"],
      products: ["Unknown"],
      markets: ["Unknown"],
      description: "Analysis not available (OpenAI API key not configured)",
    };
  }

  try {
    const prompt = `Analyze this company website and extract key information.

Company: ${companyName}
Website: ${website}
Content: ${content}

Provide a JSON response with:
{
  "industries": ["Industry 1", "Industry 2"],
  "products": ["Product 1", "Product 2"],
  "markets": ["DE", "US", "FR"],
  "description": "Brief description of the company"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a B2B market research analyst. Extract structured information from company websites. Always respond with valid JSON.",
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

    // Parse JSON response
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Website analysis failed:", error.message);
    return {
      industries: ["Unknown"],
      products: ["Unknown"],
      markets: ["Unknown"],
      description: "Analysis failed",
    };
  }
}

// ============================================================================
// COMPANY DISCOVERY (Company-First Workflow)
// ============================================================================

async function discoverCompanies(
  seedCompanyName: string,
  analysis: {
    industries: string[];
    products: string[];
    markets: string[];
    description: string;
  },
  settings?: {
    minRevenueMio: number;
    minEmployees: number;
    companyTypes: string[];
    targetMarkets: string[];
  }
): Promise<CompanyDiscovery[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping company discovery");
    return [];
  }

  try {
    const prompt = `You are a B2B market research analyst. Find direct competitor COMPANIES (concrete legal entities with addresses) of this company.

Company: ${seedCompanyName}
Industries: ${analysis.industries.join(", ")}
Products: ${analysis.products.join(", ")}
Markets: ${analysis.markets.join(", ")}
Description: ${analysis.description}

**IMPORTANT FILTERS:**
1. Company types: ${settings?.companyTypes.join(', ') || 'Manufacturers only'} (NO ${settings?.companyTypes.includes('Manufacturer') ? 'distributors, retailers' : 'other types'})
2. ONLY companies with >${settings?.minRevenueMio || 100}M EUR revenue OR >${settings?.minEmployees || 500} employees
3. Focus on these markets: ${settings?.targetMarkets.join(', ') || 'DE, US, UK, FR, IT, ES, NL, BE, AT, CH, PL, SE, DK, NO, FI'}

**IMPORTANT:** Return CONCRETE COMPANIES (e.g. "BASF SE", "Siemens AG"), NOT parent corporations (e.g. "BASF", "Siemens").

Provide a JSON array with 5-10 competitor companies:
[
  {
    "name": "BASF SE",
    "website": "https://www.basf.com",
    "city": "Ludwigshafen",
    "country": "DE",
    "address": "Carl-Bosch-Straße 38",
    "description": "Chemical manufacturer specializing in...",
    "products": ["Product 1", "Product 2"],
    "estimatedRevenue": "500M EUR",
    "estimatedEmployees": 2000,
    "parentCorporation": "BASF"
  }
]

**IMPORTANT:** 
- Use ISO 2-letter country codes (DE, US, FR, UK, CH, IT, ES, NL, BE, AT, PL, SE, DK, NO, FI)
- Include parent corporation name if the company is part of a larger group
- Include concrete city and address if known

Only include companies that meet ALL criteria above.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a B2B market research analyst specializing in identifying manufacturing companies. Always respond with valid JSON arrays. Return concrete companies with addresses, not parent corporations.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    let jsonStr = result.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const companies: CompanyDiscovery[] = JSON.parse(jsonStr);
    console.log(`GPT-4 found ${companies.length} competitor companies for ${seedCompanyName}`);
    return companies;
  } catch (error: any) {
    console.error("Company discovery failed:", error.message);
    return [];
  }
}

// ============================================================================
// CREATE COMPANY SUGGESTION (with auto-corporation linking)
// ============================================================================

async function createCompanySuggestion(
  company: CompanyDiscovery,
  parentGeneration: number
) {
  try {
    // Step 1: Find or create parent Corporation
    let corporationId: string | null = null;
    
    if (company.parentCorporation) {
      corporationId = await findOrCreateCorporation(company.parentCorporation, company.country);
    }

    // Step 2: Create Company as Pending suggestion
    // Note: Use undefined (not null) for optional fields - Drizzle treats undefined as "omit field"
    const companyData: any = {
      name: company.name,
      website: company.website,
      city: company.city,
      country: company.country,
      address: company.address,
      products: JSON.stringify(company.products),
      notes: `${company.description}\n\nEstimated Revenue: ${company.estimatedRevenue || 'Unknown'}\nEstimated Employees: ${company.estimatedEmployees || 'Unknown'}\n\nDiscovery Method: competitor_analysis\nGeneration: ${parentGeneration + 1}\nStatus: Pending Review`,
    };

    // Only add optional fields if they have values
    if (corporationId) {
      companyData.corporationId = corporationId;
    }
    if (company.estimatedRevenue) {
      const revenue = parseFloat(company.estimatedRevenue.replace(/[^0-9.]/g, ''));
      if (!isNaN(revenue) && revenue > 0) {
        companyData.revenueEur = revenue * 1000000;
      }
    }

    await db.createCompany(companyData);

    console.log(`✅ Created company suggestion: ${company.name} (Gen ${parentGeneration + 1})${corporationId ? ` → ${company.parentCorporation}` : ''}`);
  } catch (error: any) {
    console.error(`Failed to create company suggestion for ${company.name}:`);
    console.error(`Error message: ${error.message}`);
  }
}

// ============================================================================
// FIND OR CREATE CORPORATION (with fuzzy matching)
// ============================================================================

async function findOrCreateCorporation(
  corporationName: string,
  country: string
): Promise<string> {
  try {
    // Step 1: Try exact match
    const existingCorps = await db.getAllCorporations();
    const exactMatch = existingCorps.find(
      (corp) => corp.name.toLowerCase() === corporationName.toLowerCase()
    );

    if (exactMatch) {
      console.log(`✅ Found existing corporation: ${exactMatch.name} (${exactMatch.id})`);
      return exactMatch.id;
    }

    // Step 2: Try fuzzy match (simple similarity)
    const fuzzyMatch = existingCorps.find((corp) => {
      const similarity = calculateSimilarity(
        corp.name.toLowerCase(),
        corporationName.toLowerCase()
      );
      return similarity > 0.8; // 80% similarity threshold
    });

    if (fuzzyMatch) {
      console.log(`✅ Found similar corporation: ${fuzzyMatch.name} (${fuzzyMatch.id}) for ${corporationName}`);
      return fuzzyMatch.id;
    }

    // Step 3: Create new corporation
    const newCorp = await db.createCorporation({
      name: corporationName,
      status: "Target",
      priority: "Medium",
      stage: "Producer",
      headquartersCountry: country,
      scoutStatus: "Approved", // Auto-approve corporations (they're just grouping containers)
      discoveryMethod: "auto_grouped",
      discoveredAt: new Date(),
      totalRevenueEur: null,
      industry: null,
      website: null,
      linkedinUrl: null,
      notes: null,
      companySize: null,
      products: null,
      targetMarkets: null,
      countries: null,
      referenceCustomers: null,
      employeeCount: null,
      international: false,
      profileAnalyzedAt: null,
      scoutGeneration: 0,
      scoutParentId: null,
    });

    console.log(`✅ Created new corporation: ${corporationName} (${newCorp.id})`);
    return newCorp.id;
  } catch (error: any) {
    console.error(`Failed to find/create corporation ${corporationName}:`, error.message);
    throw error;
  }
}

// Simple string similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
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
  seedData: { pressArticleUrl: string }
) {
  console.log(`Processing press seed: ${seedData.pressArticleUrl}`);
  // TODO: Implement press article scraping
  throw new Error("Press seed processing not yet implemented");
}

