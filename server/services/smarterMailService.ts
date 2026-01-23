// server/services/smarterMailService.ts
// SmarterMail API Client mit Attachment-Download

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 Zeichen
const ALGORITHM = 'aes-256-cbc';

export interface SmarterMailMessage {
  uid: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  receivedDate: string;
  size: number;
  hasAttachments: boolean;
  isRead: boolean;
  isFlagged: boolean;
}

export interface SmarterMailMessageDetail extends SmarterMailMessage {
  htmlBody?: string;
  textBody?: string;
  attachments?: SmarterMailAttachment[];
}

export interface SmarterMailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface SmarterMailFolder {
  name: string;
  fullPath: string;
  messageCount: number;
  unreadCount: number;
}

export class SmarterMailService {
  private baseUrl: string;
  private authToken?: string;
  private client: AxiosInstance;

  constructor(serverUrl: string = 'https://mail.bl2020.com') {
    this.baseUrl = serverUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  // ============================================================
  // Passwort-Verschlüsselung
  // ============================================================

  static encryptPassword(password: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decryptPassword(encryptedPassword: string): string {
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ============================================================
  // Authentifizierung
  // ============================================================

  async authenticate(email: string, password: string): Promise<string> {
    try {
      const response = await this.client.post('/api/v1/auth/authenticate-user', {
        username: email,
        password: password,
      });

      if (response.data.success && response.data.accessToken) {
        this.authToken = response.data.accessToken;
        return this.authToken;
      }

      throw new Error('Authentication failed: No access token received');
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  private ensureAuthenticated() {
    if (!this.authToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
  }

  private getAuthHeaders() {
    this.ensureAuthenticated();
    return {
      Authorization: `Bearer ${this.authToken}`,
    };
  }

  // ============================================================
  // E-Mail-Abruf (Live)
  // ============================================================

  async getMessages(
    folder: string = 'INBOX',
    skip: number = 0,
    take: number = 50
  ): Promise<{ messages: SmarterMailMessage[]; total: number }> {
    try {
      const response = await this.client.post(
        '/api/v1/mail/messages',
        {
          folder: folder,
          skip: skip,
          take: take,
          sortType: 'receivedDate',
          sortAscending: false,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        messages: response.data.messages || [],
        total: response.data.total || 0,
      };
    } catch (error: any) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  async getMessage(messageUid: string): Promise<SmarterMailMessageDetail> {
    try {
      const response = await this.client.get(`/api/v1/mail/message/${messageUid}`, {
        headers: this.getAuthHeaders(),
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }

  async searchMessages(
    query: string,
    folder: string = 'INBOX',
    skip: number = 0,
    take: number = 50
  ): Promise<{ messages: SmarterMailMessage[]; total: number }> {
    try {
      const response = await this.client.post(
        '/api/v1/mail/messages',
        {
          query: query,
          folder: folder,
          skip: skip,
          take: take,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        messages: response.data.messages || [],
        total: response.data.total || 0,
      };
    } catch (error: any) {
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }

  // ============================================================
  // Ordner-Verwaltung
  // ============================================================

  async getFolders(): Promise<SmarterMailFolder[]> {
    try {
      const response = await this.client.get('/api/v1/folders', {
        headers: this.getAuthHeaders(),
      });

      return response.data.folders || [];
    } catch (error: any) {
      throw new Error(`Failed to get folders: ${error.message}`);
    }
  }

  // ============================================================
  // E-Mail senden
  // ============================================================

  async sendMessage(
    to: string,
    subject: string,
    body: string,
    from: string,
    cc?: string,
    bcc?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const response = await this.client.post(
        '/api/v1/mail/send',
        {
          to: to,
          from: from,
          subject: subject,
          htmlBody: body,
          cc: cc,
          bcc: bcc,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: response.data.success || false,
        messageId: response.data.messageId,
      };
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // ============================================================
  // Attachment-Download
  // ============================================================

  async downloadAttachment(
    messageUid: string,
    attachmentId: string,
    savePath: string
  ): Promise<{ filename: string; size: number; mimeType: string }> {
    try {
      // Attachment-Metadaten abrufen
      const message = await this.getMessage(messageUid);
      const attachment = message.attachments?.find((a) => a.id === attachmentId);

      if (!attachment) {
        throw new Error(`Attachment ${attachmentId} not found in message ${messageUid}`);
      }

      // Verzeichnis erstellen falls nicht vorhanden
      await fs.mkdir(path.dirname(savePath), { recursive: true });

      // Attachment herunterladen (Stream)
      const response = await this.client.get(
        `/api/v1/mail/message/${messageUid}/attachment/${attachmentId}`,
        {
          headers: this.getAuthHeaders(),
          responseType: 'stream',
        }
      );

      // Stream in Datei schreiben
      const writer = createWriteStream(savePath);
      await pipeline(response.data, writer);

      return {
        filename: attachment.filename,
        size: attachment.size,
        mimeType: attachment.contentType,
      };
    } catch (error: any) {
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  }

  async downloadAllAttachments(
    messageUid: string,
    baseDir: string
  ): Promise<
    Array<{
      attachmentId: string;
      filename: string;
      savePath: string;
      size: number;
      mimeType: string;
    }>
  > {
    try {
      // E-Mail-Details abrufen
      const message = await this.getMessage(messageUid);

      if (!message.attachments || message.attachments.length === 0) {
        return [];
      }

      // Alle Attachments herunterladen
      const results = [];
      for (const attachment of message.attachments) {
        const savePath = path.join(baseDir, attachment.filename);
        const result = await this.downloadAttachment(messageUid, attachment.id, savePath);

        results.push({
          attachmentId: attachment.id,
          filename: result.filename,
          savePath: savePath,
          size: result.size,
          mimeType: result.mimeType,
        });
      }

      return results;
    } catch (error: any) {
      throw new Error(`Failed to download all attachments: ${error.message}`);
    }
  }

  // ============================================================
  // E-Mail-Operationen
  // ============================================================

  async markAsRead(messageUid: string): Promise<void> {
    try {
      await this.client.patch(
        `/api/v1/mail/message/${messageUid}`,
        {
          isRead: true,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );
    } catch (error: any) {
      throw new Error(`Failed to mark message as read: ${error.message}`);
    }
  }

  async moveMessage(messageUid: string, targetFolder: string): Promise<void> {
    try {
      await this.client.post(
        '/api/v1/mail/messages/move',
        {
          messageUids: [messageUid],
          targetFolder: targetFolder,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );
    } catch (error: any) {
      throw new Error(`Failed to move message: ${error.message}`);
    }
  }

  async deleteMessage(messageUid: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/mail/message/${messageUid}`, {
        headers: this.getAuthHeaders(),
      });
    } catch (error: any) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}
