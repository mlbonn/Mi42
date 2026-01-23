import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const archiveRouter = router({
  /**
   * Archive an email to a contact
   */
  archiveEmail: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        contactId: z.string(),
        notes: z.string().optional(),
        source: z.enum(['inbox', 'sent', 'manual']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      // Get email details
      const emails = await db.query(
        `SELECT * FROM emails WHERE id = ? AND user_id = ? LIMIT 1`,
        [input.emailId, userId]
      );
      if (emails.length === 0) {
        throw new Error('Email not found');
      }
      const email = emails[0];
      // Check if contact exists
      const contacts = await db.query(
        `SELECT id FROM contacts WHERE id = ? LIMIT 1`,
        [input.contactId]
      );
      if (contacts.length === 0) {
        throw new Error('Contact not found');
      }
      // Archive email
      await db.query(
        `INSERT INTO contact_email_archives 
         (contact_id, user_id, email_uid, email_folder, email_from_address, email_to_address, email_subject, email_body_text, email_body_html, email_date, archive_notes, archive_source, archived_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          input.contactId,
          userId,
          input.emailId,
          email.folder || 'INBOX',
          email.from_address,
          email.to_address,
          email.subject,
          email.body_text,
          email.body_html,
          email.date,
          input.notes || '',
          input.source,
        ]
      );
      return { success: true };
    }),

  /**
   * Create new contact from extracted data
   */
  createContact: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        jobTitle: z.string().optional(),
        company: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      
      const result = await db.query(
        `INSERT INTO contacts (firstName, lastName, email, jobTitle, company, phone, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [input.firstName, input.lastName, input.email, input.jobTitle || '', input.company || '', input.phone || '']
      );
      
      return { contactId: result.insertId };
    }),

  /**
   * Add email to existing contact
   */
  addEmailToContact: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        email: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      
      // Get current email fields
      const contacts = await db.query(
        `SELECT email, email2, email3, email4, email5 FROM contacts WHERE id = ? LIMIT 1`,
        [input.contactId]
      );
      
      if (contacts.length === 0) {
        throw new Error('Contact not found');
      }
      
      const contact = contacts[0];
      
      // Find first empty email field
      let fieldToUpdate = null;
      if (!contact.email) fieldToUpdate = 'email';
      else if (!contact.email2) fieldToUpdate = 'email2';
      else if (!contact.email3) fieldToUpdate = 'email3';
      else if (!contact.email4) fieldToUpdate = 'email4';
      else if (!contact.email5) fieldToUpdate = 'email5';
      
      if (!fieldToUpdate) {
        throw new Error('All email fields are full');
      }
      
      await db.query(
        `UPDATE contacts SET ${fieldToUpdate} = ?, updated_at = NOW() WHERE id = ?`,
        [input.email, input.contactId]
      );
      
      return { success: true, field: fieldToUpdate };
    }),

  /**
   * Get archived emails for a contact
   */
  getArchivedEmails: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      const archives = await db.query(
        `SELECT * FROM contact_email_archives 
         WHERE contact_id = ? AND user_id = ? 
         ORDER BY archived_at DESC`,
        [input.contactId, userId]
      );
      return { archives };
    }),

  /**
   * Search contacts by email only (email1-email5)
   */
  searchContactsByEmail: protectedProcedure
    .input(
      z.object({
        email: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      
      const searchQuery = `%${input.email}%`;
      const contacts = await db.query(
        `SELECT id, firstName, lastName, email, email2, email3, email4, email5, jobTitle, company 
         FROM contacts 
         WHERE (email LIKE ? OR email2 LIKE ? OR email3 LIKE ? OR email4 LIKE ? OR email5 LIKE ?) 
         LIMIT 10`,
        [searchQuery, searchQuery, searchQuery, searchQuery, searchQuery]
      );
      
      return { contacts };
    }),

  /**
   * Search contacts by name (fallback)
   */
  searchContactsByName: protectedProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = await getDb();
      
      const searchQuery = `%${input.name}%`;
      const contacts = await db.query(
        `SELECT id, firstName, lastName, email, email2, email3, email4, email5, jobTitle, company 
         FROM contacts 
         WHERE (firstName LIKE ? OR lastName LIKE ? OR CONCAT(firstName, ' ', lastName) LIKE ?) 
         LIMIT 10`,
        [searchQuery, searchQuery, searchQuery]
      );
      
      return { contacts };
    }),

  /**
   * Extract contact info from email signature using LLM
   */
  extractContactFromSignature: protectedProcedure
    .input(
      z.object({
        emailBody: z.string(),
        fromAddress: z.string(),
        fromName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Du bist ein Assistent, der Kontaktinformationen aus E-Mail-Signaturen extrahiert. 
Extrahiere folgende Informationen:
- firstName (Vorname)
- lastName (Nachname)
- email (E-Mail-Adresse)
- jobTitle (Position/Titel)
- company (Firma/Organisation)
- phone (Telefonnummer)

Antworte NUR mit einem JSON-Objekt. Keine zusätzlichen Texte.
Wenn eine Information nicht gefunden wird, setze den Wert auf null.

Beispiel:
{"firstName": "Max", "lastName": "Mustermann", "email": "max@example.com", "jobTitle": "CEO", "company": "Example GmbH", "phone": "+49 123 456789"}`
            },
            {
              role: 'user',
              content: `E-Mail von: ${input.fromName || input.fromAddress}
E-Mail-Adresse: ${input.fromAddress}

E-Mail-Inhalt:
${input.emailBody}

Extrahiere die Kontaktinformationen aus der Signatur.`
            }
          ],
          temperature: 0.3,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from LLM');
        }

        const extracted = JSON.parse(content);
        
        // Ensure email is set
        if (!extracted.email) {
          extracted.email = input.fromAddress;
        }
        
        // Parse name if not found
        if (!extracted.firstName && input.fromName) {
          const nameParts = input.fromName.split(' ');
          extracted.firstName = nameParts[0] || '';
          extracted.lastName = nameParts.slice(1).join(' ') || '';
        }
        
        return { 
          contact: {
            firstName: extracted.firstName || '',
            lastName: extracted.lastName || '',
            email: extracted.email || input.fromAddress,
            jobTitle: extracted.jobTitle || '',
            company: extracted.company || '',
            phone: extracted.phone || '',
          }
        };
      } catch (error) {
        console.error('LLM extraction error:', error);
        
        // Fallback: Basic parsing
        const nameParts = (input.fromName || '').split(' ');
        return {
          contact: {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: input.fromAddress,
            jobTitle: '',
            company: '',
            phone: '',
          }
        };
      }
    }),
});
