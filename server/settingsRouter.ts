import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import * as db from './db';

export const settingsRouter = router({
  // Get all API keys for current user
  getApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const keys = await db.getApiKeys(ctx.user.id);
    return keys;
  }),

  // Save API keys
  saveApiKeys: protectedProcedure
    .input(
      z.object({
        // LLM APIs
        openai: z.string().optional(),
        anthropic: z.string().optional(),
        google: z.string().optional(),
        mistral: z.string().optional(),
        groq: z.string().optional(),
        ollama: z.string().optional(),
        ollama_url: z.string().optional(),
        defaultLlmProvider: z.string().optional(),
        // Lead Generation APIs
        apollo: z.string().optional(),
        linkedin: z.string().optional(),
        hunter: z.string().optional(),
        zerobounce: z.string().optional(),
        // SMTP
        smtp_host: z.string().optional(),
        smtp_port: z.string().optional(),
        smtp_user: z.string().optional(),
        smtp_password: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.saveApiKeys(ctx.user.id, input);
      return { success: true };
    }),

  // Test API key
  testApiKey: protectedProcedure
    .input(
      z.object({
        service: z.string(),
        key: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Test different API keys
      try {
        switch (input.service) {
          case 'openai':
            // Test OpenAI API
            const openaiResponse = await fetch('https://api.openai.com/v1/models', {
              headers: {
                Authorization: `Bearer ${input.key}`,
              },
            });
            if (!openaiResponse.ok) {
              return { success: false, error: 'Invalid OpenAI API key' };
            }
            return { success: true };

          case 'anthropic':
            // Test Anthropic API
            const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': input.key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'Hi' }],
              }),
            });
            // 400 means key is valid but request might be malformed - that's OK for testing
            if (!anthropicResponse.ok && anthropicResponse.status !== 400) {
              return { success: false, error: 'Invalid Anthropic API key' };
            }
            return { success: true };

          case 'google':
            // Test Google AI API (Gemini)
            const googleResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${input.key}`
            );
            if (!googleResponse.ok) {
              return { success: false, error: 'Invalid Google AI API key' };
            }
            return { success: true };

          case 'mistral':
            // Test Mistral API
            const mistralResponse = await fetch('https://api.mistral.ai/v1/models', {
              headers: {
                Authorization: `Bearer ${input.key}`,
              },
            });
            if (!mistralResponse.ok) {
              return { success: false, error: 'Invalid Mistral API key' };
            }
            return { success: true };

          case 'groq':
            // Test Groq API
            const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
              headers: {
                Authorization: `Bearer ${input.key}`,
              },
            });
            if (!groqResponse.ok) {
              return { success: false, error: 'Invalid Groq API key' };
            }
            return { success: true };

          case 'ollama':
            // Test Ollama (self-hosted) API - OpenAI compatible
            // The key contains both the API key and URL separated by '|||'
            const [ollamaKey, ollamaUrl] = input.key.split('|||');
            if (!ollamaUrl) {
              return { success: false, error: 'Ollama URL nicht konfiguriert' };
            }
            try {
              const ollamaResponse = await fetch(ollamaUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${ollamaKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-oss:120b',
                  messages: [{ role: 'user', content: 'Hi' }],
                  max_tokens: 5,
                }),
              });
              if (!ollamaResponse.ok) {
                const errorText = await ollamaResponse.text();
                return { success: false, error: `Ollama API Fehler: ${ollamaResponse.status} - ${errorText}` };
              }
              return { success: true };
            } catch (ollamaError: any) {
              return { success: false, error: `Ollama Verbindungsfehler: ${ollamaError.message}` };
            }

          case 'apollo':
            // Test Apollo.io API
            const apolloResponse = await fetch('https://api.apollo.io/v1/auth/health', {
              headers: {
                'X-Api-Key': input.key,
              },
            });
            if (!apolloResponse.ok) {
              return { success: false, error: 'Invalid Apollo.io API key' };
            }
            return { success: true };

          case 'hunter':
            // Test Hunter.io API
            const hunterResponse = await fetch(
              `https://api.hunter.io/v2/account?api_key=${input.key}`
            );
            if (!hunterResponse.ok) {
              return { success: false, error: 'Invalid Hunter.io API key' };
            }
            return { success: true };

          case 'zerobounce':
            // Test ZeroBounce API
            const zerobounceResponse = await fetch(
              `https://api.zerobounce.net/v2/getcredits?api_key=${input.key}`
            );
            if (!zerobounceResponse.ok) {
              return { success: false, error: 'Invalid ZeroBounce API key' };
            }
            return { success: true };

          case 'smtp':
            // Test SMTP connection (simplified)
            return { success: true, message: 'SMTP test not yet implemented' };

          default:
            return { success: false, error: 'Unknown service' };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  // Get Scout Agent settings
  getScoutSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.getScoutSettings(ctx.user.id);
    return settings;
  }),

  // Save Scout Agent settings
  saveScoutSettings: protectedProcedure
    .input(
      z.object({
        minRevenueMio: z.number().min(0),
        minEmployees: z.number().min(0),
        companyTypes: z.array(z.string()),
        targetMarkets: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.saveScoutSettings(ctx.user.id, input);
      return { success: true };
    }),
});
