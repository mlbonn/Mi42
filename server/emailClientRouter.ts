import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import axios from 'axios';
import https from 'https';
import { sql } from 'drizzle-orm';
import * as db from './db';


// SmarterMail API Base URL
const SMARTERMAIL_BASE_URL = 'https://smartermail.digishop.de';

// Create HTTPS agent that ignores SSL errors (dev only)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Authenticate and get token
async function authenticateSmarterMail(email: string, password: string) {
  try {
    const response = await axios.post(`${SMARTERMAIL_BASE_URL}/api/v1/auth/authenticate-user`, {
      username: email,
      password: password,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      httpsAgent,
    });
    return response.data.accessToken;
  } catch (error: any) {
    console.error('SmarterMail Auth Error:', error.response?.data || error.message);
    throw new Error('Authentication failed');
  }
}

// Folder Mapping: Frontend folder name -> SmarterMail folder name
const FOLDER_MAP: Record<string, string> = {
  'INBOX': 'Inbox',
  'Sent': 'Sent Items',
  'Drafts': 'Drafts',
  'Trash': 'Deleted Items',
  'Spam': 'Junk E-Mail',
};
/**
 * Extract email addresses from SmarterMail API response
 * Handles both single objects and arrays of email objects
 */
function extractEmailAddresses(emailData: any): string[] {
  if (!emailData) return [];
  
  // Single email object: { email: "test@example.com", name: "Test User" }
  if (typeof emailData === 'object' && !Array.isArray(emailData)) {
    return emailData.email ? [emailData.email] : [];
  }
  
  // Array of email objects
  if (Array.isArray(emailData)) {
    return emailData
      .map((item: any) => typeof item === 'object' ? item.email : item)
      .filter((email: any) => email && typeof email === 'string');
  }
  
  // Plain string
  if (typeof emailData === 'string') {
    return [emailData];
  }
  
  return [];
}

/**
 * Format email addresses array to comma-separated string
 * Max length 500 chars for database field
 */
function formatEmailAddresses(addresses: string[]): string {
  const joined = addresses.join(', ');
  return joined.length > 500 ? joined.substring(0, 497) + '...' : joined;
}
export const emailClientRouter = router({
  getEmails: protectedProcedure
    .input(
      z.object({
        folder: z.string().default('INBOX'),
        skip: z.number().default(0),
        take: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Get email accounts for current user
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const accounts = await db.getEmailAccounts(userId);
        
 
       if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured for this user');
        }
        
        // Use primary account or first active account
        const account = accounts.find(a => a.isPrimary) || accounts[0];
        
        // Authenticate with SmarterMail using new account structure
        const token = await authenticateSmarterMail(account.emailAddress, account.passwordEncrypted);
        
        const serverUrl = account.serverUrl || 'https://mail.bl2020.com';
        
        // Map folder name
        const smarterMailFolder = FOLDER_MAP[input.folder] || input.folder;
        
        console.log(`Fetching emails from folder: ${smarterMailFolder} (original: ${input.folder})`);
        
        // Get messages from SmarterMail API
        const response = await axios.post(
          `${serverUrl}/api/v1/mail/messages`,
          {
            folder: smarterMailFolder,
            ownerEmailAddress: account.emailAddress,
            query: '',
            skip: input.skip,
            take: input.take,
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          }
        );
        console.log(`Got ${response.data.results?.length || 0} emails from ${smarterMailFolder}`);
        
        // Transform to frontend format
        const emails = (response.data.results || []).map((msg: any) => ({
          id: msg.uid?.toString() || '',
          from: msg.fromAddress || '',
          fromName: msg.from || '',
          to: (msg.recipients || []).map((r: any) => r.email || r).join(', '),
          subject: msg.subject || '(No Subject)',
          date: msg.dateSent || new Date().toISOString(),
          isRead: !msg.isSeen, // SmarterMail: isSeen=true means read, so invert for isRead
          hasAttachments: msg.hasAttachments || false,
          folder: input.folder,
          size: msg.size || 0,
        }));
        
        return {
          emails,
          totalCount: response.data.totalCount || emails.length,
          unreadCount: response.data.unreadCount || 0,
        };
      } catch (error: any) {
        console.error('Email list error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch emails: ${error.message}`);
      }
    }),

  getEmail: protectedProcedure
    .input(
      z.object({
        folder: z.string(),
        uid: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Get email accounts for current user
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const accounts = await db.getEmailAccounts(userId);
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured for this user');
        }
        
        // Use primary account or first active account
        const account = accounts.find(a => a.isPrimary) || accounts[0];
        
        // Authenticate
        const token = await authenticateSmarterMail(account.emailAddress, account.passwordEncrypted);
        
        const serverUrl = account.serverUrl || 'https://mail.bl2020.com';
        
        // Map folder name
        const smarterMailFolder = FOLDER_MAP[input.folder] || input.folder;
        
        console.log(`Fetching email ${input.uid} from folder: ${smarterMailFolder}`);
        
        // Get single message with body
        const response = await axios.post(
          `${serverUrl}/api/v1/mail/message`,
          {
            folder: smarterMailFolder,
            uid: input.uid,
            ownerEmailAddress: account.emailAddress,
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          }
        );
        
        const msg = response.data.messageData;
        
        if (!msg) {
          throw new Error('Message not found');
        }
        
        return {
          id: msg.uid?.toString() || '',
          from: msg.fromAddress || '',
          fromName: msg.from || '',
          to: Array.isArray(msg.toAddresses) ? msg.toAddresses.map((addr: any) => addr.email || addr).join(', ') : (msg.to || ''),
          toAddresses: msg.toAddresses || [],
          subject: msg.subject || '(No Subject)',
          date: msg.date || new Date().toISOString(),
          body: msg.messagePlainText || '',
          html: msg.messageHTML || '',
          attachments: (msg.attachments || []).map((att: any) => ({
            filename: att.filename,
            size: att.size,
            type: att.type,
            link: `${SMARTERMAIL_BASE_URL}${att.link}`,
            partID: att.partID,
          })),
          folder: msg.folder,
          size: msg.size || 0,
          hasAttachments: (msg.attachments || []).length > 0,
        };
      } catch (error: any) {
        console.error('Get email error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch email: ${error.message}`);
      }
    }),

  sendEmail: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
        replyToMessageId: z.string().optional(),
        forwardMessageId: z.string().optional(),
        attachments: z.array(z.object({
          filename: z.string(),
          originalname: z.string(),
          path: z.string(),
          size: z.number(),
          mimetype: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get email account
        const accounts = await db.getEmailAccounts();
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured');
        }
        
        const account = accounts[0];
        
        // Authenticate
        const token = await authenticateSmarterMail(account.imapUser, account.imapPassword);
        
        // Upload attachments to SmarterMail if any
        const attachmentGuids: string[] = [];
        if (input.attachments && input.attachments.length > 0) {
          const FormData = (await import('form-data')).default;
          const fs = await import('fs');
          
          for (const attachment of input.attachments) {
            try {
              const formData = new FormData();
              formData.append('file', fs.createReadStream(attachment.path), {
                filename: attachment.originalname,
                contentType: attachment.mimetype,
              });
              
              const uploadResponse = await axios.post(
                `${SMARTERMAIL_BASE_URL}/api/v1/mail/attachment-upload`,
                formData,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders(),
                  },
                  httpsAgent,
                }
              );
              
              if (uploadResponse.data && uploadResponse.data.attachmentGuid) {
                attachmentGuids.push(uploadResponse.data.attachmentGuid);
              }
              
              // Clean up temp file
              fs.unlinkSync(attachment.path);
            } catch (uploadError: any) {
              console.error('[ATTACHMENT UPLOAD ERROR]', uploadError.response?.data || uploadError.message);
              // Continue with other attachments even if one fails
            }
          }
        }
        
        // Send message with attachments
        const emailData: any = {
          from: { email: account.imapUser },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlBody: input.body,
          isHtml: true,
          replyToMessageId: input.replyToMessageId,
          forwardMessageId: input.forwardMessageId,
        };
        
        if (attachmentGuids.length > 0) {
          emailData.attachmentGuids = attachmentGuids;
        }
        
        await axios.post(
          `${SMARTERMAIL_BASE_URL}/api/v1/mail/message-put`,
          emailData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          }
        );
        
        return { success: true, attachmentCount: attachmentGuids.length };
      } catch (error: any) {
        console.error('Send email error:', error.response?.data || error.message);
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }),

  moveEmail: protectedProcedure
    .input(
      z.object({
        messageIds: z.array(z.string()),
        targetFolder: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get email account
        const accounts = await db.getEmailAccounts();
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured');
        }
        
        const account = accounts[0];
        
        // Authenticate
        const token = await authenticateSmarterMail(account.imapUser, account.imapPassword);
        
        // Map folder name
        const smarterMailFolder = FOLDER_MAP[input.targetFolder] || input.targetFolder;
        
        // Move messages
        await axios.post(
          `${SMARTERMAIL_BASE_URL}/api/v1/mail/messages-move`,
          {
            messageIds: input.messageIds.map(id => parseInt(id)),
            targetFolder: smarterMailFolder,
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          }
        );
        
        return { success: true };
      } catch (error: any) {
        console.error('Move email error:', error.response?.data || error.message);
        throw new Error(`Failed to move email: ${error.message}`);
      }
    }),

  archiveEmail: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        contactId: z.string(),
        notes: z.string().optional(),
        // Email data from frontend
        fromAddress: z.string(),
        fromName: z.string().optional(),
        toAddress: z.string(),
        ccAddress: z.string().optional(),
        subject: z.string(),
        body: z.string().optional(),
        htmlBody: z.string().optional(),
        emailDate: z.string().optional(),
        attachments: z.array(z.object({
          filename: z.string(),
          type: z.string(),
          size: z.number(),
          link: z.string(), // SmarterMail download link
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Use email data from frontend (no IMAP call needed)
        const fromAddress = input.fromAddress;
        const fromName = input.fromName || '';
        const toAddressString = input.toAddress;
        const ccAddressString = input.ccAddress || '';

        console.log('📧 Archiving email:', {
          emailId: input.emailId,
          from: fromAddress,
          to: toAddressString,
          cc: ccAddressString,
          subject: input.subject
        });
        
        // Insert into archived_emails table using raw SQL
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new Error('Database not available');
        }
        
        const insertResult = await dbInstance.execute(
          sql`INSERT INTO archived_emails 
           (email_id, contact_id, user_id, folder, from_address, from_name, to_address, cc_address, subject, body, html_body, email_date, notes) 
           VALUES (
             ${input.emailId}, 
             ${input.contactId}, 
             ${userId}, 
             'INBOX', 
             ${fromAddress}, 
             ${fromName}, 
             ${toAddressString}, 
             ${ccAddressString}, 
             ${input.subject || ''}, 
             ${input.body || ''}, 
             ${input.htmlBody || ''}, 
             ${input.emailDate ? new Date(input.emailDate) : new Date()}, 
             ${input.notes || ''}
           )`
        );
        
        // Get the inserted ID
        const archivedEmailId = (insertResult as any).insertId || (insertResult as any)[0]?.insertId;
        
        // Save attachments if provided
        if (input.attachments && input.attachments.length > 0 && archivedEmailId) {
          const fs = await import('fs/promises');
          const path = await import('path');
          
          const attachmentsDir = `/home/manus02/friday-crm/attachments/${archivedEmailId}`;
          await fs.mkdir(attachmentsDir, { recursive: true });
          
          for (const attachment of input.attachments) {
            try {
              // Download attachment from SmarterMail server
              const response = await fetch(attachment.link);
              if (!response.ok) {
                throw new Error(`Failed to download attachment: ${response.statusText}`);
              }
              
              const buffer = Buffer.from(await response.arrayBuffer());
              const filePath = path.join(attachmentsDir, attachment.filename);
              await fs.writeFile(filePath, buffer);
              
              // Save attachment metadata to DB
              await dbInstance.execute(
                sql`INSERT INTO archived_email_attachments 
                 (archived_email_id, filename, content_type, size_bytes, file_path) 
                 VALUES (
                   ${archivedEmailId}, 
                   ${attachment.filename}, 
                   ${attachment.type}, 
                   ${attachment.size}, 
                   ${filePath}
                 )`
              );
              
              console.log(`✅ Saved attachment: ${attachment.filename} (${attachment.size} bytes)`);
            } catch (err) {
              console.error(`❌ Error saving attachment ${attachment.filename}:`, err);
            }
          }
        }
        
        console.log(`Email ${input.emailId} archived for contact ${input.contactId}`);
        
        return { success: true };
      } catch (error: any) {
        console.error('Archive email error:', error.response?.data || error.message);
        throw new Error(`Failed to archive email: ${error.message}`);
      }
    }),

  // NEW: Find contacts by email addresses
  findContactsByEmails: protectedProcedure
    .input(z.object({
      emails: z.array(z.string().email())
    }))
    .query(async ({ input, ctx }) => {
      console.log('[findContactsByEmails] Called with emails:', input.emails);
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Not authenticated");
      
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error("DB not available");
      
      const result: Record<string, Array<{id: number, name: string, email: string}>> = {};
      
      for (const email of input.emails) {
        console.log('[findContactsByEmails] Searching for email:', email);
        // Search in all email fields of contacts table
        console.log('[findContactsByEmails] About to execute query for:', email);
        const contacts = await dbInstance.execute(
          sql`SELECT id, firstName, lastName, email, email2, email3, email4, email5 
              FROM contacts
              WHERE email = ${email} OR email2 = ${email} OR email3 = ${email} OR email4 = ${email} OR email5 = ${email}
              LIMIT 10`
        );
        console.log('[findContactsByEmails] Query executed, result:', contacts);
        
        const foundContacts: Array<{id: number, name: string, email: string}> = [];
        // Drizzle returns [[{...}]] format
        const rows = Array.isArray(contacts) && contacts.length > 0 ? contacts[0] : [];
        console.log('[findContactsByEmails] Query result rows:', rows.length);
        
        if (rows && rows.length > 0) {
          for (const row of rows) {
            const r = row as any;
            foundContacts.push({
              id: r.id,  // Keep as UUID string
              name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
              email: email
            });
          }
        }
        
        result[email] = foundContacts;
        console.log('[findContactsByEmails] Found contacts for', email, ':', foundContacts.length);
      }
      
      console.log('[findContactsByEmails] Final result:', result);
      return result;
    }),

  // Delete email from IMAP folder
  deleteEmail: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        folder: z.string().default('INBOX'),
        messageUid: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const account = await getEmailAccount(input.accountId);
        if (!account) {
          throw new Error('Email account not found');
        }

        const client = await connectToImap(account);
        const lock = await client.getMailboxLock(input.folder);

        try {
          // Delete the message
          await client.messageDelete(input.messageUid, { uid: true });
          console.log(`[deleteEmail] Deleted message ${input.messageUid} from ${input.folder}`);
          return { success: true, message: 'Email deleted successfully' };
        } finally {
          lock.release();
          await client.logout();
        }
      } catch (error: any) {
        console.error('[deleteEmail] Error:', error);
        throw new Error(`Failed to delete email: ${error.message}`);
      }
    }),
});
