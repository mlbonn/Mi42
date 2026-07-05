import { getCaldavCredentials } from './db';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Demo emails for fallback
const DEMO_EMAILS: Record<string, Email[]> = {
  INBOX: [
    {
      id: '1',
      from: 'john@example.com',
      to: 'user@bl2020.com',
      subject: 'Welcome to FRIDAY CRM',
      preview: 'Thanks for signing up!',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      body: 'Welcome to FRIDAY CRM!',
    },
  ],
  Drafts: [],
  Sent: [],
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

/**
 * Resolves SmarterMail credentials for a user by email address.
 * Renamed from getMailCredentialsForUser – these are SmarterMail credentials, not IMAP.
 */
export async function getMailCredentialsForUser(
  userEmail: string
): Promise<{ email: string; password: string } | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const userList = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail));
    if (!userList?.length) return null;
    const creds = await getCaldavCredentials(userList[0].id);
    if (!creds) return null;
    return creds;
  } catch (error: any) {
    console.error(`[EmailService] Error getting credentials for ${userEmail}:`, error.message);
    return null;
  }
}

/**
 * Fetches emails via SmarterMail REST API.
 */
export async function fetchEmails(
  userEmail: string,
  folder: string = 'INBOX'
): Promise<Email[]> {
  try {
    const credentials = await getMailCredentialsForUser(userEmail);
    if (!credentials?.email) {
      return DEMO_EMAILS[folder] ?? [];
    }
    const { getSmarterMailClient } = await import('./smartermailClient');
    const client = getSmarterMailClient();
    const messages = await client.getMessages(credentials.email, credentials.password, folder);
    if (messages?.length) return messages;
    return DEMO_EMAILS[folder] ?? [];
  } catch (error: any) {
    console.error(`[EmailService] fetchEmails error:`, error.message);
    return DEMO_EMAILS[folder] ?? [];
  }
}

/**
 * Get list of email folders via SmarterMail API.
 */
export async function getEmailFolders(userEmail: string): Promise<string[]> {
  const DEFAULT_FOLDERS = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
  try {
    const credentials = await getMailCredentialsForUser(userEmail);
    if (!credentials?.email) return DEFAULT_FOLDERS;
    const { getSmarterMailClient } = await import('./smartermailClient');
    const client = getSmarterMailClient();
    const folders = await client.getFolders(credentials.email, credentials.password);
    return folders?.length ? folders : DEFAULT_FOLDERS;
  } catch (error: any) {
    console.error('[EmailService] Error getting folders:', error.message);
    return DEFAULT_FOLDERS;
  }
}
