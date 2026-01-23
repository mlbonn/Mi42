import axios from 'axios';

interface SmarterMailConfig {
  baseUrl: string;
  username: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
}

interface EmailMessage {
  uid: number;
  from: { email: string; name: string };
  to: { email: string; name: string }[];
  subject: string;
  date: Date;
  size: number;
  folder: string;
  isNew: boolean;
  hasAttachments: boolean;
}

interface GetMessagesRequest {
  folder: string;
  skip: number;
  take: number;
}

interface GetMessagesResponse {
  totalCount: number;
  unreadCount: number;
  results: EmailMessage[];
}

class SmarterMailService {
  private config: SmarterMailConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: SmarterMailConfig) {
    this.config = config;
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await axios.post<AuthResponse>(
        `${this.config.baseUrl}/api/v1/auth/authenticate-user`,
        {
          username: this.config.username,
          password: this.config.password
        }
      );

      if (response.data.success && response.data.accessToken) {
        this.accessToken = response.data.accessToken;
        // Token expires in 15 minutes
        this.tokenExpiry = new Date(Date.now() + 14 * 60 * 1000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SmarterMail] Auth failed:', error);
      return false;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry < new Date()) {
      const success = await this.authenticate();
      if (!success) {
        throw new Error('Failed to authenticate with SmarterMail');
      }
    }
  }

  async getMessages(folder: string, skip: number = 0, take: number = 50): Promise<GetMessagesResponse> {
    await this.ensureAuthenticated();

    try {
      const response = await axios.post<GetMessagesResponse>(
        `${this.config.baseUrl}/api/v1/mail/messages`,
        {
          folder,
          skip,
          take,
          sortType: 'date',
          sortAscending: false
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('[SmarterMail] GetMessages failed:', error);
      throw error;
    }
  }

  async sendMessage(data: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    replyToUid?: number;
    replyToFolder?: string;
    forwardUid?: number;
    forwardFolder?: string;
  }): Promise<boolean> {
    await this.ensureAuthenticated();

    try {
      await axios.post(
        `${this.config.baseUrl}/api/v1/mail/message-put`,
        {
          to: data.to.map(email => ({ email })),
          cc: data.cc?.map(email => ({ email })) || [],
          bcc: data.bcc?.map(email => ({ email })) || [],
          subject: data.subject,
          body: data.body,
          isHtml: data.isHtml || true,
          replyToUid: data.replyToUid,
          replyToFolder: data.replyToFolder,
          forwardUid: data.forwardUid,
          forwardFolder: data.forwardFolder
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      );

      return true;
    } catch (error) {
      console.error('[SmarterMail] SendMessage failed:', error);
      return false;
    }
  }

  async moveMessages(uids: number[], fromFolder: string, toFolder: string): Promise<boolean> {
    await this.ensureAuthenticated();

    try {
      await axios.post(
        `${this.config.baseUrl}/api/v1/mail/messages-move`,
        {
          folder: fromFolder,
          destinationFolder: toFolder,
          selectedIds: uids
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      );

      return true;
    } catch (error) {
      console.error('[SmarterMail] MoveMessages failed:', error);
      return false;
    }
  }

  async deleteMessages(uids: number[], folder: string): Promise<boolean> {
    return this.moveMessages(uids, folder, 'Deleted Items');
  }
}

export { SmarterMailService, type EmailMessage, type GetMessagesResponse };
