# Hunter Agent - Implementierungsplan

## Ziel
Automatische Identifikation von 3-5 relevanten Ansprechpartnern pro Zielunternehmen (C-Level, VP Sales, Market Research Manager).

## Architektur

### Phase 1: Datenbank-Schema
```sql
-- Neue Tabelle: hunter_jobs
CREATE TABLE hunter_jobs (
  id VARCHAR(64) PRIMARY KEY,
  corporationId VARCHAR(64) REFERENCES corporations(id),
  status ENUM('pending', 'processing', 'completed', 'failed'),
  priority INT DEFAULT 5,
  targetRoles JSON, -- ["CEO", "VP Sales", "Market Research Manager"]
  targetCount INT DEFAULT 5,
  createdAt TIMESTAMP,
  completedAt TIMESTAMP,
  error TEXT
);

-- Neue Tabelle: hunter_results
CREATE TABLE hunter_results (
  id VARCHAR(64) PRIMARY KEY,
  jobId VARCHAR(64) REFERENCES hunter_jobs(id),
  corporationId VARCHAR(64) REFERENCES corporations(id),
  
  -- Person Info
  firstName VARCHAR(255),
  lastName VARCHAR(255),
  fullName VARCHAR(255),
  title VARCHAR(255),
  seniority VARCHAR(100), -- C-Level, VP, Director, Manager
  department VARCHAR(100), -- Sales, Marketing, Operations
  
  -- Contact Info
  email VARCHAR(320),
  emailStatus ENUM('valid', 'invalid', 'risky', 'unknown'),
  emailScore INT, -- 0-100
  phoneNumber VARCHAR(50),
  linkedinUrl VARCHAR(500),
  
  -- Company Context
  companyName VARCHAR(255),
  companyDomain VARCHAR(255),
  
  -- Metadata
  dataSource VARCHAR(100), -- apollo, hunter, linkedin, manual
  confidence INT, -- 0-100
  lastVerified TIMESTAMP,
  
  -- Review
  reviewStatus ENUM('pending', 'approved', 'rejected'),
  reviewedBy VARCHAR(64),
  reviewedAt TIMESTAMP,
  
  createdAt TIMESTAMP
);

-- Erweitere contacts Tabelle
ALTER TABLE contacts ADD COLUMN hunterResultId VARCHAR(64);
ALTER TABLE contacts ADD COLUMN dataSource VARCHAR(100);
ALTER TABLE contacts ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN emailScore INT;
```

### Phase 2: API-Integration

#### 2.1 Apollo.io Integration
```typescript
// server/integrations/apollo.ts
interface ApolloSearchParams {
  organizationDomain: string;
  personTitles?: string[];
  personSeniorities?: string[];
  page?: number;
}

async function searchPeople(params: ApolloSearchParams) {
  // Mock implementation (replace with real API)
  return {
    people: [
      {
        id: "apollo_123",
        first_name: "John",
        last_name: "Doe",
        title: "VP Sales",
        email: "john.doe@company.com",
        email_status: "verified",
        linkedin_url: "https://linkedin.com/in/johndoe",
        organization_name: "Company Inc"
      }
    ],
    pagination: { total: 15, page: 1 }
  };
}
```

#### 2.2 Hunter.io Integration
```typescript
// server/integrations/hunter.ts
async function findEmail(params: {
  domain: string;
  firstName: string;
  lastName: string;
}) {
  // Mock implementation
  return {
    email: "john.doe@company.com",
    score: 95,
    sources: ["linkedin", "company_website"]
  };
}

async function verifyEmail(email: string) {
  // Mock implementation
  return {
    result: "deliverable", // deliverable, undeliverable, risky, unknown
    score: 92,
    smtp_check: true,
    mx_records: true
  };
}
```

#### 2.3 LinkedIn Scraping (Phantombuster Alternative)
```typescript
// Manual LinkedIn URL input for now
// Future: Integrate Phantombuster or Apify
async function enrichFromLinkedIn(linkedinUrl: string) {
  // Extract profile info
  return {
    fullName: "John Doe",
    title: "VP Sales EMEA",
    company: "Company Inc",
    location: "Munich, Germany"
  };
}
```

### Phase 3: Hunter Service

```typescript
// server/services/hunterService.ts
class HunterService {
  async processJob(jobId: string) {
    const job = await getHunterJob(jobId);
    const corporation = await getCorporation(job.corporationId);
    
    // Step 1: Get company domain
    const domain = extractDomain(corporation.website);
    
    // Step 2: Search for people (Apollo)
    const apolloResults = await searchPeople({
      organizationDomain: domain,
      personTitles: job.targetRoles,
      personSeniorities: ["C-Level", "VP", "Director"]
    });
    
    // Step 3: Verify emails (Hunter)
    const verifiedContacts = [];
    for (const person of apolloResults.people) {
      if (!person.email) {
        // Try to find email
        const emailResult = await findEmail({
          domain,
          firstName: person.first_name,
          lastName: person.last_name
        });
        person.email = emailResult.email;
      }
      
      // Verify email
      const verification = await verifyEmail(person.email);
      
      verifiedContacts.push({
        ...person,
        emailStatus: verification.result,
        emailScore: verification.score
      });
    }
    
    // Step 4: Save results
    await saveHunterResults(jobId, verifiedContacts);
    
    // Step 5: Update job status
    await updateHunterJob(jobId, { status: 'completed' });
  }
}
```

### Phase 4: tRPC Router

```typescript
// server/hunterRouter.ts
export const hunterRouter = router({
  // Create job
  createJob: protectedProcedure
    .input(z.object({
      corporationId: z.string(),
      targetRoles: z.array(z.string()),
      targetCount: z.number().default(5)
    }))
    .mutation(async ({ input }) => {
      const jobId = generateId();
      await createHunterJob({
        id: jobId,
        ...input,
        status: 'pending'
      });
      
      // Trigger async processing
      hunterService.processJob(jobId);
      
      return { jobId };
    }),
  
  // List jobs
  listJobs: protectedProcedure.query(async () => {
    return await getAllHunterJobs();
  }),
  
  // Get results
  getResults: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return await getHunterResultsByJob(input.jobId);
    }),
  
  // Review result
  reviewResult: protectedProcedure
    .input(z.object({
      resultId: z.string(),
      action: z.enum(['approve', 'reject'])
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.action === 'approve') {
        // Create contact from hunter result
        const result = await getHunterResult(input.resultId);
        await createContactFromHunterResult(result);
      }
      
      await updateHunterResult(input.resultId, {
        reviewStatus: input.action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: ctx.user.id,
        reviewedAt: new Date()
      });
    })
});
```

### Phase 5: Frontend

#### 5.1 Hunter Dashboard
- Job Queue (Pending, Processing, Completed)
- Statistics (Total Jobs, Found Contacts, Approval Rate)
- Quick Actions (Create Job, View Results)

#### 5.2 Target Companies Page
- Liste aller Corporations aus Scout Agent
- "Find Contacts" Button pro Corporation
- Status-Anzeige (Not Started, In Progress, Completed)

#### 5.3 Gefundene Kontakte Page
- Liste aller Hunter Results
- Filter: Status (Pending/Approved/Rejected), Email Score, Seniority
- Bulk Actions: Approve All, Reject All
- Detail View: LinkedIn Profile, Email Verification Details

#### 5.4 Review Queue Page
- Pending Hunter Results
- Side-by-side: Contact Info + Corporation Context
- Actions: Approve (→ Create Contact), Reject, Skip

## Mock-Daten für Testing

```typescript
// Seed hunter results
const mockHunterResults = [
  {
    corporationId: "saint-gobain-id",
    fullName: "Marie Dubois",
    title: "VP Sales EMEA",
    email: "marie.dubois@saint-gobain.com",
    emailScore: 95,
    seniority: "VP",
    department: "Sales",
    linkedinUrl: "https://linkedin.com/in/mariedubois",
    dataSource: "apollo",
    confidence: 92
  },
  {
    corporationId: "knauf-id",
    fullName: "Hans Müller",
    title: "Head of Market Research",
    email: "hans.mueller@knauf.de",
    emailScore: 88,
    seniority: "Director",
    department: "Marketing",
    linkedinUrl: "https://linkedin.com/in/hansmueller",
    dataSource: "hunter",
    confidence: 85
  }
];
```

## Implementierungs-Reihenfolge

1. ✅ Datenbank-Schema (hunter_jobs, hunter_results)
2. ✅ Mock API-Integrationen (Apollo, Hunter)
3. ✅ Hunter Service (Job Processing)
4. ✅ tRPC Router (CRUD + Review)
5. ✅ Frontend: Hunter Dashboard
6. ✅ Frontend: Target Companies
7. ✅ Frontend: Gefundene Kontakte
8. ✅ Frontend: Review Queue
9. ✅ Seed Mock-Daten
10. ✅ Testing

## Offene Fragen (für später)

- Echte API-Keys für Apollo.io, Hunter.io
- LinkedIn-Scraping-Lösung (Phantombuster/Apify)
- Rate Limiting (max. 100 Kontakte/Tag)
- Kosten-Tracking pro Job
- Automatische Re-Verification (alle 30 Tage)

