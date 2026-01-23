/**
 * Email Pattern Generator using GPT-4
 * Generates likely email addresses for target personas at a company
 */

import { invokeLLM } from "../_core/llm";

export interface EmailPattern {
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface EmailPatternRequest {
  companyName: string;
  domain: string;
  industry?: string;
  targetTitles: string[];
  targetSeniorities: string[];
  count?: number;
}

/**
 * Generate email patterns for target personas using GPT-4
 */
export async function generateEmailPatterns(request: EmailPatternRequest): Promise<EmailPattern[]> {
  const count = request.count || 10;

  const systemPrompt = `You are an expert at B2B lead generation and email pattern analysis.
Your task is to generate realistic email addresses for target personas at a company.

Rules:
1. Use common email patterns: firstname.lastname@domain, f.lastname@domain, firstname@domain
2. Generate realistic names appropriate for the industry and region
3. Match titles to the requested seniorities (C-Suite, VP, Director, Manager)
4. Consider the company's location (EU companies often use local names)
5. Provide confidence scores based on pattern likelihood
6. Return ONLY valid JSON, no markdown formatting`;

  const userPrompt = `Generate ${count} likely email addresses for the following company:

Company: ${request.companyName}
Domain: ${request.domain}
Industry: ${request.industry || "Unknown"}

Target Positions:
${request.targetTitles.join(", ")}

Target Seniorities:
${request.targetSeniorities.join(", ")}

For each email, provide:
- email: The full email address
- firstName: First name
- lastName: Last name  
- title: Job title (must match one of the target positions)
- confidence: Confidence score 0-100 (based on pattern likelihood)
- reasoning: Brief explanation of why this pattern is likely

Return as JSON array with this exact structure:
[
  {
    "email": "john.smith@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "title": "VP Sales",
    "confidence": 85,
    "reasoning": "Common firstname.lastname pattern, VP Sales is typical role"
  }
]`;

  try {
    console.log(`[EmailPatternGenerator] Generating ${count} patterns for ${request.companyName}`);

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "email_patterns",
          strict: true,
          schema: {
            type: "object",
            properties: {
              patterns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    email: { type: "string", description: "Full email address" },
                    firstName: { type: "string", description: "First name" },
                    lastName: { type: "string", description: "Last name" },
                    title: { type: "string", description: "Job title" },
                    confidence: { type: "number", description: "Confidence score 0-100" },
                    reasoning: { type: "string", description: "Why this pattern is likely" }
                  },
                  required: ["email", "firstName", "lastName", "title", "confidence", "reasoning"],
                  additionalProperties: false
                }
              }
            },
            required: ["patterns"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4");
    }

    // Content can be string or array, we need string
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);
    const patterns: EmailPattern[] = parsed.patterns || [];

    console.log(`[EmailPatternGenerator] Generated ${patterns.length} patterns`);
    
    // Sort by confidence (highest first)
    patterns.sort((a, b) => b.confidence - a.confidence);

    return patterns;

  } catch (error) {
    console.error("[EmailPatternGenerator] Error:", error);
    
    // Fallback: Generate basic patterns
    return generateFallbackPatterns(request);
  }
}

/**
 * Fallback pattern generator (if GPT-4 fails)
 */
function generateFallbackPatterns(request: EmailPatternRequest): EmailPattern[] {
  const count = request.count || 10;
  const patterns: EmailPattern[] = [];

  // Common first names (mix of US/EU)
  const firstNames = ["John", "Sarah", "Michael", "Anna", "David", "Maria", "Robert", "Emma", "Thomas", "Lisa"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson"];

  // Map seniorities to titles
  const titlesBySeniority: Record<string, string[]> = {
    c_suite: ["CEO", "CTO", "CFO", "COO", "CMO"],
    vp: ["VP Sales", "VP Marketing", "VP Operations", "VP Strategy"],
    director: ["Director Sales", "Director Marketing", "Director Strategy"],
    manager: ["Sales Manager", "Marketing Manager", "Product Manager"]
  };

  for (let i = 0; i < count && i < firstNames.length; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    
    // Pick a title from requested seniorities
    const seniority = request.targetSeniorities[i % request.targetSeniorities.length];
    const titlesForSeniority = titlesBySeniority[seniority] || request.targetTitles;
    const title = titlesForSeniority[i % titlesForSeniority.length];

    // Generate email with common pattern
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${request.domain}`;

    patterns.push({
      email,
      firstName,
      lastName,
      title,
      confidence: 60, // Lower confidence for fallback
      reasoning: "Fallback pattern: firstname.lastname@domain"
    });
  }

  console.log(`[EmailPatternGenerator] Generated ${patterns.length} fallback patterns`);
  return patterns;
}

