/**
 * Hunter.io Mock Integration
 * Real API: https://hunter.io/api-documentation
 */

interface FindEmailParams {
  domain: string;
  firstName: string;
  lastName: string;
}

interface FindEmailResult {
  email: string;
  score: number; // 0-100
  sources: { domain: string; uri: string; extracted_on: string }[];
  position: string | null;
  company: string | null;
}

interface VerifyEmailResult {
  result: "deliverable" | "undeliverable" | "risky" | "unknown";
  score: number; // 0-100
  email: string;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
  block: boolean;
}

/**
 * Find email address for a person
 * Mock implementation - replace with real API call
 */
export async function findEmail(params: FindEmailParams): Promise<FindEmailResult | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Generate email based on common patterns
  const first = params.firstName.toLowerCase();
  const last = params.lastName.toLowerCase();
  const domain = params.domain.toLowerCase();

  // Common email patterns
  const patterns = [
    `${first}.${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${first[0]}${last}@${domain}`,
    `${first}_${last}@${domain}`
  ];

  // Mock: Use first pattern
  const email = patterns[0];

  // Mock scoring based on domain
  const knownDomains = ["saint-gobain.com", "knauf.com", "rockwool.com", "jameshardie.com"];
  const score = knownDomains.includes(domain) ? 92 : 65;

  return {
    email,
    score,
    sources: [
      {
        domain: domain,
        uri: `https://${domain}/team`,
        extracted_on: new Date().toISOString()
      }
    ],
    position: null,
    company: null
  };
}

/**
 * Verify email address
 * Mock implementation - replace with real API call
 */
export async function verifyEmail(email: string): Promise<VerifyEmailResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Extract domain
  const domain = email.split("@")[1];

  // Mock verification based on domain
  const knownDomains = ["saint-gobain.com", "knauf.com", "rockwool.com", "jameshardie.com", "etexgroup.com"];
  const isKnownDomain = knownDomains.includes(domain);

  // Mock disposable email detection
  const disposableDomains = ["tempmail.com", "guerrillamail.com", "10minutemail.com"];
  const isDisposable = disposableDomains.includes(domain);

  // Mock webmail detection
  const webmailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
  const isWebmail = webmailDomains.includes(domain);

  // Determine result
  let result: "deliverable" | "undeliverable" | "risky" | "unknown";
  let score: number;

  if (isDisposable) {
    result = "undeliverable";
    score = 10;
  } else if (isKnownDomain) {
    result = "deliverable";
    score = 95;
  } else if (isWebmail) {
    result = "risky";
    score = 60;
  } else {
    result = "unknown";
    score = 50;
  }

  return {
    result,
    score,
    email,
    regexp: true,
    gibberish: false,
    disposable: isDisposable,
    webmail: isWebmail,
    mx_records: !isDisposable,
    smtp_server: !isDisposable,
    smtp_check: isKnownDomain,
    accept_all: false,
    block: isDisposable
  };
}

/**
 * Domain search - find all emails for a domain
 * Mock implementation
 */
export async function domainSearch(domain: string): Promise<{ emails: string[] }> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock: Return empty for now
  return { emails: [] };
}

