import axios, { AxiosInstance } from 'axios';
import https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * SmarterMail API Client
 * Handles authentication, token management, and API calls
 */
export class SmarterMailClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private httpsAgent: https.Agent;
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = 'https://mail.bl2020.com') {
    this.baseUrl = baseUrl;
    
    // Create HTTPS agent that ignores SSL errors (for self-signed certs)
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Create axios instance with default config
    this.axiosInstance = axios.create({
      httpsAgent: this.httpsAgent,
      timeout: 30000, // 30 seconds
    });
  }

  /**
   * Authenticate with SmarterMail and get access token
   */
  async authenticate(email: string, password: string): Promise<string> {
    try {
      const response = await this.axiosInstance.post(
        `${this.baseUrl}/api/v1/auth/authenticate-user`,
        {
          username: email,
          password: password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.accessToken = response.data.accessToken;
      
      // JWT tokens from SmarterMail are valid for 15 minutes
      // Set expiry to 14 minutes to be safe
      this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000);
      
      console.log('✅ SmarterMail authentication successful');
      return this.accessToken;
    } catch (error: any) {
      console.error('❌ SmarterMail Auth Error:', error.response?.data || error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    return new Date() < this.tokenExpiry;
  }

  /**
   * Ensure we have a valid token (re-authenticate if needed)
   */
  async ensureAuthenticated(email: string, password: string): Promise<void> {
    if (!this.isTokenValid()) {
      console.log('🔄 Token expired or missing, re-authenticating...');
      await this.authenticate(email, password);
    }
  }

  /**
   * Get email messages from a folder
   */
  async getMessages(
    email: string,
    password: string,
    folder: string = 'Inbox',
    skip: number = 0,
    take: number = 50
  ): Promise<any> {
    await this.ensureAuthenticated(email, password);

    try {
      const response = await this.axiosInstance.post(
        `${this.baseUrl}/api/v1/mail/messages`,
        {
          ownerEmailAddress: email,
          folder: folder,
          skip: skip,
          take: take,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ GetMessages Error:', error.response?.data || error.message);
      throw new Error(`Failed to get messages: ${error.message}`);
    }
  }

  /**
   * Get a single email message with full details including attachments
   */
  async getMessage(
    email: string,
    password: string,
    folder: string,
    uid: number
  ): Promise<any> {
    await this.ensureAuthenticated(email, password);

    try {
      const response = await this.axiosInstance.post(
        `${this.baseUrl}/api/v1/mail/message`,
        {
          ownerEmailAddress: email,
          folder: folder,
          uid: uid,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.messageData;
    } catch (error: any) {
      console.error('❌ GetMessage Error:', error.response?.data || error.message);
      throw new Error(`Failed to get message: ${error.message}`);
    }
  }

  /**
   * Download an attachment from SmarterMail
   * @param attachmentLink - Relative link from attachment.link (e.g., "/attachment/download?data=...")
   * @param email - Email address for authentication
   * @param password - Password for authentication
   * @returns Buffer containing the attachment data
   */
  async downloadAttachment(
    attachmentLink: string,
    email: string,
    password: string
  ): Promise<Buffer> {
    await this.ensureAuthenticated(email, password);

    try {
      // Construct full URL (attachmentLink is relative path)
      const fullUrl = attachmentLink.startsWith('http') 
        ? attachmentLink 
        : `${this.baseUrl}${attachmentLink}`;

      console.log(`📥 Downloading attachment from: ${fullUrl}`);

      const response = await this.axiosInstance.get(fullUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        responseType: 'arraybuffer', // Important: Get binary data
      });

      console.log(`✅ Downloaded attachment: ${response.headers['content-type']}, ${response.data.byteLength} bytes`);
      
      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('❌ Download Attachment Error:', error.response?.data || error.message);
      throw new Error(`Failed to download attachment: ${error.message}`);
    }
  }

  /**
   * Download and save an attachment to filesystem
   * @param attachment - Attachment object from getMessage response
   * @param savePath - Full path where to save the file
   * @param email - Email address for authentication
   * @param password - Password for authentication
   * @returns Object with saved file info
   */
  async downloadAndSaveAttachment(
    attachment: {
      link: string;
      filename: string;
      size: number;
      type: string;
    },
    savePath: string,
    email: string,
    password: string
  ): Promise<{
    filename: string;
    filepath: string;
    size: number;
    type: string;
  }> {
    try {
      // Download attachment
      const buffer = await this.downloadAttachment(attachment.link, email, password);

      // Ensure directory exists
      const dir = path.dirname(savePath);
      await fs.mkdir(dir, { recursive: true });

      // Save to file
      await fs.writeFile(savePath, buffer);

      console.log(`✅ Saved attachment: ${savePath} (${buffer.length} bytes)`);

      return {
        filename: attachment.filename,
        filepath: savePath,
        size: buffer.length,
        type: attachment.type,
      };
    } catch (error: any) {
      console.error(`❌ Error saving attachment ${attachment.filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Download all attachments from an email and save to directory
   * @param email - Email address for authentication
   * @param password - Password for authentication
   * @param folder - Folder name
   * @param uid - Email UID
   * @param saveDir - Directory where to save attachments
   * @returns Array of saved attachment info
   */
  async downloadAllAttachments(
    email: string,
    password: string,
    folder: string,
    uid: number,
    saveDir: string
  ): Promise<Array<{
    filename: string;
    filepath: string;
    size: number;
    type: string;
  }>> {
    try {
      // Get email message with attachments
      const message = await this.getMessage(email, password, folder, uid);

      if (!message.attachments || message.attachments.length === 0) {
        console.log('ℹ️  No attachments found in this email');
        return [];
      }

      console.log(`📎 Found ${message.attachments.length} attachment(s)`);

      // Download each attachment
      const savedAttachments = [];
      for (const attachment of message.attachments) {
        const savePath = path.join(saveDir, attachment.filename);
        
        try {
          const saved = await this.downloadAndSaveAttachment(
            attachment,
            savePath,
            email,
            password
          );
          savedAttachments.push(saved);
        } catch (error: any) {
          console.error(`❌ Failed to download ${attachment.filename}:`, error.message);
          // Continue with other attachments even if one fails
        }
      }

      console.log(`✅ Successfully downloaded ${savedAttachments.length}/${message.attachments.length} attachments`);
      
      return savedAttachments;
    } catch (error: any) {
      console.error('❌ Error downloading attachments:', error.message);
      throw error;
    }
  }

  /**
   * Search for emails matching criteria
   */
  async searchMessages(
    email: string,
    password: string,
    query: string,
    folder: string = 'Inbox',
    fieldsToSearch: number = 15, // From(1) + To(2) + Subject(4) + Body(8)
    skip: number = 0,
    take: number = 50
  ): Promise<any> {
    await this.ensureAuthenticated(email, password);

    try {
      const response = await this.axiosInstance.post(
        `${this.baseUrl}/api/v1/mail/search`,
        {
          query: query,
          includeSubFolders: false,
          fieldsToSearch: fieldsToSearch,
          ownerEmailAddress: email,
          folder: folder,
          skip: skip,
          take: take,
          sortType: 0, // Date
          sortAscending: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ SearchMessages Error:', error.response?.data || error.message);
      throw new Error(`Failed to search messages: ${error.message}`);
    }
  }
}

/**
 * Create a singleton instance for the default server
 */
let defaultClient: SmarterMailClient | null = null;

export function getSmarterMailClient(baseUrl?: string): SmarterMailClient {
  if (!defaultClient || (baseUrl && defaultClient['baseUrl'] !== baseUrl)) {
    defaultClient = new SmarterMailClient(baseUrl);
  }
  return defaultClient;
}
