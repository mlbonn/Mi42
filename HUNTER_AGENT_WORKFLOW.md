# Hunter Agent - Enrichment Workflow Documentation

## Overview

The Hunter Agent automatically finds and validates contact information for approved corporations using a combination of GPT-4 and Apollo.io Enrichment API.

**Key Innovation:** Instead of searching for contacts (which requires expensive API plans), we **generate likely email patterns** using AI and then **validate/enrich** them using Apollo's Basic plan.

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Scout Agent Approves Corporation                             │
│    → Creates Hunter Job (status: pending)                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Hunter Worker Daemon (polling every 30s)                     │
│    → Picks up pending job                                       │
│    → Loads Hunter Settings (titles, seniorities, count)         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. GPT-4 Email Pattern Generator                                │
│    Input:                                                        │
│    - Company name, domain, industry                             │
│    - Target titles (CEO, VP Sales, Market Intelligence, etc.)   │
│    - Target seniorities (c_suite, vp, director, manager)        │
│    - Count (default: 10)                                        │
│                                                                  │
│    Output:                                                       │
│    - 10 realistic email patterns                                │
│    - firstname.lastname@domain.com                              │
│    - Pattern confidence: 60-90%                                  │
│    - Reasoning for each pattern                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Apollo Enrichment API (Batch Processing)                     │
│    Input:                                                        │
│    - Email OR (firstName + lastName + domain)                   │
│                                                                  │
│    Output (per contact):                                         │
│    - Email validation status (verified/guessed/unavailable)     │
│    - LinkedIn URL                                                │
│    - Phone numbers                                               │
│    - Job title                                                   │
│    - Seniority level                                             │
│    - Departments                                                 │
│    - Enrichment confidence: 50-100%                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Confidence Scoring & Filtering                               │
│    Formula:                                                      │
│    - Base: (Pattern × 30%) + (Enrichment × 70%)                 │
│    - Bonus: +10% verified email, +5% LinkedIn, +5% phone        │
│                                                                  │
│    Filter:                                                       │
│    - Only store contacts with ≥50% confidence                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Store Results                                                │
│    → hunter_results table                                       │
│    → reviewStatus: "pending"                                    │
│    → dataSource: "apollo_enrichment"                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Hunter Review Queue                                          │
│    → User reviews contacts                                      │
│    → Approve → Create Contact in CRM                            │
│    → Reject → Mark as rejected                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Email Pattern Generator (`server/services/emailPatternGenerator.ts`)

**Purpose:** Generate realistic email addresses for target personas using GPT-4.

**Key Features:**
- Uses GPT-4 with JSON Schema for structured output
- Considers company location (EU vs US names)
- Matches titles to seniorities
- Provides confidence scores and reasoning
- Fallback to basic patterns if GPT-4 fails

**Example Output:**
```json
{
  "email": "john.smith@siemens.com",
  "firstName": "John",
  "lastName": "Smith",
  "title": "VP Sales",
  "confidence": 85,
  "reasoning": "Common firstname.lastname pattern, VP Sales is typical role"
}
```

### 2. Apollo Enrichment API (`server/integrations/apolloEnrichment.ts`)

**Purpose:** Validate and enrich email addresses using Apollo.io.

**API Endpoint:** `POST /v1/people/match`

**Input Options:**
- Email only: `{ email: "john.smith@siemens.com" }`
- Name + Domain: `{ first_name: "John", last_name: "Smith", domain: "siemens.com" }`

**Response:**
- Person data (if found)
- Email status (verified/guessed/unavailable)
- LinkedIn, phone, title, seniority
- Organization details

**Rate Limiting:**
- 200ms delay between requests
- Batch processing for efficiency

### 3. Hunter Service (`server/services/hunterService.ts`)

**Main Function:** `processHunterJob(jobId)`

**Steps:**
1. Load job and corporation from database
2. Extract domain from website
3. Load Hunter Settings (titles, seniorities, count)
4. Generate email patterns with GPT-4
5. Enrich patterns with Apollo API
6. Calculate confidence scores
7. Filter contacts (≥50% confidence)
8. Store results in database
9. Update job status

**Error Handling:**
- Catches all errors and marks job as "failed"
- Logs detailed error messages
- Stores error in job record

### 4. Hunter Worker Daemon (`server/hunterWorkerDaemon.ts`)

**Purpose:** Background process that polls for pending jobs.

**Configuration:**
- Poll interval: 30 seconds
- Batch size: 10 jobs per cycle
- Graceful shutdown on SIGINT/SIGTERM

**Deployment:**
```bash
# On Hetzner
pm2 start dist/hunterWorkerDaemon.js --name hunter-worker
pm2 logs hunter-worker
```

---

## Configuration

### Hunter Settings (Database: `hunter_settings`)

**Default Values:**
```json
{
  "personTitles": [],  // Empty = all titles (broader search)
  "personSeniorities": ["c_suite", "vp", "director", "manager"],
  "departments": [],  // Empty = all departments
  "targetCount": 10
}
```

**UI Location:** Settings → Hunter Agent tab

**Recommended Settings:**
- **For Market Intelligence:** Add specific titles like "Market Intelligence Manager", "Market Research Manager"
- **For C-Suite:** Use only `["c_suite", "vp"]` seniorities
- **For Broad Search:** Leave titles and departments empty

### Environment Variables

**Required:**
```bash
APOLLO_API_KEY=your_apollo_enrichment_api_key
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=mysql://user:password@host:3306/database
```

**Optional:**
```bash
HUNTER_API_KEY=your_hunter_io_api_key  # For email verification (not used yet)
```

---

## API Comparison: People Search vs Enrichment

### People Search API (OLD - Doesn't work with Basic plan)

**Endpoint:** `POST /v1/people/search`

**Input:**
```json
{
  "q_organization_domains": ["siemens.com"],
  "person_seniorities": ["c_suite", "vp"],
  "per_page": 10
}
```

**Problem:** Returns 0 results for all companies (requires higher plan)

### Enrichment API (NEW - Works with Basic plan)

**Endpoint:** `POST /v1/people/match`

**Input:**
```json
{
  "email": "john.smith@siemens.com"
}
```

**Advantage:** Validates and enriches known/guessed emails (works with Basic plan)

---

## Test Results

### Test Companies (test-hunter-enrichment.ts)

**Siemens AG (EU):**
- ✅ 5/5 contacts enriched successfully
- Found real CEO: Roland Busch
- Confidence: 72-76%

**Carrier Global (US):**
- ✅ 5/5 contacts enriched successfully
- Confidence: 72-76%

**Kingspan Group (EU):**
- ✅ 5/5 contacts enriched successfully
- Found real CEO: Gene Murtagh
- Confidence: 72-76%

**Success Rate:** 100% (15/15 contacts enriched)

---

## Deployment Guide

### 1. Local Testing

```bash
# Test email pattern generation + enrichment
pnpm tsx test-hunter-enrichment.ts

# Expected output:
# - 5 patterns generated per company
# - 5/5 enriched successfully
# - Confidence scores 70-80%
```

### 2. Deploy to Hetzner

```bash
# On Hetzner server
cd /root/friday-crm
bash deploy-hetzner.sh

# Script will:
# 1. Pull latest code from GitHub
# 2. Install dependencies
# 3. Build project
# 4. Restart all services (main + scout + hunter workers)
```

### 3. Verify Deployment

```bash
# Check worker status
pm2 status

# Expected output:
# friday-crm   │ online │ 0
# scout-worker │ online │ 0
# hunter-worker│ online │ 0

# Check Hunter Worker logs
pm2 logs hunter-worker --lines 50

# Expected output:
# [Hunter Worker] Polling Hunter Queue...
# [Hunter Worker] Processing 0 pending jobs
```

### 4. Test with Real Corporation

**Option A: Via UI**
1. Go to Scout Review Queue
2. Approve a corporation
3. Check Hunter Dashboard → New job should appear
4. Wait 30s for worker to process
5. Check Hunter Review Queue → Contacts should appear

**Option B: Via Database**
```sql
-- Check pending jobs
SELECT id, corporationId, status, createdAt 
FROM hunter_jobs 
WHERE status = 'pending' 
ORDER BY createdAt DESC 
LIMIT 10;

-- Check results
SELECT fullName, email, title, confidence, reviewStatus
FROM hunter_results
WHERE jobId = 'your-job-id'
ORDER BY confidence DESC;
```

---

## Troubleshooting

### Problem: Worker not processing jobs

**Check 1: Worker running?**
```bash
pm2 status hunter-worker
# If stopped: pm2 restart hunter-worker
```

**Check 2: Database connection?**
```bash
pm2 logs hunter-worker | grep "Database"
# Should see: "Database: localhost:3306/friday_crm"
```

**Check 3: API keys configured?**
```bash
pm2 logs hunter-worker | grep "Configuration"
# Should see: "Apollo API configured: true"
# Should see: "OpenAI API configured: true"
```

### Problem: 0 contacts found

**Check 1: GPT-4 generating patterns?**
```bash
pm2 logs hunter-worker | grep "Generated"
# Should see: "Generated 10 patterns"
```

**Check 2: Apollo API responding?**
```bash
pm2 logs hunter-worker | grep "Enrichment"
# Should see: "Enriched 5/10 contacts" (or similar)
```

**Check 3: Confidence threshold too high?**
```bash
pm2 logs hunter-worker | grep "low confidence"
# If many contacts skipped, lower threshold in code
```

### Problem: Apollo API errors

**Error: "Invalid API key"**
- Check `.env` file has correct `APOLLO_API_KEY`
- Verify key works: `curl -H "X-Api-Key: YOUR_KEY" https://api.apollo.io/v1/auth/health`

**Error: "Rate limit exceeded"**
- Increase delay between requests in `apolloEnrichment.ts` (line 95)
- Current: 200ms → Try: 500ms

**Error: "No match found"**
- Normal! Not all generated emails exist
- Check success rate: Should be 30-50%

### Problem: GPT-4 errors

**Error: "No response from GPT-4"**
- Check `OPENAI_API_KEY` in `.env`
- Verify API quota: https://platform.openai.com/usage

**Error: "JSON parse error"**
- GPT-4 returned invalid JSON
- Fallback patterns will be used automatically
- Check logs for raw response

---

## Performance Metrics

### Expected Performance (per job)

- **Email Pattern Generation:** 5-10 seconds (GPT-4)
- **Apollo Enrichment (10 contacts):** 5-10 seconds (2s + 200ms × 10)
- **Total Processing Time:** 10-20 seconds per job
- **Success Rate:** 30-50% of patterns enriched
- **High-Confidence Contacts:** 3-5 per job (≥50% confidence)

### Scaling Considerations

**Current Limits:**
- 1 job processed at a time (sequential)
- 10 jobs per polling cycle (30s)
- ~30 jobs per minute (max)

**To Scale:**
- Increase batch size in `hunterWorkerDaemon.ts`
- Run multiple worker instances
- Implement job queue (Redis/BullMQ)

---

## Future Enhancements

### 1. LinkedIn Sales Navigator Integration
- Direct contact search (when API access granted)
- Better EU data coverage
- Higher confidence scores

### 2. Multi-Source Enrichment
- Combine Apollo + Hunter.io + Clearbit
- Cross-validate emails across sources
- Increase confidence scores

### 3. Email Verification
- Use Hunter.io Email Verifier
- Reduce bounce rates
- Improve deliverability

### 4. Smart Pattern Learning
- Learn from approved contacts
- Improve pattern generation over time
- Company-specific patterns

### 5. Bulk Processing
- Process multiple corporations in parallel
- Batch API calls for efficiency
- Reduce total processing time

---

## Support

**Issues?** Check:
1. PM2 logs: `pm2 logs hunter-worker`
2. Database: `SELECT * FROM hunter_jobs WHERE status = 'failed'`
3. Test script: `pnpm tsx test-hunter-enrichment.ts`

**Questions?** Contact development team or check:
- Apollo API Docs: https://apolloio.github.io/apollo-api-docs/
- OpenAI API Docs: https://platform.openai.com/docs/api-reference

