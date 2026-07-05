import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { contacts } from '../drizzle/schema';
import { or, like, eq } from 'drizzle-orm';
import {
  matchContactsForEmail,
  linkEmailToContactDb,
  unlinkEmailFromContactDb,
} from './db';

export const emailContactSearchRouter = router({
  // Kontakte suchen
  searchContacts: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return [];
        const results = await db
          .select()
          .from(contacts)
          .where(
            or(
              like(contacts.firstName, `%${input.query}%`),
              like(contacts.lastName, `%${input.query}%`),
              like(contacts.email, `%${input.query}%`)
            )
          )
          .limit(input.limit);
        return results.map((c) => ({
          id: c.id,
          name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          email: c.email,
          emails: [c.email, c.email2, c.email3, c.email4, c.email5].filter(Boolean),
          type: 'contact' as const,
        }));
      } catch (error) {
        console.error('[EmailSearch] Search failed:', error);
        return [];
      }
    }),

  // Kontakt mit E-Mail manuell verlinken (echter DB-Eintrag)
  linkEmailToContact: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        contactId: z.string(),
        emailAddress: z.string().email().optional(),
        fromAddress: z.string().optional(),
        fromName: z.string().optional(),
        toAddress: z.string().optional(),
        ccAddress: z.string().optional(),
        subject: z.string().optional(),
        folder: z.string().optional(),
        emailDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error('Not authenticated');
      const result = await linkEmailToContactDb({
        emailId: input.emailId,
        contactId: input.contactId,
        userId,
        fromAddress: input.fromAddress,
        fromName: input.fromName,
        toAddress: input.toAddress,
        ccAddress: input.ccAddress,
        subject: input.subject,
        folder: input.folder,
        emailDate: input.emailDate ? new Date(input.emailDate) : undefined,
      });
      return { success: true, inserted: result.inserted };
    }),

  // Verknüpfung entfernen
  unlinkEmailFromContact: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        contactId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await unlinkEmailFromContactDb(input.emailId, input.contactId);
      return { success: true };
    }),

  // Automatisches Matching: Kontakte für eine E-Mail finden
  matchContactsForEmail: protectedProcedure
    .input(
      z.object({
        fromAddress: z.string(),
        toAddresses: z.array(z.string()).default([]),
        ccAddresses: z.array(z.string()).default([]),
      })
    )
    .query(async ({ input }) => {
      const contactIds = await matchContactsForEmail(
        input.fromAddress,
        input.toAddresses,
        input.ccAddresses
      );
      return { contactIds };
    }),

  // Kontakt-Details
  getContactWithProjects: protectedProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return null;
        const result = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, input.contactId))
          .limit(1);
        const contact = result[0];
        if (!contact) return null;
        return {
          id: contact.id,
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          email: contact.email,
          emails: [contact.email, contact.email2, contact.email3, contact.email4, contact.email5].filter(Boolean),
          jobTitle: contact.jobTitle,
          phone: contact.phone,
          mobile: contact.mobile,
        };
      } catch (error) {
        console.error('[EmailSearch] Get contact failed:', error);
        return null;
      }
    }),
});
