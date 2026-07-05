import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import * as db from './db';

export const emailAccountsRouter = router({
  // List all email accounts
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id || '';
    return await db.getEmailAccounts(userId);
  }),

  // Get a single email account
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id || '';
      return await db.getEmailAccount(input.id, userId);
    }),

  // Create a new email account
  create: protectedProcedure
    .input(
      z.object({
        emailAddress: z.string().email(),
        passwordEncrypted: z.string(),
        serverUrl: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || '';
      return await db.createEmailAccount({ ...input, userId });
    }),

  // Update an email account
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        emailAddress: z.string().email().optional(),
        passwordEncrypted: z.string().optional(),
        serverUrl: z.string().optional(),
        isPrimary: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || '';
      const { id, ...data } = input;
      return await db.updateEmailAccount(id, userId, data);
    }),

  // Delete an email account
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || '';
      return await db.deleteEmailAccount(input.id, userId);
    }),

  // Get fetch logs
  fetchLogs: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id || '';
    return await db.getEmailFetchLogs(userId);
  }),
});
