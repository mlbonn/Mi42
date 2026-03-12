import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import axios from 'axios';
import https from 'https';
import { sql } from 'drizzle-orm';
import * as db from './db';
import { getSmarterMailClient } from './smartermailClient';
import * as path from 'path';


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
            } catch (err) {
              console.error('Attachment upload error:', err);
            }
          }
        }
        
        // Send email
        const response = await axios.post(
          `${SMARTERMAIL_BASE_URL}/api/v1/mail/send-message`,
          {
            to: input.to,
            subject: input.subject,
            body: input.body,
            attachmentGuids: attachmentGuids,
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
        console.error('Send email error:', error.response?.data || error.message);
        throw new Error(`Failed to send email: ${error.message}`);
      }
    }),

  moveEmail: protectedProcedure
    .input(
      z.object({
        folder: z.string(),
        uid: z.string(),
        targetFolder: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        const accounts = await db.getEmailAccounts(userId);
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured');
        }
        
        const account = accounts.find(a => a.isPrimary) || accounts[0];
        const token = await authenticateSmarterMail(account.emailAddress, account.passwordEncrypted);
        const serverUrl = account.serverUrl || 'https://mail.bl2020.com';
        
        const sourceFolder = FOLDER_MAP[input.folder] || input.folder;
        const destFolder = FOLDER_MAP[input.targetFolder] || input.targetFolder;
        
        console.log(`Moving email ${input.uid} from ${sourceFolder} to ${destFolder}`);
        
        const response = await axios.post(
          `${serverUrl}/api/v1/mail/move`,
          {
            folder: sourceFolder,
            destinationFolder: destFolder,
            uids: [parseInt(input.uid)],
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
        folder: z.string().default('INBOX'),
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
          subject: input.subject,
          attachmentsCount: input.attachments?.length || 0
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
        
        console.log(`✅ Email archived with ID: ${archivedEmailId}`);
        
        // Save attachments if provided
        if (input.attachments && input.attachments.length > 0 && archivedEmailId) {
          console.log(`📎 Processing ${input.attachments.length} attachment(s)...`);
          
          // Get email account for authentication
          const accounts = await db.getEmailAccounts(userId);
          if (!accounts || accounts.length === 0) {
            console.error('❌ No email account found for attachment download');
            throw new Error('No email account configured');
          }
          
          const account = accounts.find(a => a.isPrimary) || accounts[0];
          const serverUrl = account.serverUrl || 'https://mail.bl2020.com';
          
          // Get SmarterMail client
          const smartermailClient = getSmarterMailClient(serverUrl);
          
          // Create attachments directory
          const attachmentsDir = `/home/manus02/friday-crm/email-attachments/${archivedEmailId}`;
          const fs = await import('fs/promises');
          await fs.mkdir(attachmentsDir, { recursive: true });
          
          // Save email metadata as JSON
          const emailMetadata = {
            archivedEmailId: archivedEmailId,
            emailId: input.emailId,
            contactId: input.contactId,
            from: fromAddress,
            fromName: fromName,
            to: toAddressString,
            cc: ccAddressString,
            subject: input.subject,
            body: input.body,
            htmlBody: input.htmlBody,
            emailDate: input.emailDate,
            folder: input.folder,
            notes: input.notes,
            attachments: input.attachments.map(att => ({
              filename: att.filename,
              type: att.type,
              size: att.size,
              localPath: path.join(attachmentsDir, att.filename)
            })),
            archivedAt: new Date().toISOString()
          };
          
          await fs.writeFile(
            path.join(attachmentsDir, 'email.json'),
            JSON.stringify(emailMetadata, null, 2)
          );
          console.log(`✅ Saved email.json metadata`);
          
          // Download each attachment
          let successCount = 0;
          for (const attachment of input.attachments) {
            try {
              console.log(`📥 Downloading: ${attachment.filename} (${attachment.size} bytes)`);
              
              // Download attachment using SmarterMail client with authentication
              const saved = await smartermailClient.downloadAndSaveAttachment(
                attachment,
                path.join(attachmentsDir, attachment.filename),
                account.emailAddress,
                account.passwordEncrypted
              );
              
              // Save attachment metadata to DB
              await dbInstance.execute(
                sql`INSERT INTO archived_email_attachments 
                 (archived_email_id, filename, content_type, size_bytes, file_path) 
                 VALUES (
                   ${archivedEmailId}, 
                   ${attachment.filename}, 
                   ${attachment.type}, 
                   ${attachment.size}, 
                   ${saved.filepath}
                 )`
              );
              
              successCount++;
              console.log(`✅ Saved attachment: ${attachment.filename} (${saved.size} bytes)`);
            } catch (err: any) {
              console.error(`❌ Error saving attachment ${attachment.filename}:`, err.message);
              // Continue with other attachments even if one fails
            }
          }
          
          console.log(`✅ Successfully saved ${successCount}/${input.attachments.length} attachments`);
        }
        
        console.log(`✅ Email ${input.emailId} fully archived for contact ${input.contactId}`);
        
        return { 
          success: true,
          archivedEmailId: archivedEmailId,
          attachmentsCount: input.attachments?.length || 0
        };
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

  // Search emails with advanced filters
  searchMessages: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      sender: z.string().optional(),
      folder: z.string().default('INBOX'),
      skip: z.number().default(0),
      take: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) throw new Error('User not authenticated');
        
        const accounts = await db.getEmailAccounts(userId);
        if (!accounts || accounts.length === 0) {
          return { messages: [], total: 0 };
        }
        
        const account = accounts[0];
        const client = await getSmarterMailClient(
          account.email,
          account.password
        );
        
        // Build search criteria
        const searchCriteria: any = {
          folder: FOLDER_MAP[input.folder] || input.folder,
          searchFields: 0,
        };
        
        if (input.query) {
          searchCriteria.searchText = input.query;
          searchCriteria.searchFields = 1 | 2 | 4 | 8;
        }
        
        if (input.sender) {
          searchCriteria.from = input.sender;
          searchCriteria.searchFields |= 1;
        }
        
        if (input.dateFrom) {
          searchCriteria.startDate = input.dateFrom;
        }
        if (input.dateTo) {
          searchCriteria.endDate = input.dateTo;
        }
        
        searchCriteria.skip = input.skip;
        searchCriteria.take = input.take;
        
        const token = await client.getToken();
        const response = await axios.post(
          `${SMARTERMAIL_BASE_URL}/api/v1/mail/search-messages`,
          searchCriteria,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          }
        );
        
        return {
          messages: response.data.messages || [],
          total: response.data.totalCount || 0,
        };
      } catch (error: any) {
        console.error('Search messages error:', error.response?.data || error.message);
        throw new Error(`Failed to search messages: ${error.message}`);
      }
    }),

  // Send email
  sendMessage: protectedProcedure
    .input(z.object({
      to: z.array(z.string().email()),
      cc: z.array(z.string().email()).optional(),
      bcc: z.array(z.string().email()).optional(),
      subject: z.string(),
      body: z.string(),
      htmlBody: z.string().optional(),
      inReplyTo: z.string().optional(),
      references: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) throw new Error('User not authenticated');
        
        const accounts = await db.getEmailAccounts(userId);
        if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured');
        }
        
        const account = accounts[0];
        const client = await getSmarterMailClient(
          account.email,
          account.password
        );
        
        const messageData: any = {
          to: input.to.map(email => ({ email })),
          subject: input.subject,
          textBody: input.body,
        };
        
        if (input.cc && input.cc.length > 0) {
          messageData.cc = input.cc.map(email => ({ email }));
        }
        
        if (input.bcc && input.bcc.length > 0) {
          messageData.bcc = input.bcc.map(email => ({ email }));
        }
        
        if (input.htmlBody) {
          messageData.htmlBody = input.htmlBody;
        }
        
        if (input.inReplyTo) {
          messageData.inReplyTo = input.inReplyTo;
        }
        
        if (input.references) {
          messageData.references = input.references;
        }
        
        const token = await client.getToken();
        const response = await axios.post(
          `${SMARTERMAIL_BASE_URL}/api/v1/mail/send-message`,
          messageData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            httpsAgent,
          }
        );
        
        console.log('[sendMessage] Email sent successfully');
        return { success: true, messageId: response.data.messageId };
      } catch (error: any) {
        console.error('Send message error:', error.response?.data || error.message);
        throw new Error(`Failed to send message: ${error.message}`);
      }
    }),

  // Get email templates
  getEmailTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) throw new Error('User not authenticated');
        
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error('DB not available');
        
        const templates = await dbInstance.execute(
          sql`SELECT id, name, subject, body, htmlBody, createdAt 
              FROM email_templates
              WHERE userId = ${userId}
              ORDER BY createdAt DESC`
        );
        
        const rows = Array.isArray(templates) && templates.length > 0 ? templates[0] : [];
        return rows;
      } catch (error: any) {
        console.error('Get templates error:', error);
        throw new Error(`Failed to get templates: ${error.message}`);
      }
    }),

  // Save email template
  saveEmailTemplate: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      name: z.string(),
      subject: z.string(),
      body: z.string(),
      htmlBody: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) throw new Error('User not authenticated');
        
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new Error('DB not available');
        
        if (input.id) {
          await dbInstance.execute(
            sql`UPDATE email_templates 
                SET name = ${input.name}, 
                    subject = ${input.subject}, 
                    body = ${input.body}, 
                    htmlBody = ${input.htmlBody || null}
                WHERE id = ${input.id} AND userId = ${userId}`
          );
          return { success: true, id: input.id };
        } else {
          const result = await dbInstance.execute(
            sql`INSERT INTO email_templates (userId, name, subject, body, htmlBody, createdAt)
                VALUES (${userId}, ${input.name}, ${input.subject}, ${input.body}, ${input.htmlBody || null}, NOW())`
          );
          return { success: true, id: result.insertId };
        }
      } catch (error: any) {
        console.error('Save template error:', error);
        throw new Error(`Failed to save template: ${error.message}`);
      }
    }),

  // Generate AI reply
  generateAIReply: protectedProcedure
    .input(z.object({
      originalMessage: z.object({
        from: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
      context: z.string().optional(),
      tone: z.enum(['professional', 'friendly', 'formal']).default('professional'),
    }))
    .mutation(async ({ input }) => {
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        const toneInstructions = {
          professional: 'Write in a professional, business-appropriate tone.',
          friendly: 'Write in a friendly, warm tone while maintaining professionalism.',
          formal: 'Write in a formal, respectful tone suitable for official correspondence.',
        };
        
        const prompt = `You are an AI assistant helping to write email replies.

Original Email:
From: ${input.originalMessage.from}
Subject: ${input.originalMessage.subject}
Body: ${input.originalMessage.body}

${input.context ? `Additional Context: ${input.context}` : ''}

Please generate a professional reply to this email. ${toneInstructions[input.tone]}

Requirements:
- Keep it concise and to the point
- Address the main points from the original email
- Use appropriate greeting and closing
- Write in the same language as the original email

Generate only the email body, without subject line.`;
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a professional email assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });
        
        const generatedReply = completion.choices[0]?.message?.content || '';
        
        return {
          success: true,
          reply: generatedReply,
        };
      } catch (error: any) {
        console.error('Generate AI reply error:', error);
        throw new Error(`Failed to generate AI reply: ${error.message}`);
      }
    }),
  // Get list of email folders
  getFolders: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userEmail = ctx.user.email;
        console.log(`[emailClientRouter] Getting folders for ${userEmail}`);
        const folders = await getEmailFolders(userEmail);
        return folders;
      } catch (error: any) {
        console.error('[emailClientRouter] Error getting folders:', error.message);
        return ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
      }
    }),
  extractContactFromSignature: protectedProcedure
    .input(z.object({
      emailBody: z.string(),
      fromAddress: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      console.log('[extractContactFromSignature] Extracting contact from email body');
      
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Remove HTML tags for cleaner parsing
        const cleanBody = input.emailBody
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const prompt = `Extract contact information from the following email signature. Return ONLY a JSON object with these fields:
- firstName: string (first name)
- lastName: string (last name)
- company: string (company name)
- title: string (job title)
- phone: string (phone number)
- email: string (email address, use "${input.fromAddress}" if not found in signature)

If a field is not found, use an empty string. Do not include any explanation, only the JSON object.

Email content:
${cleanBody.slice(-1000)}`;

        console.log('[extractContactFromSignature] Calling OpenAI API...');
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a contact information extraction assistant. Extract contact details from email signatures and return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content || '{}';
        console.log('[extractContactFromSignature] OpenAI response:', content);

        // Parse JSON response
        let extractedData;
        try {
          // Remove markdown code blocks if present
          const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          extractedData = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error('[extractContactFromSignature] JSON parse error:', parseError);
          extractedData = {};
        }

        // Ensure email is set
        if (!extractedData.email) {
          extractedData.email = input.fromAddress;
        }

        // Build result with defaults
        const result = {
          firstName: extractedData.firstName || '',
          lastName: extractedData.lastName || '',
          company: extractedData.company || '',
          title: extractedData.title || '',
          phone: extractedData.phone || '',
          email: extractedData.email || input.fromAddress,
          confidence: extractedData.firstName && extractedData.lastName ? 'high' : 'low',
        };

        console.log('[extractContactFromSignature] Extracted contact:', result);
        return result;
      } catch (error: any) {
        console.error('[extractContactFromSignature] Error:', error);
        
        // Return fallback with email only
        return {
          firstName: '',
          lastName: '',
          company: '',
          title: '',
          phone: '',
          email: input.fromAddress,
          confidence: 'none',
        };
      }
    }),
});
