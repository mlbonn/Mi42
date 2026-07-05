import { router, protectedProcedure } from './_core/trpc';
import { getDb, getEmailAccounts, createEmailAccount } from './db';
import { encryptCredential, decryptCredential } from './credentialService';
import { emailAccountsNew, users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const userSettingsRouter = router({
  /**
   * Get CalDAV credentials for current user (from email_accounts_new)
   */
  getCalDAVCredentials: protectedProcedure.query(async ({ ctx }) => {
    try {
      const accounts = await getEmailAccounts(ctx.user.id);
      const primary = accounts.find((a: any) => a.isPrimary) || accounts[0];
      if (!primary) {
        return { caldavEmail: '', caldavEnabled: false };
      }
      return {
        caldavEmail: primary.emailAddress,
        caldavEnabled: primary.isActive,
      };
    } catch (error) {
      console.error('[UserSettings] Error getting CalDAV credentials:', error);
      return { caldavEmail: '', caldavEnabled: false };
    }
  }),

  /**
   * Save CalDAV credentials (stored in email_accounts_new)
   */
  saveCalDAVCredentials: protectedProcedure
    .input(
      z.object({
        caldavEmail: z.string().email(),
        caldavPassword: z.string(),
        caldavEnabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const passwordEncrypted = encryptCredential(input.caldavPassword);
        const existing = await getEmailAccounts(ctx.user.id);
        const primary = existing.find((a: any) => a.isPrimary) || existing[0];
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        if (primary) {
          await db
            .update(emailAccountsNew)
            .set({
              emailAddress: input.caldavEmail,
              passwordEncrypted,
              isActive: input.caldavEnabled,
              useForCaldav: input.caldavEnabled,
              updatedAt: new Date(),
            })
            .where(eq(emailAccountsNew.id, primary.id));
        } else {
          await createEmailAccount({
            userId: ctx.user.id,
            emailAddress: input.caldavEmail,
            passwordEncrypted,
            serverUrl: 'https://mail.bl2020.com',
            isPrimary: true,
          });
        }
        console.log(`[UserSettings] CalDAV credentials saved for user ${input.caldavEmail}`);
        return { success: true, message: 'Credentials saved successfully' };
      } catch (error) {
        console.error('[UserSettings] Error saving CalDAV credentials:', error);
        throw error;
      }
    }),

  /**
   * Test CalDAV connection
   */
  testCalDAVConnection: protectedProcedure
    .input(
      z.object({
        caldavEmail: z.string().email(),
        caldavPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { DAVClient } = await import('tsdav');
        const client = new DAVClient({
          serverUrl: 'https://mail.bl2020.com',
          credentials: {
            username: input.caldavEmail,
            password: input.caldavPassword,
          },
          authMethod: 'Basic',
          defaultAccountType: 'caldav',
        });
        await client.login();
        console.log(`[UserSettings] CalDAV connection test successful for ${input.caldavEmail}`);
        return { success: true, message: 'Connection successful' };
      } catch (error) {
        console.error('[UserSettings] CalDAV connection test failed:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Connection failed',
        };
      }
    }),
});
