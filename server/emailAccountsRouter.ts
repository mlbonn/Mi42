import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import * as db from './db';

export const emailAccountsRouter = router({
  // List all email accounts
  list: protectedProcedure.query(async () => {
    return await db.getEmailAccounts();
  }),

  // Get a single email account
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.getEmailAccount(input.id);
    }),

  // Create a new email account
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        purpose: z.enum(['archive', 'bounces', 'replies', 'general']),
        imapHost: z.string().min(1),
        imapPort: z.number().default(993),
        imapUser: z.string().min(1),
        imapPassword: z.string().min(1),
        imapSsl: z.boolean().default(true),
        deleteAfterFetch: z.boolean().default(true),
        markAsReadAfterFetch: z.boolean().default(true),
        fetchIntervalMinutes: z.number().min(1).default(5),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      return await db.createEmailAccount(input);
    }),

  // Update an email account
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        purpose: z.enum(['archive', 'bounces', 'replies', 'general']).optional(),
        imapHost: z.string().min(1).optional(),
        imapPort: z.number().optional(),
        imapUser: z.string().min(1).optional(),
        imapPassword: z.string().min(1).optional(),
        imapSsl: z.boolean().optional(),
        deleteAfterFetch: z.boolean().optional(),
        markAsReadAfterFetch: z.boolean().optional(),
        fetchIntervalMinutes: z.number().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.updateEmailAccount(id, data);
    }),

  // Delete an email account
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await db.deleteEmailAccount(input.id);
    }),

  // Test IMAP connection
  testConnection: protectedProcedure
    .input(
      z.object({
        imapHost: z.string().min(1),
        imapPort: z.number(),
        imapUser: z.string().min(1),
        imapPassword: z.string().min(1),
        imapSsl: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const Imap = (await import('imap')).default;
        
        return new Promise((resolve) => {
          const imap = new Imap({
            user: input.imapUser,
            password: input.imapPassword,
            host: input.imapHost,
            port: input.imapPort,
            tls: input.imapSsl,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 10000,
            authTimeout: 10000,
          });

          imap.once('ready', () => {
            imap.end();
            resolve({ success: true, message: 'Verbindung erfolgreich!' });
          });

          imap.once('error', (err: any) => {
            resolve({ success: false, error: `Verbindungsfehler: ${err.message}` });
          });

          imap.connect();

          // Timeout after 15 seconds
          setTimeout(() => {
            try {
              imap.end();
            } catch {}
            resolve({ success: false, error: 'Verbindungs-Timeout (15s)' });
          }, 15000);
        });
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

  // Get fetch logs for an account
  getLogs: protectedProcedure
    .input(
      z.object({
        emailAccountId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await db.getEmailFetchLogs(input.emailAccountId, input.limit);
    }),

  // Manually trigger fetch for an account
  triggerFetch: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // This will be implemented by the email fetcher worker
      // For now, just return a placeholder
      return { success: true, message: 'Abruf gestartet' };
    }),
});
