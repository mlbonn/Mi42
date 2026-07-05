/**
 * companyEnrichmentAgent.ts
 *
 * Reichert Firmenprofile aus öffentlichen Quellen an.
 * Interface: identisch zu replyClassifierAgent.ts (agentRunner-kompatibel).
 *
 * DSGVO: Nur Firmendaten. Keine automatische Recherche über natürliche Personen.
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "../../db";
import { companies } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Zod-Output-Schema ────────────────────────────────────────────────────────

export const CompanyEnrichmentOutput = z.object({
  companyId: z.string(),
  companyName: z.string(),
  enrichedFields: z.object({
    industry: z.string().nullable(),
    employeeCount: z.number().int().nullable(),
    website: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    branch: z.string().nullable(),
    companySize: z.string().nullable(),
    revenueEur: z.number().nullable(),
  }),
  profileMarkdown: z.string(),
  provenance: z.array(
    z.object({
      field: z.string(),
      source: z.string(),
      fetchedAt: z.string(),
    })
  ),
  skippedFields: z.array(z.string()),
  profilePath: z.string(),
});

export type CompanyEnrichmentOutput = z.infer<typeof CompanyEnrichmentOutput>;

// ── LLM-Client ───────────────────────────────────────────────────────────────

const LLM_URL =
  process.env.CUSTOM_LLM_URL ??
  "https://openrouter.ai/api/v1/chat/completions";
const LLM_TOKEN =
  process.env.OPENROUTER_API_KEY ??
  process.env.CUSTOM_LLM_TOKEN ??
  "";
const LLM_MODEL =
  process.env.CUSTOM_LLM_MODEL ?? "google/gemini-2.5-flash";

async function callLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LLM_TOKEN}`,
      "HTTP-Referer": "https://friday-crm.local",
      "X-Title": "FRIDAY CRM Enrichment",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const raw = await res.text();
  let data: { choices?: Array<{ message?: { content?: string } }> } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`LLM returned non-JSON: ${raw.slice(0, 200)}`);
  }
  if (!data || !data.choices || data.choices.length === 0) {
    throw new Error(`LLM returned no choices: ${raw.slice(0, 200)}`);
  }
  return data.choices[0]?.message?.content ?? "";
}

async function fetchPublicInfo(
  companyName: string,
  website: string | null
): Promise<string> {
  const sources: string[] = [];

  // 1. Website abrufen (mit Redirect-Follow)
  if (website) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FRIDAY-CRM-Enrichment/1.0)" },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 3000);
        sources.push(`=== Website (${url}) ===
${text}`);
      }
    } catch {
      // Nicht erreichbar – überspringen
    }
  }

  // 2. Wikipedia-Suche (zuverlässiger als DuckDuckGo)
  try {
    const wikiQuery = encodeURIComponent(companyName);
    const wikiRes = await fetch(
      `https://de.wikipedia.org/w/api.php?action=query&list=search&srsearch=${wikiQuery}&format=json&srlimit=1`,
      {
        headers: { "User-Agent": "FRIDAY-CRM-Enrichment/1.0" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json() as {
        query?: { search?: Array<{ title: string; snippet: string }> }
      };
      const hits = wikiData?.query?.search ?? [];
      if (hits.length > 0) {
        const title = hits[0].title;
        const snippet = hits[0].snippet.replace(/<[^>]+>/g, "");
        // Vollständigen Wikipedia-Artikel abrufen
        const articleRes = await fetch(
          `https://de.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=true&explaintext=true&format=json`,
          {
            headers: { "User-Agent": "FRIDAY-CRM-Enrichment/1.0" },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (articleRes.ok) {
          const articleData = await articleRes.json() as {
            query?: { pages?: Record<string, { extract?: string }> }
          };
          const pages = articleData?.query?.pages ?? {};
          const extract = Object.values(pages)[0]?.extract ?? snippet;
          sources.push(`=== Wikipedia (${title}) ===
${extract.slice(0, 3000)}`);
        } else {
          sources.push(`=== Wikipedia-Snippet ===
${snippet}`);
        }
      }
    }
  } catch {
    // Wikipedia nicht erreichbar – überspringen
  }

  // 3. DuckDuckGo als Fallback
  if (sources.length === 0) {
    try {
      const query = encodeURIComponent(
        `${companyName} Unternehmen Branche Mitarbeiter Standort`
      );
      const res = await fetch(`https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FRIDAY-CRM/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json() as {
          AbstractText?: string;
          AbstractSource?: string;
          RelatedTopics?: Array<{ Text?: string }>;
        };
        if (data.AbstractText) {
          sources.push(`=== DuckDuckGo Abstract (${data.AbstractSource ?? "unbekannt"}) ===
${data.AbstractText}`);
        }
        const related = (data.RelatedTopics ?? [])
          .slice(0, 3)
          .map((t) => t.Text ?? "")
          .filter(Boolean)
          .join("
");
        if (related) sources.push(`=== DuckDuckGo Related ===
${related}`);
      }
    } catch {
      // DuckDuckGo nicht erreichbar – überspringen
    }
  }

  return sources.length > 0
    ? sources.join("\n")
    : `Keine öffentlichen Quellen gefunden für: ${companyName}`;
}


async function enrichCompany(
  input: EnrichInput
): Promise<CompanyEnrichmentOutput> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, input.entityId))
    .limit(1);

  if (!company) throw new Error(`Company not found: ${input.entityId}`);

  const fetchedAt = new Date().toISOString().split("T")[0];
  const publicInfo = await fetchPublicInfo(company.name, company.website ?? null);

  const systemPrompt = `Du bist ein Unternehmensrecherche-Assistent für ein B2B-CRM.
Analysiere die bereitgestellten öffentlichen Informationen über eine Firma und extrahiere strukturierte Daten.

WICHTIGE REGELN:
1. Nur Firmendaten – KEINE personenbezogenen Profile über Einzelpersonen.
2. Nur belegbare Angaben aus den bereitgestellten Quellen. Wenn eine Information nicht belegbar ist, setze null.
3. Keine erfundenen Werte, kein Score.
4. Für jedes extrahierte Feld: Quelle angeben.
5. employeeCount: nur als Zahl (z.B. 250), nicht als Bereich.
6. country: ISO-2-Code (z.B. "DE", "AT", "CH").
7. industry: Branchenbezeichnung auf Deutsch (z.B. "Holzwerkstoffhersteller", "Maschinenbau", "Softwareentwicklung").
   Wenn die Branche aus dem Firmennamen, der Website oder den Quellen klar erkennbar ist, trage sie ein.

Antworte ausschließlich als JSON:
{
  "industry": string | null,
  "employeeCount": number | null,
  "website": string | null,
  "city": string | null,
  "country": string | null,
  "branch": string | null,
  "companySize": string | null,
  "revenueEur": number | null,
  "marketPosition": string | null,
  "locations": string | null,
  "recentDevelopments": string | null,
  "targetMarkets": string | null,
  "provenance": [{"field": string, "source": string}]
}`;

  const userPrompt = `Firma: ${company.name}
Bestehende Daten (nicht überschreiben wenn gesetzt):
- industry: ${company.industry ?? "(leer)"}
- employeeCount: ${company.employeeCount ?? "(leer)"}
- website: ${company.website ?? "(leer)"}
- city: ${company.city ?? "(leer)"}
- country: ${company.country ?? "(leer)"}

Öffentliche Quellen:
${publicInfo}`;

  let llmResult: {
    industry?: string | null;
    employeeCount?: number | null;
    website?: string | null;
    city?: string | null;
    country?: string | null;
    branch?: string | null;
    companySize?: string | null;
    revenueEur?: number | null;
    marketPosition?: string | null;
    locations?: string | null;
    recentDevelopments?: string | null;
    targetMarkets?: string | null;
    provenance?: { field: string; source: string }[];
  } = {};

  try {
    const raw = await callLLM(systemPrompt, userPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) llmResult = JSON.parse(jsonMatch[0]) as typeof llmResult;
  } catch (e) {
    console.error("[companyEnrichmentAgent] LLM parse error:", e);
  }

  const enrichedFields: CompanyEnrichmentOutput["enrichedFields"] = {
    industry: null,
    employeeCount: null,
    website: null,
    city: null,
    country: null,
    branch: null,
    companySize: null,
    revenueEur: null,
  };
  const skippedFields: string[] = [];
  const provenance: CompanyEnrichmentOutput["provenance"] = [];

  const fieldMap: Array<{
    field: keyof typeof enrichedFields;
    existing: unknown;
    llmValue: unknown;
  }> = [
    { field: "industry", existing: company.industry, llmValue: llmResult.industry },
    { field: "employeeCount", existing: company.employeeCount, llmValue: llmResult.employeeCount },
    { field: "website", existing: company.website, llmValue: llmResult.website },
    { field: "city", existing: company.city, llmValue: llmResult.city },
    { field: "country", existing: company.country, llmValue: llmResult.country },
    { field: "branch", existing: company.branch, llmValue: llmResult.branch },
    { field: "companySize", existing: company.companySize, llmValue: llmResult.companySize },
    { field: "revenueEur", existing: company.revenueEur, llmValue: llmResult.revenueEur },
  ];

  for (const { field, existing, llmValue } of fieldMap) {
    if (existing !== null && existing !== undefined && existing !== "") {
      skippedFields.push(field);
      (enrichedFields as Record<string, unknown>)[field] = existing;
    } else if (llmValue !== null && llmValue !== undefined) {
      (enrichedFields as Record<string, unknown>)[field] = llmValue;
      const src =
        llmResult.provenance?.find((p) => p.field === field)?.source ??
        "Öffentliche Quellen";
      provenance.push({ field, source: src, fetchedAt });
    }
  }

  const profileDir = ensureProfileDir(company.id);
  const profilePath = path.join(profileDir, "profile.md");

  const provenanceBlock = provenance
    .map((p) => `| ${p.field} | ${p.source} | ${p.fetchedAt} |`)
    .join("\n");

  const profileMarkdown = `# Firmenprofil: ${company.name}

**Generiert:** ${new Date().toISOString()}
**Agent:** company_enrichment v1.0

---

## Strukturierte Daten

| Feld | Wert |
|---|---|
| Branche | ${enrichedFields.industry ?? "–"} |
| Mitarbeiter | ${enrichedFields.employeeCount ?? "–"} |
| Website | ${enrichedFields.website ?? "–"} |
| Stadt | ${enrichedFields.city ?? "–"} |
| Land | ${enrichedFields.country ?? "–"} |
| Segment | ${enrichedFields.branch ?? "–"} |
| Unternehmensgröße | ${enrichedFields.companySize ?? "–"} |
| Umsatz (EUR) | ${enrichedFields.revenueEur != null ? String(enrichedFields.revenueEur) : "–"} |

---

## Marktposition

${llmResult.marketPosition ?? "_Keine belastbaren Informationen gefunden._"}

---

## Standorte

${llmResult.locations ?? "_Keine belastbaren Informationen gefunden._"}

---

## Jüngste Entwicklungen

${llmResult.recentDevelopments ?? "_Keine belastbaren Informationen gefunden._"}

---

## Relevante Zielmärkte (Bau/Renovierung)

${llmResult.targetMarkets ?? "_Keine belastbaren Informationen gefunden._"}

---

## Provenienz

| Feld | Quelle | Abgerufen |
|---|---|---|
${provenanceBlock || "_(keine angereicherten Felder)_"}

---

## Übersprungene Felder (manuell gesetzt, nicht überschrieben)

${skippedFields.length > 0 ? skippedFields.map((f) => `- ${f}`).join("\n") : "_(keine)_"}

---

*DSGVO-Hinweis: Dieses Profil enthält ausschließlich firmenbezogene Daten aus öffentlichen Quellen. Keine personenbezogenen Daten.*
`;

  fs.writeFileSync(profilePath, profileMarkdown, "utf-8");

  return {
    companyId: company.id,
    companyName: company.name,
    enrichedFields,
    profileMarkdown,
    provenance,
    skippedFields,
    profilePath,
  };
}

// ── Agent-Definition (agentRunner-kompatibles Interface) ─────────────────────

export const companyEnrichmentAgent = {
  name: "company_enrichment",
  version: "1.0.0",
  jobType: "company_enrichment" as const,
  promptVersion: "company-enrichment.v1",
  outputSchema: CompanyEnrichmentOutput,

  async buildInput(payload: unknown): Promise<EnrichInput> {
    const p = payload as Record<string, unknown> | null | undefined;
    if (!p || typeof p.entityId !== "string") {
      throw new Error(
        "company_enrichment: payload must contain entityId (string)"
      );
    }
    return {
      entityId: p.entityId,
      companyName: typeof p.companyName === "string" ? p.companyName : undefined,
    };
  },

  async run({
    input,
  }: {
    jobId: string;
    runId: string;
    input: unknown;
  }): Promise<CompanyEnrichmentOutput> {
    return enrichCompany(input as EnrichInput);
  },

  async apply({
    output,
  }: {
    runId: string;
    output: CompanyEnrichmentOutput;
    jobId: string;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [current] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, output.companyId))
      .limit(1);

    if (!current) return;

    const { enrichedFields } = output;
    console.log(`[companyEnrichmentAgent] enrichedFields:`, JSON.stringify(enrichedFields));
    const updateData: Partial<typeof companies.$inferInsert> = {};

    if (!current.industry && enrichedFields.industry)
      updateData.industry = enrichedFields.industry;
    if (!current.employeeCount && enrichedFields.employeeCount)
      updateData.employeeCount = enrichedFields.employeeCount;
    if (!current.website && enrichedFields.website)
      updateData.website = enrichedFields.website;
    if (!current.city && enrichedFields.city)
      updateData.city = enrichedFields.city;
    if (!current.country && enrichedFields.country)
      updateData.country = enrichedFields.country;
    if (!current.branch && enrichedFields.branch)
      updateData.branch = enrichedFields.branch;
    if (!current.companySize && enrichedFields.companySize)
      updateData.companySize = enrichedFields.companySize;
    if (!current.revenueEur && enrichedFields.revenueEur)
      updateData.revenueEur = enrichedFields.revenueEur;

    // profilePath + enrichedAt (neue Spalten aus Migration)
    const anyUpdateData = updateData as Record<string, unknown>;
    anyUpdateData.profilePath = output.profilePath;
    anyUpdateData.enrichedAt = new Date();

    if (Object.keys(updateData).length > 0) {
      await db
        .update(companies)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(companies.id, output.companyId));
    }

    console.log(
      `[companyEnrichmentAgent] ${output.companyName}: ${Object.keys(updateData).length - 2} Felder aktualisiert, ${output.skippedFields.length} übersprungen. Profil: ${output.profilePath}`
    );
  },
};
