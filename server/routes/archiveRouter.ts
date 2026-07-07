import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { archivedEmails, archivedEmailAttachments, attachments, contacts } from '../../drizzle/schema';
import { eq, desc, or, like } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import OpenAI from 'openai';
import { matchContactsForEmail, linkEmailToContactDb } from '../db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ATTACHMENT_DIR = path.join(process.cwd(), 'uploads', 'email-attachments');

// Ensure attachment directory exists
if (!fs.existsSync(ATTACHMENT_DIR)) {
  fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
}

export const archiveRouter = router({
  /**
   * Archive email to contact
   * Saves email to archived_emails table and handles attachments
   */
  archiveEmail: protectedProcedure
    .input(
      z.object({
        contactId: z.string(),
        emailData: z.object({
          messageId: z.string(),
          folder: z.string().default('INBOX'),
          from: z.string(),
          fromName: z.string().optional(),
          to: z.string(),
          cc: z.string().optional(),
          subject: z.string(),
          bodyText: z.string().optional(),
          bodyHtml: z.string().optional(),
          date: z.string(),
          attachments: z.array(z.object({
            filename: z.string(),
            contentType: z.string(),
            size: z.number(),
            content: z.string(), // Base64 encoded
          })).optional(),
        }),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;

        // Verify contact exists
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const contactRows = await db.select().from(contacts).where(eq(contacts.id, input.contactId)).limit(1);
        const contact = contactRows[0];

        if (!contact) {
          throw new Error('Contact not found');
        }

        // Insert into archived_emails table
        const result = await db.insert(archivedEmails).values({
          emailId: input.emailData.messageId,
          contactId: input.contactId,
          userId: userId,
          folder: input.emailData.folder,
          fromAddress: input.emailData.from,
          fromName: input.emailData.fromName || '',
          toAddress: input.emailData.to,
          ccAddress: input.emailData.cc || '',
          subject: input.emailData.subject,
          body: input.emailData.bodyText || '',
          htmlBody: input.emailData.bodyHtml || '',
          emailDate: new Date(input.emailData.date),
          notes: input.notes || '',
        });

        const archivedEmailId = (result as any).insertId;

        // Handle attachments if present
        if (input.emailData.attachments && input.emailData.attachments.length > 0) {
          for (const att of input.emailData.attachments) {
            const attachmentId = crypto.randomUUID();
            
            // Check size: < 5MB = Base64 in DB, >= 5MB = File system
            const SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
            
            if (att.size < SIZE_LIMIT) {
              // Store small attachments as Base64 in filePath
              const fileName = `${attachmentId}_${att.filename}`;
              const filePath = `base64://${att.content}`;
              
              await db.insert(attachments).values({
                id: attachmentId,
                activityId: `archived_email_${archivedEmailId}`, // Link to archived email
                fileName: fileName,
                originalFileName: att.filename,
                filePath: filePath,
                fileSize: att.size,
                mimeType: att.contentType,
              });
            } else {
              // Store large attachments in file system
              const fileName = `${attachmentId}_${att.filename}`;
              const filePath = path.join(ATTACHMENT_DIR, fileName);
              
              // Decode Base64 and write to file
              const buffer = Buffer.from(att.content, 'base64');
              fs.writeFileSync(filePath, buffer);
              
              // Store file path in DB
              const relativePath = path.relative(process.cwd(), filePath);
              await db.insert(attachments).values({
                id: attachmentId,
                activityId: `archived_email_${archivedEmailId}`, // Link to archived email
                fileName: fileName,
                originalFileName: att.filename,
                filePath: relativePath,
                fileSize: att.size,
                mimeType: att.contentType,
              });
            }
          }
        }

        return { 
          success: true, 
          archivedEmailId: archivedEmailId.toString(),
          message: 'Email archived successfully',
        };
      } catch (error: any) {
        console.error('[archiveRouter] Error archiving email:', error);
        throw new Error(`Failed to archive email: ${error.message}`);
      }
    }),

  /**
   * Search contacts by email
   */
  searchContactsByEmail: protectedProcedure
    .input(
      z.object({
        email: z.string(),
      })
    )
    .query(async ({ input }) => {
      const searchPattern = `%${input.email}%`;
      
      const dbInst = await getDb();
      if (!dbInst) throw new Error('Database not available');
      const results = await dbInst.select().from(contacts).where(
        or(
          like(contacts.email, searchPattern),
          like(contacts.email2, searchPattern),
          like(contacts.email3, searchPattern),
          like(contacts.email4, searchPattern),
          like(contacts.email5, searchPattern)
        )
      ).limit(10);

      return { contacts: results };
    }),

  /**
   * Extract contact info from email using LLM
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
              content: `Extract contact information from email signature. Return ONLY a JSON object with: firstName, lastName, email, jobTitle, company, phone. Set to null if not found.`
            },
            {
              role: 'user',
              content: `From: ${input.fromName || input.fromAddress}\nEmail: ${input.fromAddress}\n\n${input.emailBody}`
            }
          ],
          temperature: 0.3,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from LLM');
        }

        const extracted = JSON.parse(content);
        
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
        
        // Fallback
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

  /**
   * Create new contact
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
    .mutation(async ({ input }) => {
      const contactId = crypto.randomUUID();
      
      const dbInst2 = await getDb();
      if (!dbInst2) throw new Error('Database not available');
      await dbInst2.insert(contacts).values({
        id: contactId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        jobTitle: input.jobTitle || '',
        phone: input.phone || '',
      } as any);

      return { contactId };
    }),
  /**
   * Download an archived email attachment
   * Returns the file content as base64 or a signed URL
   */
  downloadAttachment: protectedProcedure
    .input(z.object({ attachmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get attachment metadata
      const [attachment] = await db
        .select()
        .from(archivedEmailAttachments)
        .where(eq(archivedEmailAttachments.id, input.attachmentId))
        .limit(1);

      if (!attachment) {
        throw new Error("Attachment not found");
      }

      // Verify the user has access (the archived email must belong to a contact
      // accessible by this user – for now we check the email exists)
      const [archivedEmail] = await db
        .select()
        .from(archivedEmails)
        .where(eq(archivedEmails.id, attachment.archivedEmailId))
        .limit(1);

      if (!archivedEmail) {
        throw new Error("Archived email not found");
      }

      // Check if file exists on disk
      const filePath = attachment.filePath;
      const fs = await import("fs/promises");
      try {
        await fs.access(filePath);
      } catch {
        throw new Error("Attachment file not found on disk");
      }

      // Read file and return as base64
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString("base64");

      return {
        filename: attachment.filename,
        contentType: attachment.contentType || "application/octet-stream",
        sizeBytes: attachment.sizeBytes,
        content: base64Content,
      };
    }),

});
