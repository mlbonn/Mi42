/**
 * Email Parser for Forwarded Emails
 * Extracts the original sender from forwarded emails using regex and LLM fallback
 */

import { getDb } from "./db";
import { apiKeys } from "../drizzle/schema";

interface ParsedForwardedEmail {
  originalSenderEmail: string | null;
  originalSenderName: string | null;
  originalSubject: string | null;
  originalDate: string | null;
  isForwarded: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// Common patterns for forwarded email headers in different languages/clients
const FORWARDED_PATTERNS = {
  // German patterns (Outlook, Thunderbird)
  de: {
    from: /(?:Von|From):\s*(?:"?([^"<\n]+)"?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
    subject: /(?:Betreff|Subject):\s*(.+?)(?:\n|$)/i,
    date: /(?:Gesendet|Datum|Date|Sent):\s*(.+?)(?:\n|$)/i,
    forwardIndicator: /(?:Weitergeleitete Nachricht|Forwarded message|Begin forwarded message|Ursprüngliche Nachricht|Original Message|----------------------------------------)/i,
  },
  // English patterns
  en: {
    from: /(?:From):\s*(?:"?([^"<\n]+)"?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i,
    subject: /(?:Subject):\s*(.+?)(?:\n|$)/i,
    date: /(?:Date|Sent):\s*(.+?)(?:\n|$)/i,
    forwardIndicator: /(?:Forwarded message|Begin forwarded message|Original Message|---------- Forwarded message ---------|----------------------------------------)/i,
  },
  // Outlook Web/Mobile patterns (with dashes separator)
  outlook: {
    from: /From:\s*"?([^"<\n]+)"?\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/i,
    subject: /Subject:\s*(.+?)(?:\n|$)/i,
    date: /Sent:\s*(.+?)(?:\n|$)/i,
    forwardIndicator: /----------------------------------------/i,
  },
};

/**
 * Try to extract original sender using regex patterns
 */
function extractWithRegex(emailBody: string): ParsedForwardedEmail | null {
  // Check if this looks like a forwarded email
  const isForwarded = Object.values(FORWARDED_PATTERNS).some(
    patterns => patterns.forwardIndicator.test(emailBody)
  );

  if (!isForwarded) {
    return null;
  }

  // Try to find the forwarded section
  let forwardedSection = emailBody;
  
  // Look for common forward delimiters and extract the section after them
  const forwardDelimiters = [
    /---------- Forwarded message ---------/i,
    /-------- Weitergeleitete Nachricht --------/i,
    /Begin forwarded message:/i,
    /Ursprüngliche Nachricht/i,
    /Original Message/i,
    /Von:.*Gesendet:/is,
    /From:.*Sent:/is,
  ];

  for (const delimiter of forwardDelimiters) {
    const match = emailBody.match(delimiter);
    if (match && match.index !== undefined) {
      forwardedSection = emailBody.substring(match.index);
      break;
    }
  }

  // Try to extract sender from the forwarded section
  let senderEmail: string | null = null;
  let senderName: string | null = null;
  let subject: string | null = null;
  let date: string | null = null;

  for (const patterns of Object.values(FORWARDED_PATTERNS)) {
    if (!senderEmail) {
      const fromMatch = forwardedSection.match(patterns.from);
      if (fromMatch) {
        senderName = fromMatch[1]?.trim() || null;
        senderEmail = fromMatch[2]?.toLowerCase() || null;
      }
    }

    if (!subject) {
      const subjectMatch = forwardedSection.match(patterns.subject);
      if (subjectMatch) {
        subject = subjectMatch[1]?.trim() || null;
      }
    }

    if (!date) {
      const dateMatch = forwardedSection.match(patterns.date);
      if (dateMatch) {
        date = dateMatch[1]?.trim() || null;
      }
    }
  }

  if (senderEmail) {
    return {
      originalSenderEmail: senderEmail,
      originalSenderName: senderName,
      originalSubject: subject,
      originalDate: date,
      isForwarded: true,
      confidence: senderName ? 'high' : 'medium',
    };
  }

  return null;
}

/**
 * Get Ollama API configuration from database
 */
async function getOllamaConfig(): Promise<{ url: string; key: string } | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[EmailParser] No database connection');
      return null;
    }

    // Get all api_keys rows and find one with Ollama configured
    const result = await db.select().from(apiKeys);
    if (result.length === 0) {
      console.log('[EmailParser] No api_keys rows found');
      return null;
    }

    // Find a row that has Ollama configured
    const rowWithOllama = result.find(row => row.ollamaUrl && row.ollamaKey);
    
    if (rowWithOllama) {
      console.log('[EmailParser] Found Ollama config:', rowWithOllama.ollamaUrl);
      return {
        url: rowWithOllama.ollamaUrl,
        key: rowWithOllama.ollamaKey,
      };
    }
    
    console.log('[EmailParser] No Ollama config found in any api_keys row');
    return null;
  } catch (error) {
    console.error('[EmailParser] Error getting Ollama config:', error);
    return null;
  }
}

/**
 * Extract original sender using LLM
 */
async function extractWithLLM(emailBody: string): Promise<ParsedForwardedEmail | null> {
  const config = await getOllamaConfig();
  if (!config) {
    console.log('[EmailParser] No Ollama config found, skipping LLM extraction');
    return null;
  }

  const prompt = `Analysiere diese E-Mail und extrahiere die Informationen des URSPRÜNGLICHEN Absenders (nicht der Person, die weitergeleitet hat).

E-Mail-Inhalt:
---
${emailBody.substring(0, 3000)}
---

Antworte NUR mit einem JSON-Objekt in diesem Format (keine anderen Texte):
{
  "isForwarded": true/false,
  "originalSenderEmail": "email@example.com oder null",
  "originalSenderName": "Name oder null",
  "originalSubject": "Betreff oder null",
  "originalDate": "Datum oder null"
}

Wenn dies keine weitergeleitete E-Mail ist, setze isForwarded auf false und alle anderen Felder auf null.`;

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Will be routed by maxproxy
        messages: [
          {
            role: 'system',
            content: 'Du bist ein E-Mail-Analyse-Assistent. Extrahiere präzise Informationen aus weitergeleiteten E-Mails. Antworte immer nur mit validem JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EmailParser] LLM API error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[EmailParser] No content in LLM response');
      return null;
    }

    // Try to parse JSON from the response
    let parsed: any;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[EmailParser] Failed to parse LLM response as JSON:', content);
      return null;
    }

    if (!parsed.isForwarded) {
      return {
        originalSenderEmail: null,
        originalSenderName: null,
        originalSubject: null,
        originalDate: null,
        isForwarded: false,
        confidence: 'high',
      };
    }

    return {
      originalSenderEmail: parsed.originalSenderEmail?.toLowerCase() || null,
      originalSenderName: parsed.originalSenderName || null,
      originalSubject: parsed.originalSubject || null,
      originalDate: parsed.originalDate || null,
      isForwarded: true,
      confidence: 'medium', // LLM results are medium confidence
    };
  } catch (error) {
    console.error('[EmailParser] LLM extraction error:', error);
    return null;
  }
}

/**
 * Main function to parse forwarded emails
 * Uses regex first, then falls back to LLM if needed
 */
export async function parseForwardedEmail(
  emailBody: string,
  emailSubject?: string
): Promise<ParsedForwardedEmail> {
  // Check subject for forward indicators
  const subjectIndicatesForward = emailSubject && 
    /^(Fwd?:|WG:|Wtr:|Weitergeleitet:)/i.test(emailSubject);

  // First, try regex extraction (fast and free)
  const regexResult = extractWithRegex(emailBody);
  
  if (regexResult && regexResult.originalSenderEmail) {
    console.log('[EmailParser] Extracted original sender via regex:', regexResult.originalSenderEmail);
    return regexResult;
  }

  // If regex found it's forwarded but couldn't extract sender, or subject indicates forward
  if ((regexResult?.isForwarded || subjectIndicatesForward)) {
    console.log('[EmailParser] Trying LLM extraction...');
    const llmResult = await extractWithLLM(emailBody);
    
    if (llmResult && llmResult.originalSenderEmail) {
      console.log('[EmailParser] Extracted original sender via LLM:', llmResult.originalSenderEmail);
      return llmResult;
    }
  }

  // Not a forwarded email or couldn't extract sender
  return {
    originalSenderEmail: null,
    originalSenderName: null,
    originalSubject: null,
    originalDate: null,
    isForwarded: regexResult?.isForwarded || subjectIndicatesForward || false,
    confidence: 'low',
  };
}

export type { ParsedForwardedEmail };
