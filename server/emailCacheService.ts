import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  read: boolean;
  flagged: boolean;
  folder: string;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

interface SmarterMailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
}

/**
 * E-Mail-Cache Service
 * 
 * Architektur:
 * - Cached E-Mails nur auf Web-Server (nicht in DB)
 * - Cache-TTL: 1 Stunde
 * - Nur archivierte E-Mails gehen in FRIDAY CRM DB
 * - Speicherplatz-effizient
 */
class EmailCacheService {
  private client: AxiosInstance;
  private config: SmarterMailConfig;
  private cache: NodeCache;
  private sessionId: string | null = null;

  constructor(config: SmarterMailConfig) {
    this.config = config;
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 Stunde Cache
    this.client = axios.create({
      baseURL: `https://${config.host}:${config.port}/api/v1`,
      timeout: 30000,
    } as any);
  }

  /**
   * Authenticate with SmarterMail
   */
  async authenticate(): Promise<void> {
    try {
      const response = await this.client.post('/authentication/login', {
        username: this.config.username,
        password: this.config.password,
      });

      this.sessionId = response.data.sessionId;
      this.client.defaults.headers.common['X-Session-ID'] = this.sessionId;
      console.log('[EmailCache] Authenticated successfully');
    } catch (error) {
      console.error('[EmailCache] Authentication failed:', error);
      throw new Error('Failed to authenticate with SmarterMail');
    }
  }

  /**
   * Get cached emails or fetch from server
   */
  async getEmails(folder: string = 'Inbox', limit: number = 50): Promise<EmailMessage[]> {
    const cacheKey = `emails:${folder}:${limit}`;
    
    // Try cache first
    const cached = this.cache.get<EmailMessage[]>(cacheKey);
    if (cached) {
      console.log(`[EmailCache] Cache HIT for ${folder}`);
      return cached;
    }

    console.log(`[EmailCache] Cache MISS for ${folder}, fetching from server...`);

    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/messages`, {
        params: {
          folder,
          limit,
          sortBy: 'date',
          sortOrder: 'desc',
        },
      });

      const emails: EmailMessage[] = response.data.messages.map((msg: any) => ({
        id: msg.uid,
        from: msg.from,
        to: msg.to,
        cc: msg.cc,
        bcc: msg.bcc,
        subject: msg.subject,
        body: msg.textBody || '',
        htmlBody: msg.htmlBody,
        date: new Date(msg.date),
        read: msg.seen,
        flagged: msg.flagged,
        folder,
        attachments: (msg.attachments || []).map((att: any) => ({
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
        })),
      }));

      // Cache for 1 hour
      this.cache.set(cacheKey, emails);
      console.log(`[EmailCache] Cached ${emails.length} emails from ${folder}`);

      return emails;
    } catch (error) {
      console.error(`[EmailCache] Failed to fetch emails from ${folder}:`, error);
      throw error;
    }
  }

  /**
   * Get single email with full content
   */
  async getEmail(messageId: string, folder: string): Promise<EmailMessage | null> {
    const cacheKey = `email:${messageId}`;
    
    // Try cache first
    const cached = this.cache.get<EmailMessage>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/messages/${messageId}`, {
        params: { folder },
      });

      const msg = response.data;
      const email: EmailMessage = {
        id: msg.uid,
        from: msg.from,
        to: msg.to,
        cc: msg.cc,
        bcc: msg.bcc,
        subject: msg.subject,
        body: msg.textBody || '',
        htmlBody: msg.htmlBody,
        date: new Date(msg.date),
        read: msg.seen,
        flagged: msg.flagged,
        folder,
        attachments: (msg.attachments || []).map((att: any) => ({
          id: att.id,
          filename: att.filename,
          mimeType: att.mimeType,
          size: att.size,
        })),
      };

      // Cache for 1 hour
      this.cache.set(cacheKey, email);

      return email;
    } catch (error) {
      console.error(`[EmailCache] Failed to fetch email ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Send email
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    htmlBody?: string,
    cc?: string,
    bcc?: string
  ): Promise<string> {
    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      const response = await this.client.post(`/messages/send`, {
        to,
        cc,
        bcc,
        subject,
        textBody: body,
        htmlBody,
      });

      // Invalidate Sent folder cache
      this.cache.del(`emails:Sent:*`);

      return response.data.messageId;
    } catch (error) {
      console.error('[EmailCache] Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Move email to folder
   */
  async moveEmail(messageId: string, fromFolder: string, toFolder: string): Promise<void> {
    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      await this.client.post(`/messages/${messageId}/move`, {
        sourceFolder: fromFolder,
        destinationFolder: toFolder,
      });

      // Invalidate cache for both folders
      this.cache.del(`emails:${fromFolder}:*`);
      this.cache.del(`emails:${toFolder}:*`);
      this.cache.del(`email:${messageId}`);

      console.log(`[EmailCache] Moved email ${messageId} from ${fromFolder} to ${toFolder}`);
    } catch (error) {
      console.error('[EmailCache] Failed to move email:', error);
      throw error;
    }
  }

  /**
   * Delete email
   */
  async deleteEmail(messageId: string, folder: string): Promise<void> {
    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      await this.client.delete(`/messages/${messageId}`, {
        params: { folder },
      });

      // Invalidate cache
      this.cache.del(`emails:${folder}:*`);
      this.cache.del(`email:${messageId}`);

      console.log(`[EmailCache] Deleted email ${messageId}`);
    } catch (error) {
      console.error('[EmailCache] Failed to delete email:', error);
      throw error;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId: string, folder: string, read: boolean = true): Promise<void> {
    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      await this.client.patch(`/messages/${messageId}`, {
        seen: read,
      });

      // Invalidate cache
      this.cache.del(`emails:${folder}:*`);
      this.cache.del(`email:${messageId}`);

      console.log(`[EmailCache] Marked email ${messageId} as ${read ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('[EmailCache] Failed to mark email:', error);
      throw error;
    }
  }

  /**
   * Get folders
   */
  async getFolders(): Promise<string[]> {
    const cacheKey = 'folders';
    
    const cached = this.cache.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/folders`);
      const folders = response.data.folders;
      this.cache.set(cacheKey, folders);
      return folders;
    } catch (error) {
      console.error('[EmailCache] Failed to fetch folders:', error);
      throw error;
    }
  }

  /**
   * Download attachment
   */
  async downloadAttachment(messageId: string, attachmentId: string, folder: string): Promise<Buffer> {
    if (!this.sessionId) {
      await this.authenticate();
    }

    try {
      const response = await this.client.get(`/messages/${messageId}/attachments/${attachmentId}`, {
        params: { folder },
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('[EmailCache] Failed to download attachment:', error);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.flushAll();
    console.log('[EmailCache] Cache cleared');
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (this.sessionId) {
      try {
        await this.client.post('/authentication/logout');
        this.sessionId = null;
        console.log('[EmailCache] Logged out successfully');
      } catch (error) {
        console.error('[EmailCache] Logout failed:', error);
      }
    }
  }
}

export { EmailCacheService, EmailMessage, SmarterMailConfig };
