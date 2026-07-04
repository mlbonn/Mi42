import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Demo emails for fallback
const DEMO_EMAILS = {
  INBOX: [
    {
      id: '1',
      from: 'john@example.com',
      to: 'testFRIDAY1@bl2020.com',
      subject: 'Welcome to FRIDAY CRM',
      preview: 'Thanks for signing up! Here are your first steps...',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      body: 'Welcome to FRIDAY CRM! We are excited to have you on board.',
    },
    {
      id: '2',
      from: 'sales@company.com',
      to: 'testFRIDAY1@bl2020.com',
      subject: 'New Lead: Acme Corporation',
      preview: 'A new lead has been assigned to you...',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      body: 'A new sales lead has been assigned to your account.',
    },
    {
      id: '3',
      from: 'support@vendor.com',
      to: 'testFRIDAY1@bl2020.com',
      subject: 'Your Support Ticket #12345',
      preview: 'Your support ticket has been updated...',
      date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      body: 'Your support ticket has been updated with a response.',
    },
  ],
  Drafts: [
    {
      id: '4',
      from: 'testFRIDAY1@bl2020.com',
      to: 'client@example.com',
      subject: 'Project Proposal',
      preview: 'Here is the project proposal you requested...',
      date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      body: 'Here is the project proposal for your review.',
    },
  ],
  Sent: [
    {
      id: '5',
      from: 'testFRIDAY1@bl2020.com',
      to: 'manager@company.com',
      subject: 'Meeting Confirmation',
      preview: 'Thanks for scheduling the meeting...',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      body: 'Thank you for confirming the meeting for tomorrow at 2 PM.',
    },
  ],
  Trash: [],
  Spam: [],
};

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  preview: string;
  date: string;
  body: string;
  html?: boolean;
}

export async function getIMAPCredentialsForUser(
  userEmail: string
): Promise<{ email: string; password: string } | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.log('[EmailService] Database not available');
      return null;
    }

    // Find user by email
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail));

    if (!userList || userList.length === 0) {
      console.log(
        `[EmailService] User ${userEmail} not found in database`
      );
      return null;
    }

    const user = userList[0];

    if (!user.caldavEmail || !user.caldavPassword) {
      console.log(
        `[EmailService] No IMAP credentials found for user ${userEmail}`
      );
      return null;
    }

    // Read password in plaintext (already stored plaintext in database)
    const password = user.caldavPassword;

    console.log(
      `[EmailService] Using IMAP credentials for ${user.caldavEmail}`
    );

    return {
      email: user.caldavEmail,
      password: password,
    };
  } catch (error) {
    console.error(
      `[EmailService] Error getting IMAP credentials for ${userEmail}:`,
      error
    );
    return null;
  }
}

export async function fetchEmailsViaIMAP(
  userEmail: string,
  folder: string = 'INBOX'
): Promise<Email[]> {
  let client: ImapFlow | null = null;

  try {
    console.log(
      `[EmailService] Fetching emails from IMAP for ${userEmail} in ${folder}`
    );

    // Get credentials
    const credentials = await getIMAPCredentialsForUser(userEmail);

    if (!credentials || !credentials.email) {
      console.log(
        `[EmailService] No credentials found, using demo emails for ${folder}`
      );
      return DEMO_EMAILS[folder as keyof typeof DEMO_EMAILS] || [];
    }

    try {
      // Create IMAP client
      console.log(
        `[EmailService] Creating IMAP connection for ${credentials.email} at mail.bl2020.com`
      );

      client = new ImapFlow({
        host: 'mail.bl2020.com',
        port: 993,
        secure: true,
        auth: {
          user: credentials.email,
          pass: credentials.password,
        },
        logger: false,
        emitLogs: false,
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Connect to IMAP server
      await client.connect();
      console.log(
        `[EmailService] IMAP connection successful for ${credentials.email}`
      );

      // Select mailbox
      const mailbox = await client.mailboxOpen(folder);
      console.log(
        `[EmailService] Opened mailbox ${folder} with ${mailbox.exists} messages`
      );

      // Fetch recent emails (last 20)
      const emails: Email[] = [];
      const limit = Math.min(20, mailbox.exists);

      if (limit > 0) {
        // Fetch from the end (most recent first)
        const startSeq = Math.max(1, mailbox.exists - limit + 1);

        for await (const message of client.fetch(`${startSeq}:*`, {
          envelope: true,
          source: true,
        })) {
          try {
            const parsed = await simpleParser(message.source as any);

            const email: Email = {
              id: message.uid.toString(),
              from: parsed.from?.text || 'Unknown',
              to: parsed.to?.text || credentials.email,
              subject: parsed.subject || '(no subject)',
              preview: (parsed.text || parsed.html || '').substring(0, 100),
              date: (parsed.date || new Date()).toISOString(),
              body: parsed.html || parsed.text || '',
              html: !!parsed.html,
            };

            emails.push(email);
          } catch (parseError) {
            console.error(
              `[EmailService] Error parsing email ${message.uid}:`,
              parseError
            );
          }
        }
      }

      console.log(
        `[EmailService] Successfully fetched ${emails.length} emails from ${folder}`
      );

      return emails;
    } catch (imapError) {
      console.log(
        `[EmailService] IMAP connection failed: ${
          imapError instanceof Error ? imapError.message : 'Unknown error'
        }, using demo emails`
      );
      return DEMO_EMAILS[folder as keyof typeof DEMO_EMAILS] || [];
    }
  } catch (error) {
    console.error(
      `[EmailService] Error fetching emails via IMAP for ${userEmail}:`,
      error
    );
    return DEMO_EMAILS[folder as keyof typeof DEMO_EMAILS] || [];
  } finally {
    // Close IMAP connection
    if (client) {
      try {
        await client.logout();
      } catch (logoutError) {
        console.error('[EmailService] Error closing IMAP connection:', logoutError);
      }
    }
  }
}

export async function fetchEmails(
  userEmail: string,
  folder: string = 'INBOX'
): Promise<Email[]> {
  try {
    console.log(
      `[EmailService] Fetching emails for ${userEmail} from ${folder}`
    );

    // Try IMAP first
    const emails = await fetchEmailsViaIMAP(userEmail, folder);

    if (emails.length > 0) {
      console.log(
        `[EmailService] Successfully fetched ${emails.length} emails from ${folder}`
      );
      return emails;
    }

    // Fallback to demo emails
    console.log(
      `[EmailService] No emails found, using demo emails for ${folder}`
    );
    return DEMO_EMAILS[folder as keyof typeof DEMO_EMAILS] || [];
  } catch (error) {
    console.error(
      `[EmailService] Error fetching emails for ${userEmail}:`,
      error
    );
    return DEMO_EMAILS[folder as keyof typeof DEMO_EMAILS] || [];
  }
}

// Move email to another folder via IMAP
export async function moveEmailViaIMAP(
  userEmail: string,
  messageId: string,
  fromFolder: string,
  toFolder: string
): Promise<boolean> {
  let client: ImapFlow | null = null;

  try {
    console.log(
      `[EmailService] Moving email ${messageId} from ${fromFolder} to ${toFolder} for ${userEmail}`
    );

    // Get credentials
    const credentials = await getIMAPCredentialsForUser(userEmail);

    if (!credentials || !credentials.email) {
      console.log(`[EmailService] No credentials found for ${userEmail}`);
      return false;
    }

    // Create IMAP client
    client = new ImapFlow({
      host: 'mail.bl2020.com',
      port: 993,
      secure: true,
      auth: {
        user: credentials.email,
        pass: credentials.password,
      },
      logger: false,
      emitLogs: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Connect to IMAP server
    await client.connect();
    console.log(`[EmailService] IMAP connection successful`);

    // Select source mailbox
    await client.mailboxOpen(fromFolder);

    // Move message
    await client.messageMove(messageId, toFolder);
    console.log(`[EmailService] Email moved successfully`);

    await client.logout();
    return true;
  } catch (error) {
    console.error(`[EmailService] Error moving email:`, error);
    return false;
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch (e) {
        // Ignore logout errors
      }
    }
  }
}

// Get list of email folders for a user
// Get list of email folders for a user via Smartermail API
export async function getEmailFolders(
  userEmail: string
): Promise<string[]> {
  const DEFAULT_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
  try {
    const credentials = await getIMAPCredentialsForUser(userEmail);
    if (!credentials || !credentials.email) {
      console.log('[EmailService] No credentials found, returning default folders');
      return DEFAULT_FOLDERS;
    }
    const { getSmarterMailClient } = await import('./smartermailClient');
    const client = getSmarterMailClient();
    const token = await client.authenticate(credentials.email, credentials.password);
    if (!token) {
      console.warn('[EmailService] Smartermail auth failed, returning default folders');
      return DEFAULT_FOLDERS;
    }
    const folders = await client.getFolders(token);
    if (folders && folders.length > 0) {
      console.log(`[EmailService] Found ${folders.length} folders via Smartermail API`);
      return folders;
    }
    return DEFAULT_FOLDERS;
  } catch (error: any) {
    console.error('[EmailService] Error getting folders:', error.message);
    return DEFAULT_FOLDERS;
  }
}

