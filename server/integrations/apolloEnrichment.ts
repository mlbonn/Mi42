/**
 * Apollo.io Enrichment API Integration
 * API Docs: https://apolloio.github.io/apollo-api-docs/#enrich-people
 * 
 * This uses the Enrichment API (Basic plan) instead of People Search API
 */

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || "";
const APOLLO_API_BASE = "https://api.apollo.io/v1";

export interface EnrichmentInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  domain?: string;
  organizationName?: string;
}

export interface EnrichedPerson {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  title: string | null;
  email: string | null;
  emailStatus: "verified" | "guessed" | "unavailable" | "unknown";
  linkedinUrl: string | null;
  phoneNumbers: string[];
  organizationName: string | null;
  seniority: string | null;
  departments: string[];
  confidence: number; // 0-100
}

/**
 * Enrich a person using Apollo Enrichment API
 * Requires at least email OR (firstName + lastName + domain)
 */
export async function enrichPerson(input: EnrichmentInput): Promise<EnrichedPerson | null> {
  if (!APOLLO_API_KEY) {
    console.warn("[Apollo Enrichment] API key not configured");
    return null;
  }

  // Validate input
  if (!input.email && !(input.firstName && input.lastName && input.domain)) {
    console.error("[Apollo Enrichment] Invalid input: need email OR (firstName + lastName + domain)");
    return null;
  }

  try {
    const requestBody: any = {};

    if (input.email) {
      requestBody.email = input.email;
    } else {
      requestBody.first_name = input.firstName;
      requestBody.last_name = input.lastName;
      requestBody.domain = input.domain;
      if (input.organizationName) {
        requestBody.organization_name = input.organizationName;
      }
    }

    console.log(`[Apollo Enrichment] Enriching person:`, requestBody);

    const response = await fetch(`${APOLLO_API_BASE}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Apollo Enrichment] API error: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Apollo Enrichment] Response:`, JSON.stringify(data, null, 2));

    // Check if person was found
    if (!data.person) {
      console.log(`[Apollo Enrichment] No match found`);
      return null;
    }

    const person = data.person;

    // Calculate confidence score based on available data
    let confidence = 50; // Base score
    if (person.email) confidence += 20;
    if (person.email_status === "verified") confidence += 20;
    if (person.linkedin_url) confidence += 10;
    if (person.phone_numbers && person.phone_numbers.length > 0) confidence += 10;
    if (person.title) confidence += 10;

    const enriched: EnrichedPerson = {
      id: person.id || crypto.randomUUID(),
      firstName: person.first_name || input.firstName || "",
      lastName: person.last_name || input.lastName || "",
      name: person.name || `${person.first_name || input.firstName} ${person.last_name || input.lastName}`,
      title: person.title || null,
      email: person.email || input.email || null,
      emailStatus: mapEmailStatus(person.email_status),
      linkedinUrl: person.linkedin_url || null,
      phoneNumbers: person.phone_numbers || [],
      organizationName: person.organization?.name || input.organizationName || null,
      seniority: person.seniority || null,
      departments: person.departments || [],
      confidence: Math.min(100, confidence),
    };

    console.log(`[Apollo Enrichment] Enriched successfully (confidence: ${enriched.confidence}%)`);
    return enriched;

  } catch (error) {
    console.error("[Apollo Enrichment] Error:", error);
    return null;
  }
}

/**
 * Batch enrich multiple people
 * More efficient than calling enrichPerson multiple times
 */
export async function enrichPeopleBatch(inputs: EnrichmentInput[]): Promise<(EnrichedPerson | null)[]> {
  console.log(`[Apollo Enrichment] Batch enriching ${inputs.length} people`);
  
  // Apollo Enrichment API doesn't have a native batch endpoint
  // So we process sequentially with a small delay to avoid rate limiting
  const results: (EnrichedPerson | null)[] = [];
  
  for (let i = 0; i < inputs.length; i++) {
    const result = await enrichPerson(inputs[i]);
    results.push(result);
    
    // Small delay between requests (200ms)
    if (i < inputs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const successful = results.filter(r => r !== null).length;
  console.log(`[Apollo Enrichment] Batch complete: ${successful}/${inputs.length} successful`);
  
  return results;
}

/**
 * Map Apollo email status to our enum
 */
function mapEmailStatus(status: string | undefined): "verified" | "guessed" | "unavailable" | "unknown" {
  if (!status) return "unknown";
  
  switch (status.toLowerCase()) {
    case "verified":
    case "valid":
      return "verified";
    case "guessed":
    case "likely":
      return "guessed";
    case "unavailable":
    case "invalid":
      return "unavailable";
    default:
      return "unknown";
  }
}

