/**
 * FRIDAY CRM - Discovery Methods LLM Service
 * Nutzt LLM für intelligente Keyword-Generierung und Analyse
 */

import { invokeLLMWithDbKeys } from "./_core/llm";

// ============================================================================
// KEYWORD GENERATION
// ============================================================================

export interface KeywordGenerationParams {
  companyName: string;
  industry?: string;
  products?: string[];
  competitors?: string[];
  language?: string;
}

export interface GeneratedKeywords {
  searchKeywords: string[];
  industryTerms: string[];
  productKeywords: string[];
  competitorPatterns: string[];
  newsKeywords: string[];
}

export async function generateDiscoveryKeywords(
  params: KeywordGenerationParams
): Promise<GeneratedKeywords> {
  const { companyName, industry, products, competitors, language = "de" } = params;

  const prompt = `Du bist ein Experte für B2B-Marktanalyse und Wettbewerbsrecherche.

Analysiere das folgende Unternehmen und generiere relevante Suchbegriffe für die Wettbewerbersuche:

**Unternehmen:** ${companyName}
${industry ? `**Branche:** ${industry}` : ""}
${products?.length ? `**Produkte:** ${products.join(", ")}` : ""}
${competitors?.length ? `**Bekannte Wettbewerber:** ${competitors.join(", ")}` : ""}

Generiere Suchbegriffe in ${language === "de" ? "Deutsch" : "Englisch"} für:

1. **Allgemeine Suchbegriffe** - Keywords für Google/LinkedIn Suche nach ähnlichen Unternehmen
2. **Branchenbegriffe** - Fachbegriffe und Industriebezeichnungen
3. **Produktbegriffe** - Spezifische Produktkategorien und -namen
4. **Wettbewerbermuster** - Typische Firmennamen-Muster in dieser Branche
5. **News-Keywords** - Begriffe für Presseüberwachung (Expansion, Übernahmen, neue Produkte)

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "searchKeywords": ["keyword1", "keyword2", ...],
  "industryTerms": ["term1", "term2", ...],
  "productKeywords": ["product1", "product2", ...],
  "competitorPatterns": ["pattern1", "pattern2", ...],
  "newsKeywords": ["news1", "news2", ...]
}`;

  try {
    const result = await invokeLLMWithDbKeys({
      messages: [
        {
          role: "system",
          content: "Du bist ein B2B-Marktanalyse-Experte. Antworte immer nur mit validem JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      outputSchema: {
        name: "discovery_keywords",
        schema: {
          type: "object",
          properties: {
            searchKeywords: { type: "array", items: { type: "string" } },
            industryTerms: { type: "array", items: { type: "string" } },
            productKeywords: { type: "array", items: { type: "string" } },
            competitorPatterns: { type: "array", items: { type: "string" } },
            newsKeywords: { type: "array", items: { type: "string" } },
          },
          required: ["searchKeywords", "industryTerms", "productKeywords", "competitorPatterns", "newsKeywords"],
          additionalProperties: false,
        },
        strict: true,
      },
    });

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    return JSON.parse(content) as GeneratedKeywords;
  } catch (error) {
    console.error("[Discovery LLM] Error generating keywords:", error);
    // Return empty defaults on error
    return {
      searchKeywords: [],
      industryTerms: [],
      productKeywords: [],
      competitorPatterns: [],
      newsKeywords: [],
    };
  }
}

// ============================================================================
// COMPANY SIMILARITY ANALYSIS
// ============================================================================

export interface CompanySimilarityParams {
  sourceCompany: {
    name: string;
    description?: string;
    products?: string[];
    industry?: string;
  };
  targetCompany: {
    name: string;
    description?: string;
    products?: string[];
    industry?: string;
  };
}

export interface SimilarityResult {
  overallScore: number; // 0-100
  productOverlap: number; // 0-100
  industryMatch: boolean;
  competitorLikelihood: "high" | "medium" | "low";
  reasoning: string;
  suggestedTags: string[];
}

export async function analyzeCompanySimilarity(
  params: CompanySimilarityParams
): Promise<SimilarityResult> {
  const { sourceCompany, targetCompany } = params;

  const prompt = `Analysiere die Ähnlichkeit zwischen zwei Unternehmen für Wettbewerbsanalyse:

**Quellunternehmen:**
- Name: ${sourceCompany.name}
${sourceCompany.description ? `- Beschreibung: ${sourceCompany.description}` : ""}
${sourceCompany.products?.length ? `- Produkte: ${sourceCompany.products.join(", ")}` : ""}
${sourceCompany.industry ? `- Branche: ${sourceCompany.industry}` : ""}

**Zielunternehmen:**
- Name: ${targetCompany.name}
${targetCompany.description ? `- Beschreibung: ${targetCompany.description}` : ""}
${targetCompany.products?.length ? `- Produkte: ${targetCompany.products.join(", ")}` : ""}
${targetCompany.industry ? `- Branche: ${targetCompany.industry}` : ""}

Bewerte:
1. Gesamtähnlichkeit (0-100)
2. Produktüberschneidung (0-100)
3. Branchenübereinstimmung (true/false)
4. Wettbewerber-Wahrscheinlichkeit (high/medium/low)
5. Kurze Begründung
6. Vorgeschlagene Tags für das Zielunternehmen`;

  try {
    const result = await invokeLLMWithDbKeys({
      messages: [
        {
          role: "system",
          content: "Du bist ein Experte für Wettbewerbsanalyse. Antworte nur mit validem JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      outputSchema: {
        name: "similarity_analysis",
        schema: {
          type: "object",
          properties: {
            overallScore: { type: "number" },
            productOverlap: { type: "number" },
            industryMatch: { type: "boolean" },
            competitorLikelihood: { type: "string", enum: ["high", "medium", "low"] },
            reasoning: { type: "string" },
            suggestedTags: { type: "array", items: { type: "string" } },
          },
          required: ["overallScore", "productOverlap", "industryMatch", "competitorLikelihood", "reasoning", "suggestedTags"],
          additionalProperties: false,
        },
        strict: true,
      },
    });

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    return JSON.parse(content) as SimilarityResult;
  } catch (error) {
    console.error("[Discovery LLM] Error analyzing similarity:", error);
    return {
      overallScore: 0,
      productOverlap: 0,
      industryMatch: false,
      competitorLikelihood: "low",
      reasoning: "Analyse konnte nicht durchgeführt werden",
      suggestedTags: [],
    };
  }
}

// ============================================================================
// ASSOCIATION ANALYSIS
// ============================================================================

export interface AssociationSuggestion {
  name: string;
  url?: string;
  relevance: "high" | "medium" | "low";
  reason: string;
}

export async function suggestIndustryAssociations(
  industry: string,
  country: string = "Deutschland"
): Promise<AssociationSuggestion[]> {
  const prompt = `Für die Branche "${industry}" in ${country}, schlage relevante Branchenverbände und Fachorganisationen vor, die für die Wettbewerbersuche nützlich sein könnten.

Berücksichtige:
- Hauptverbände der Branche
- Regionale Verbände
- Europäische/internationale Verbände
- Fachgruppen und Interessengemeinschaften

Gib für jeden Verband an:
- Name
- Website (falls bekannt)
- Relevanz (high/medium/low)
- Warum dieser Verband nützlich ist`;

  try {
    const result = await invokeLLMWithDbKeys({
      messages: [
        {
          role: "system",
          content: "Du bist ein Experte für deutsche und europäische Branchenverbände. Antworte nur mit validem JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      outputSchema: {
        name: "association_suggestions",
        schema: {
          type: "object",
          properties: {
            associations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  url: { type: "string" },
                  relevance: { type: "string", enum: ["high", "medium", "low"] },
                  reason: { type: "string" },
                },
                required: ["name", "url", "relevance", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["associations"],
          additionalProperties: false,
        },
        strict: true,
      },
    });

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    const parsed = JSON.parse(content);
    return parsed.associations as AssociationSuggestion[];
  } catch (error) {
    console.error("[Discovery LLM] Error suggesting associations:", error);
    return [];
  }
}

// ============================================================================
// NEWS ANALYSIS
// ============================================================================

export interface NewsAnalysisResult {
  isRelevant: boolean;
  relevanceScore: number; // 0-100
  eventType: "expansion" | "acquisition" | "product_launch" | "partnership" | "other" | "not_relevant";
  summary: string;
  mentionedCompanies: string[];
  actionRequired: boolean;
}

export async function analyzeNewsArticle(
  headline: string,
  content: string,
  targetIndustry: string
): Promise<NewsAnalysisResult> {
  const prompt = `Analysiere diesen Nachrichtenartikel für Wettbewerbsintelligenz in der Branche "${targetIndustry}":

**Überschrift:** ${headline}

**Inhalt:** ${content.substring(0, 2000)}

Bewerte:
1. Ist der Artikel relevant für die Wettbewerbsanalyse?
2. Relevanz-Score (0-100)
3. Art des Ereignisses (expansion, acquisition, product_launch, partnership, other, not_relevant)
4. Kurze Zusammenfassung
5. Erwähnte Unternehmen
6. Ist eine Aktion erforderlich (z.B. neuer Wettbewerber gefunden)?`;

  try {
    const result = await invokeLLMWithDbKeys({
      messages: [
        {
          role: "system",
          content: "Du bist ein Analyst für Wettbewerbsintelligenz. Antworte nur mit validem JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      outputSchema: {
        name: "news_analysis",
        schema: {
          type: "object",
          properties: {
            isRelevant: { type: "boolean" },
            relevanceScore: { type: "number" },
            eventType: { type: "string", enum: ["expansion", "acquisition", "product_launch", "partnership", "other", "not_relevant"] },
            summary: { type: "string" },
            mentionedCompanies: { type: "array", items: { type: "string" } },
            actionRequired: { type: "boolean" },
          },
          required: ["isRelevant", "relevanceScore", "eventType", "summary", "mentionedCompanies", "actionRequired"],
          additionalProperties: false,
        },
        strict: true,
      },
    });

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    return JSON.parse(content) as NewsAnalysisResult;
  } catch (error) {
    console.error("[Discovery LLM] Error analyzing news:", error);
    return {
      isRelevant: false,
      relevanceScore: 0,
      eventType: "not_relevant",
      summary: "Analyse konnte nicht durchgeführt werden",
      mentionedCompanies: [],
      actionRequired: false,
    };
  }
}
