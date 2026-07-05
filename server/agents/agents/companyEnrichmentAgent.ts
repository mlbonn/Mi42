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
  "https://maxproxy.bl2020.com/api/chat/completions";
const LLM_TOKEN =
  process.env.CUSTOM_LLM_TOKEN ?? "sk-bd621b0666474be1b054b3c5360b3cef";
const LLM_MODEL = process.env.CUSTOM_LLM_MODEL ?? "gpt-oss:120b";

async function callLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_TOKEN}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`LLM error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "";
}

// ── Web-Abruf ────────────────────────────────────────────────────────────────

async function fetchPublicInfo(
  companyName: string,
  website: string | null
): Promise<string> {
  const sources: string[] = [];

  if (website) {
    try {
      const url = website.startsWith("http") ? website : `https://${website}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "FRIDAY-CRM-Enrichment/1.0 (company research bot)",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const html = await res.text();
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
        sources.push(`=== Website (${url}) ===\n${text}`);
      }
    } catch {
      // Nicht erreichbar – überspringen
    }
  }

  try {
    const query = encodeURIComponent(
      `${companyName} Unternehmen Profil Branche Mitarbeiter`
    );
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FRIDAY-CRM/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      const matches = Array.from(
        html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)
      );
      const snippets = matches
        .slice(0, 5)
        .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
        .join("\n");
      if (snippets)
        sources.push(
          `=== DuckDuckGo-Suche (${companyName}) ===\n${snippets}`
        );
    }
  } catch {
    // Überspringen
  }

  return (
    sources.join("\n\n") ||
    `Keine öffentlichen Quellen für "${companyName}" gefunden.`
  );
}

// ── Profil-Verzeichnis ───────────────────────────────────────────────────────

const PROFILES_BASE =
  process.env.COMPANY_PROFILES_PATH ??
  "/home/manus02/friday-crm/company_profiles";

function ensureProfileDir(companyId: string): string {
  const dir = path.join(PROFILES_BASE, companyId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Kern-Logik (wiederverwendet von run und apply) ───────────────────────────

interface EnrichInput {
  entityId: string;
  companyName?: string;
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
2. Nur belegbare Angaben. Wenn eine Information nicht in den Quellen steht, setze null.
3. Keine erfundenen Werte, kein Score.
4. Für jedes extrahierte Feld: Quelle angeben.
5. employeeCount: nur als Zahl (z.B. 250), nicht als Bereich.
6. country: ISO-2-Code (z.B. "DE", "AT", "CH").

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
