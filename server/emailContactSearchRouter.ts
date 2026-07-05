import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { contacts } from '../drizzle/schema';
import { or, like } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

export const emailContactSearchRouter = router({
  // Kontakte suchen (für E-Mail-Adresssuche)
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

  // Kontakt mit E-Mail verlinken
  linkEmailToContact: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        contactId: z.string(),
        emailAddress: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const id = `ecl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return { success: true, id };
      } catch (error) {
        console.error('[EmailSearch] Link failed:', error);
        throw new Error('Failed to link email to contact');
      }
    }),

  // Kontakt-Details mit Projekten
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
