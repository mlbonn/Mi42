import OpenAI from 'openai';

// Supported AI providers
export type AIProvider = 'openai' | 'anthropic' | 'gemini';

// AI model configurations
export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

// Default models for each provider
export const DEFAULT_MODELS = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-2.5-flash',
};

// Email context for AI operations
export interface EmailContext {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  html?: string;
}

// AI Service class
export class AIService {
  private config: AIModelConfig;
  private openai?: OpenAI;

  constructor(config: AIModelConfig) {
    this.config = config;
    
    // Initialize OpenAI client (works for OpenAI-compatible APIs)
    if (config.provider === 'openai' || config.provider === 'gemini') {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.provider === 'gemini' 
          ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
          : undefined,
      });
    }
  }

  /**
   * Generate a reply to an email
   */
  async generateReply(
    email: EmailContext,
    userContext: string,
    options?: {
      tone?: 'friendly' | 'professional' | 'brief';
      language?: 'de' | 'en' | 'auto';
    }
  ): Promise<string> {
    const tone = options?.tone || 'professional';
    const language = options?.language || 'de';

    const prompt = `Du bist ein professioneller E-Mail-Assistent. Generiere eine ${tone === 'friendly' ? 'freundliche' : tone === 'brief' ? 'kurze und prägnante' : 'professionelle'} Antwort auf folgende E-Mail.

Original E-Mail:
Von: ${email.from || 'Unbekannt'}
Betreff: ${email.subject || 'Kein Betreff'}
Nachricht:
${email.body || email.html || 'Keine Nachricht'}

Kontext/Anweisung vom Benutzer:
${userContext}

Sprache: ${language === 'de' ? 'Deutsch' : language === 'en' ? 'Englisch' : 'Automatisch erkennen'}

Generiere nur den E-Mail-Text ohne Anrede-Formel am Anfang (kein "Sehr geehrte/r..."). Beginne direkt mit dem Inhalt.`;

    return this.complete(prompt);
  }

  /**
   * Translate email content
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const prompt = `Übersetze folgenden Text ${sourceLanguage ? `von ${sourceLanguage}` : ''} nach ${targetLanguage}. Behalte die Formatierung bei.

Text:
${text}

Übersetzung:`;

    return this.complete(prompt);
  }

  /**
   * Summarize email content
   */
  async summarize(email: EmailContext): Promise<{
    summary: string;
    keyPoints: string[];
  }> {
    const prompt = `Fasse folgende E-Mail zusammen:

Von: ${email.from || 'Unbekannt'}
Betreff: ${email.subject || 'Kein Betreff'}
Nachricht:
${email.body || email.html || 'Keine Nachricht'}

Erstelle:
1. Eine kurze Zusammenfassung (2-3 Sätze)
2. Die wichtigsten Punkte als Liste

Antworte im JSON-Format:
{
  "summary": "...",
  "keyPoints": ["Punkt 1", "Punkt 2", ...]
}`;

    const response = await this.complete(prompt);
    
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || response,
        keyPoints: parsed.keyPoints || [],
      };
    } catch {
      // Fallback if not valid JSON
      return {
        summary: response,
        keyPoints: [],
      };
    }
  }

  /**
   * Generate smart reply suggestions
   */
  async generateSmartReplies(email: EmailContext): Promise<string[]> {
    const prompt = `Generiere 3 kurze, passende Antwort-Vorschläge für folgende E-Mail (ähnlich wie Gmail Smart Replies):

Von: ${email.from || 'Unbekannt'}
Betreff: ${email.subject || 'Kein Betreff'}
Nachricht:
${email.body || email.html || 'Keine Nachricht'}

Die Antworten sollten:
- Sehr kurz sein (max. 10 Wörter)
- Unterschiedliche Tonalitäten haben (positiv, neutral, ablehnend)
- Auf Deutsch sein
- Direkt verwendbar sein (keine Anrede)

Antworte im JSON-Format:
["Antwort 1", "Antwort 2", "Antwort 3"]`;

    const response = await this.complete(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback
      return [
        'Vielen Dank für Ihre Nachricht!',
        'Ich melde mich bald bei Ihnen.',
        'Das klingt interessant, erzählen Sie mehr.',
      ];
    }
  }

  /**
   * Categorize email
   */
  async categorizeEmail(email: EmailContext): Promise<{
    category: string;
    importance: number; // 1-5 stars
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    tags: string[];
  }> {
    const prompt = `Analysiere folgende E-Mail und kategorisiere sie:

Von: ${email.from || 'Unbekannt'}
Betreff: ${email.subject || 'Kein Betreff'}
Nachricht:
${email.body || email.html || 'Keine Nachricht'}

Bestimme:
1. Kategorie (z.B. "Rechnung", "Anfrage", "Beschwerde", "Newsletter", "Persönlich")
2. Wichtigkeit (1-5 Sterne)
3. Sentiment (positive, neutral, negative)
4. Dringlichkeit (low, medium, high)
5. Tags (max. 3 relevante Schlagwörter)

Antworte im JSON-Format:
{
  "category": "...",
  "importance": 3,
  "sentiment": "neutral",
  "urgency": "medium",
  "tags": ["tag1", "tag2"]
}`;

    const response = await this.complete(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return {
        category: parsed.category || 'Sonstiges',
        importance: Math.min(5, Math.max(1, parsed.importance || 3)),
        sentiment: parsed.sentiment || 'neutral',
        urgency: parsed.urgency || 'medium',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
      };
    } catch {
      // Fallback
      return {
        category: 'Sonstiges',
        importance: 3,
        sentiment: 'neutral',
        urgency: 'medium',
        tags: [],
      };
    }
  }

  /**
   * Generic completion method
   */
  private async complete(prompt: string): Promise<string> {
    if (this.config.provider === 'openai' || this.config.provider === 'gemini') {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || '';
    }

    // TODO: Add Anthropic support
    if (this.config.provider === 'anthropic') {
      throw new Error('Anthropic provider not yet implemented');
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }
}

/**
 * Create AI service instance from user settings
 */
export async function createAIService(
  getUserSettings: () => Promise<{
    ai_provider: AIProvider;
    ai_model: string;
    ai_api_key: string;
  }>
): Promise<AIService> {
  const settings = await getUserSettings();
  
  return new AIService({
    provider: settings.ai_provider,
    model: settings.ai_model || DEFAULT_MODELS[settings.ai_provider],
    apiKey: settings.ai_api_key,
  });
}
