import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import { getDb } from '../db';
import { AIService, createAIService, type AIProvider, DEFAULT_MODELS } from '../aiService';

export const aiRouter = router({
  /**
   * Get AI settings for current user
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    
    const db = await getDb();
    const settings = await db.query(
      `SELECT ai_provider, ai_model, ai_api_key, ai_features_enabled 
       FROM user_ai_settings 
       WHERE user_id = ? 
       LIMIT 1`,
      [userId]
    );

    if (settings.length === 0) {
      // Return defaults if no settings exist
      return {
        ai_provider: 'openai' as AIProvider,
        ai_model: DEFAULT_MODELS.openai,
        ai_api_key: '',
        ai_features_enabled: {
          reply_generation: true,
          translation: true,
          summarization: true,
          smart_replies: true,
          categorization: true,
        },
      };
    }

    const setting = settings[0];
    
    return {
      ai_provider: setting.ai_provider as AIProvider,
      ai_model: setting.ai_model,
      ai_api_key: setting.ai_api_key ? '***' : '', // Mask API key
      ai_features_enabled: setting.ai_features_enabled 
        ? JSON.parse(setting.ai_features_enabled)
        : {
            reply_generation: true,
            translation: true,
            summarization: true,
            smart_replies: true,
            categorization: true,
          },
    };
  }),

  /**
   * Update AI settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        ai_provider: z.enum(['openai', 'anthropic', 'gemini']),
        ai_model: z.string(),
        ai_api_key: z.string().optional(),
        ai_features_enabled: z.object({
          reply_generation: z.boolean(),
          translation: z.boolean(),
          summarization: z.boolean(),
          smart_replies: z.boolean(),
          categorization: z.boolean(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Check if settings exist
      const db = await getDb();
      const existing = await db.query(
        `SELECT id FROM user_ai_settings WHERE user_id = ? LIMIT 1`,
        [userId]
      );

      const featuresJson = input.ai_features_enabled 
        ? JSON.stringify(input.ai_features_enabled)
        : null;

      if (existing.length === 0) {
        // Insert new settings
        await db.query(
          `INSERT INTO user_ai_settings 
           (user_id, ai_provider, ai_model, ai_api_key, ai_features_enabled, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userId,
            input.ai_provider,
            input.ai_model,
            input.ai_api_key || '',
            featuresJson,
          ]
        );
      } else {
        // Update existing settings
        const updates: string[] = [];
        const values: any[] = [];

        updates.push('ai_provider = ?');
        values.push(input.ai_provider);

        updates.push('ai_model = ?');
        values.push(input.ai_model);

        if (input.ai_api_key) {
          updates.push('ai_api_key = ?');
          values.push(input.ai_api_key);
        }

        if (featuresJson) {
          updates.push('ai_features_enabled = ?');
          values.push(featuresJson);
        }

        updates.push('updated_at = NOW()');
        values.push(userId);

        await db.query(
          `UPDATE user_ai_settings SET ${updates.join(', ')} WHERE user_id = ?`,
          values
        );
      }

      return { success: true };
    }),

  /**
   * Generate reply to email
   */
  generateReply: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        folder: z.string(),
        userContext: z.string(),
        tone: z.enum(['friendly', 'professional', 'brief']).optional(),
        language: z.enum(['de', 'en', 'auto']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Get AI service
      const aiService = await createAIService(async () => {
        const db = await getDb();
    const settings = await db.query(
          `SELECT ai_provider, ai_model, ai_api_key FROM user_ai_settings WHERE user_id = ? LIMIT 1`,
          [userId]
        );
        
        if (settings.length === 0 || !settings[0].ai_api_key) {
          throw new Error('AI settings not configured. Please set up your API key in settings.');
        }

        return settings[0];
      });

      // Get email from database (assuming it's cached)
      const db2 = await getDb();
      const emails = await db2.query(
        `SELECT * FROM emails WHERE id = ? AND user_id = ? LIMIT 1`,
        [input.emailId, userId]
      );

      if (emails.length === 0) {
        throw new Error('Email not found');
      }

      const email = emails[0];

      // Generate reply
      const reply = await aiService.generateReply(
        {
          from: email.from_address,
          to: email.to_address,
          subject: email.subject,
          body: email.body_text,
          html: email.body_html,
        },
        input.userContext,
        {
          tone: input.tone,
          language: input.language,
        }
      );

      return { reply };
    }),

  /**
   * Translate email content
   */
  translate: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        targetLanguage: z.string(),
        sourceLanguage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const aiService = await createAIService(async () => {
        const db = await getDb();
    const settings = await db.query(
          `SELECT ai_provider, ai_model, ai_api_key FROM user_ai_settings WHERE user_id = ? LIMIT 1`,
          [userId]
        );
        
        if (settings.length === 0 || !settings[0].ai_api_key) {
          throw new Error('AI settings not configured');
        }

        return settings[0];
      });

      const translation = await aiService.translate(
        input.text,
        input.targetLanguage,
        input.sourceLanguage
      );

      return { translation };
    }),

  /**
   * Summarize email
   */
  summarize: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      const aiService = await createAIService(async () => {
        const db = await getDb();
    const settings = await db.query(
          `SELECT ai_provider, ai_model, ai_api_key FROM user_ai_settings WHERE user_id = ? LIMIT 1`,
          [userId]
        );
        
        if (settings.length === 0 || !settings[0].ai_api_key) {
          throw new Error('AI settings not configured');
        }

        return settings[0];
      });

      // Get email
      const db2 = await getDb();
      const emails = await db2.query(
        `SELECT * FROM emails WHERE id = ? AND user_id = ? LIMIT 1`,
        [input.emailId, userId]
      );

      if (emails.length === 0) {
        throw new Error('Email not found');
      }

      const email = emails[0];

      const result = await aiService.summarize({
        from: email.from_address,
        to: email.to_address,
        subject: email.subject,
        body: email.body_text,
        html: email.body_html,
      });

      return result;
    }),

  /**
   * Generate smart replies
   */
  generateSmartReplies: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Check cache first
      const db = await getDb();
      const cached = await db.query(
        `SELECT reply_1, reply_2, reply_3 
         FROM email_ai_smart_replies 
         WHERE email_uid = ? AND user_id = ? AND expires_at > NOW() 
         LIMIT 1`,
        [input.emailId, userId]
      );

      if (cached.length > 0) {
        return {
          replies: [cached[0].reply_1, cached[0].reply_2, cached[0].reply_3],
        };
      }

      const aiService = await createAIService(async () => {
        const db = await getDb();
    const settings = await db.query(
          `SELECT ai_provider, ai_model, ai_api_key FROM user_ai_settings WHERE user_id = ? LIMIT 1`,
          [userId]
        );
        
        if (settings.length === 0 || !settings[0].ai_api_key) {
          throw new Error('AI settings not configured');
        }

        return settings[0];
      });

      // Get email
      const db2 = await getDb();
      const emails = await db2.query(
        `SELECT * FROM emails WHERE id = ? AND user_id = ? LIMIT 1`,
        [input.emailId, userId]
      );

      if (emails.length === 0) {
        throw new Error('Email not found');
      }

      const email = emails[0];

      const replies = await aiService.generateSmartReplies({
        from: email.from_address,
        to: email.to_address,
        subject: email.subject,
        body: email.body_text,
        html: email.body_html,
      });

      // Cache results
      await getDb().query(
        `INSERT INTO email_ai_smart_replies 
         (email_uid, user_id, reply_1, reply_2, reply_3, generated_at, expires_at) 
         VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
         ON DUPLICATE KEY UPDATE 
         reply_1 = VALUES(reply_1), 
         reply_2 = VALUES(reply_2), 
         reply_3 = VALUES(reply_3),
         generated_at = NOW(),
         expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)`,
        [input.emailId, userId, replies[0] || '', replies[1] || '', replies[2] || '']
      );

      return { replies };
    }),

  /**
   * Categorize email
   */
  categorizeEmail: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Check if already categorized
      const db = await getDb();
      const existing = await db.query(
        `SELECT * FROM email_ai_categories WHERE email_uid = ? AND user_id = ? LIMIT 1`,
        [input.emailId, userId]
      );

      if (existing.length > 0) {
        const cat = existing[0];
        return {
          category: cat.ai_category,
          importance: cat.ai_importance,
          sentiment: cat.ai_sentiment,
          urgency: cat.ai_urgency,
          tags: cat.ai_tags ? JSON.parse(cat.ai_tags) : [],
        };
      }

      const aiService = await createAIService(async () => {
        const db = await getDb();
    const settings = await db.query(
          `SELECT ai_provider, ai_model, ai_api_key FROM user_ai_settings WHERE user_id = ? LIMIT 1`,
          [userId]
        );
        
        if (settings.length === 0 || !settings[0].ai_api_key) {
          throw new Error('AI settings not configured');
        }

        return settings[0];
      });

      // Get email
      const db2 = await getDb();
      const emails = await db2.query(
        `SELECT * FROM emails WHERE id = ? AND user_id = ? LIMIT 1`,
        [input.emailId, userId]
      );

      if (emails.length === 0) {
        throw new Error('Email not found');
      }

      const email = emails[0];

      const result = await aiService.categorizeEmail({
        from: email.from_address,
        to: email.to_address,
        subject: email.subject,
        body: email.body_text,
        html: email.body_html,
      });

      // Save to database
      await getDb().query(
        `INSERT INTO email_ai_categories 
         (email_uid, user_id, email_folder, email_from_address, ai_category, ai_importance, ai_sentiment, ai_urgency, ai_tags, categorized_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          input.emailId,
          userId,
          email.folder || 'INBOX',
          email.from_address,
          result.category,
          result.importance,
          result.sentiment,
          result.urgency,
          JSON.stringify(result.tags),
        ]
      );

      return result;
    }),
});
