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
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error('User not authenticated');
        }
        
        // Get email accounts
        const accounts = await db.getEmailAccounts(userId);
        if (!accounts || accounts.length === 0) {
          throw new Error('No email account configured');
        }
        
        const account = accounts[0];
        const token = await authenticateSmarterMail(account.emailAddress, account.passwordEncrypted);
        const serverUrl = account.serverUrl || 'https://mail.bl2020.com';
        
        // Fetch full email details
        const response = await axios.post(
          `${serverUrl}/api/v1/mail/message`,
          {
            messageId: parseInt(input.emailId),
            folder: 'Inbox',
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
        
        const email = response.data;
        
        // Extract sender info
        const fromAddress = typeof email.from === 'object' ? email.from.email : email.from;
        const fromName = typeof email.from === 'object' ? email.from.name : '';
        const toAddress = typeof email.to === 'object' ? email.to.email : email.to;
        
        // Insert into archived_emails table using raw SQL
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new Error('Database not available');
        }
        
        await dbInstance.execute(
          sql`INSERT INTO archived_emails 
           (email_id, contact_id, user_id, folder, from_address, from_name, to_address, subject, body, html_body, email_date, notes) 
           VALUES (${input.emailId}, ${input.contactId}, ${userId}, 'INBOX', ${fromAddress}, ${fromName}, ${toAddress}, ${email.subject || ''}, ${email.textBody || ''}, ${email.htmlBody || ''}, ${email.date ? new Date(email.date) : new Date()}, ${input.notes || ''})`
        );
        
        console.log(`Email ${input.emailId} archived for contact ${input.contactId}`);
        
        return { success: true };
      } catch (error: any) {
        console.error('Archive email error:', error.response?.data || error.message);
        throw new Error(`Failed to archive email: ${error.message}`);
      }
    }),
});
