import { z } from 'zod';
import { router, protectedProcedure } from './_core/trpc';
import * as db from './db';
import { eq, and } from 'drizzle-orm';
import { emailAccountsNew } from '../drizzle/schema';

export const smartermailApiAccountsRouter = router({
  // List all SmarterMail accounts for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return await db.getEmailAccounts(userId);
  }),

  // Get a single SmarterMail account
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      return await db.getEmailAccount(input.id, userId);
    }),

  // Create a new SmarterMail account
  create: protectedProcedure
    .input(
      z.object({
        emailAddress: z.string().email(),
        password: z.string().min(1),
        serverUrl: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // If this should be primary, unset all other primary accounts first
      if (input.isPrimary) {
        const database = await db.getDb();
        if (database) {
          await database
            .update(emailAccountsNew)
            .set({ isPrimary: false })
            .where(eq(emailAccountsNew.userId, userId));
        }
      }

      return await db.createEmailAccount({
        userId,
        emailAddress: input.emailAddress,
        passwordEncrypted: require('./credentialService').encryptCredential(input.password),
        serverUrl: input.serverUrl || 'https://mail.bl2020.com',
        isPrimary: input.isPrimary || false,
      });
    }),

  // Update a SmarterMail account
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        emailAddress: z.string().email().optional(),
        password: z.string().min(1).optional(),
        serverUrl: z.string().optional(),
        isPrimary: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { id, ...data } = input;

      // If this should be primary, unset all other primary accounts first
      if (data.isPrimary) {
        const database = await db.getDb();
        if (database) {
          await database
            .update(emailAccountsNew)
            .set({ isPrimary: false })
            .where(eq(emailAccountsNew.userId, userId));
        }
      }

      return await db.updateEmailAccount(id, userId, data);
    }),

  // Delete a SmarterMail account
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Check if this is the only account
      const accounts = await db.getEmailAccounts(userId);
      if (accounts.length === 1) {
        throw new Error('Cannot delete the last email account');
      }

      // If deleting primary account, set another account as primary
      const accountToDelete = await db.getEmailAccount(input.id, userId);
      if (accountToDelete?.isPrimary) {
        const otherAccount = accounts.find((a) => a.id !== input.id);
        if (otherAccount) {
          await db.updateEmailAccount(otherAccount.id, userId, { isPrimary: true });
        }
      }

      return await db.deleteEmailAccount(input.id, userId);
    }),

  // Set an account as primary
  setPrimary: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Unset all other primary accounts
      const database = await db.getDb();
      if (!database) {
        throw new Error('Database not available');
      }

      await database
        .update(emailAccountsNew)
        .set({ isPrimary: false })
        .where(eq(emailAccountsNew.userId, userId));

      // Set this account as primary
      await database
        .update(emailAccountsNew)
        .set({ isPrimary: true })
        .where(and(eq(emailAccountsNew.id, input.id), eq(emailAccountsNew.userId, userId)));

      return { success: true };
    }),

  // Test SmarterMail connection
  testConnection: protectedProcedure
    .input(
      z.object({
        emailAddress: z.string().email(),
        password: z.string().min(1),
        serverUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Test connection using SmarterMailClient
        const { SmarterMailClient } = await import('./smartermailClient');
        const client = new SmarterMailClient(input.emailAddress);
        await client.authenticate(input.emailAddress, input.password);
        
        const token = true; // authentication already done above
        if (token) {
          return { success: true, message: 'Verbindung erfolgreich!' };
        } else {
          return { success: false, error: 'Authentifizierung fehlgeschlagen' };
        }
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),
});
