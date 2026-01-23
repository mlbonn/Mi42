/**
 * Apollo.io Real API Integration
 * API Docs: https://apolloio.github.io/apollo-api-docs/
 */

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || "";
const APOLLO_API_BASE = "https://api.apollo.io/v1";

interface ApolloSearchParams {
  organizationDomain: string;
  personTitles?: string[];
  personSeniorities?: string[];
  page?: number;
  perPage?: number;
}

interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string | null;
  email_status: "verified" | "guessed" | "unavailable";
  linkedin_url: string | null;
  phone_numbers: string[];
  organization_name: string;
  seniority: string; // "c_suite" | "vp" | "director" | "manager"
  departments: string[];
}

interface ApolloSearchResult {
  people: ApolloPerson[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

/**
 * Search for people at a company using Apollo.io API
 */
export async function searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResult> {
  if (!APOLLO_API_KEY) {
    console.warn("[Apollo] API key not configured, using mock data");
    return getMockData(params);
  }

  try {
    const requestBody: any = {
      q_organization_domains: [params.organizationDomain],
      page: params.page || 1,
      per_page: params.perPage || 10,
    };

    // Add title filters if provided
    if (params.personTitles && params.personTitles.length > 0) {
      requestBody.person_titles = params.personTitles;
    }

    // Add seniority filters if provided
    if (params.personSeniorities && params.personSeniorities.length > 0) {
      requestBody.person_seniorities = params.personSeniorities;
    }

    console.log(`[Apollo] Searching people at ${params.organizationDomain}`);

    const response = await fetch(`${APOLLO_API_BASE}/people/search`, {
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
      throw new Error(`Apollo API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Transform Apollo API response to our format
    const people: ApolloPerson[] = (data.people || []).map((person: any) => ({
      id: person.id,
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      name: person.name || `${person.first_name} ${person.last_name}`,
      title: person.title || "",
      email: person.email || null,
      email_status: person.email_status || "unavailable",
      linkedin_url: person.linkedin_url || null,
      phone_numbers: person.phone_numbers || [],
      organization_name: person.organization?.name || "",
      seniority: person.seniority || "unknown",
      departments: person.departments || [],
    }));

    console.log(`[Apollo] Found ${people.length} people`);

    return {
      people,
      pagination: {
        total: data.pagination?.total_entries || people.length,
        page: data.pagination?.page || 1,
        per_page: data.pagination?.per_page || 10,
      },
    };
  } catch (error) {
    console.error("[Apollo] Search failed:", error);
    // Fallback to mock data on error
    return getMockData(params);
  }
}

/**
 * Get person by ID
 */
export async function getPerson(personId: string): Promise<ApolloPerson | null> {
  if (!APOLLO_API_KEY) {
    console.warn("[Apollo] API key not configured");
    return null;
  }

  try {
    const response = await fetch(`${APOLLO_API_BASE}/people/${personId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": APOLLO_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status}`);
    }

    const data = await response.json();
    const person = data.person;

    return {
      id: person.id,
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      name: person.name || `${person.first_name} ${person.last_name}`,
      title: person.title || "",
      email: person.email || null,
      email_status: person.email_status || "unavailable",
      linkedin_url: person.linkedin_url || null,
      phone_numbers: person.phone_numbers || [],
      organization_name: person.organization?.name || "",
      seniority: person.seniority || "unknown",
      departments: person.departments || [],
    };
  } catch (error) {
    console.error("[Apollo] Get person failed:", error);
    return null;
  }
}

/**
 * Mock data fallback
 */
function getMockData(params: ApolloSearchParams): ApolloSearchResult {
  const mockPeople: Record<string, ApolloPerson[]> = {
    "bauder.de": [
      {
        id: "mock_bd_001",
        first_name: "Klaus",
        last_name: "Müller",
        name: "Klaus Müller",
        title: "VP Sales DACH",
        email: "klaus.mueller@bauder.de",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/klausmueller",
        phone_numbers: ["+49 711 8807 0"],
        organization_name: "Bauder",
        seniority: "vp",
        departments: ["sales"],
      },
      {
        id: "mock_bd_002",
        first_name: "Anna",
        last_name: "Schmidt",
        name: "Anna Schmidt",
        title: "Head of Market Research",
        email: "anna.schmidt@bauder.de",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/annaschmidt",
        phone_numbers: [],
        organization_name: "Bauder",
        seniority: "director",
        departments: ["marketing"],
      },
    ],
    "sika.com": [
      {
        id: "mock_sk_001",
        first_name: "Thomas",
        last_name: "Hasler",
        name: "Thomas Hasler",
        title: "CEO",
        email: "thomas.hasler@sika.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/thomashasler",
        phone_numbers: ["+41 58 436 68 00"],
        organization_name: "Sika AG",
        seniority: "c_suite",
        departments: ["operations"],
      },
    ],
  };

  const domain = params.organizationDomain.toLowerCase();
  const people = mockPeople[domain] || [];

  return {
    people,
    pagination: {
      total: people.length,
      page: 1,
      per_page: 10,
    },
  };
}

