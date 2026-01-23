import crypto from 'crypto';
import { emailAccountsNew } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

// Encryption key (sollte in .env stehen!)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';

function encryptPassword(password: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptPassword(encryptedPassword: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Get all email accounts for a user
export async function getEmailAccounts(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailAccountsNew).where(eq(emailAccountsNew.userId, userId)).orderBy(desc(emailAccountsNew.createdAt));
}

// Create new email account
export async function createEmailAccount(data: {
  userId: string;
  emailAddress: string;
  password: string;
  serverUrl?: string;
  isPrimary?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const encryptedPassword = encryptPassword(data.password);
  
  const [account] = await db.insert(emailAccountsNew).values({
    userId: data.userId,
    emailAddress: data.emailAddress,
    passwordEncrypted: encryptedPassword,
    serverUrl: data.serverUrl || 'https://mail.bl2020.com',
    isPrimary: data.isPrimary || false,
    isActive: true,
  } ).returning();
  
  return account;
}

// Update email account
export async function updateEmailAccount(id: number, userId: string, data: Partial<{
  emailAddress: string;
  password: string;
  serverUrl: string;
  isPrimary: boolean;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordEncrypted = encryptPassword(data.password);
    delete updateData.password;
  }
  
  await db.update(emailAccountsNew).set(updateData).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
}

// Delete email account
export async function deleteEmailAccount(id: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailAccountsNew).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
}

// Get active email accounts
export async function getActiveEmailAccounts(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(emailAccountsNew).where(and(eq(emailAccountsNew.userId, userId), eq(emailAccountsNew.isActive, true)));
}

// Get decrypted password for an account
export async function getEmailAccountWithPassword(id: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [account] = await db.select().from(emailAccountsNew).where(and(eq(emailAccountsNew.id, id), eq(emailAccountsNew.userId, userId)));
  
  if (!account) return null;
  
  return {
    ...account,
    password: decryptPassword(account.passwordEncrypted),
  };
}
