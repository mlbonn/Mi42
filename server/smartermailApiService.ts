import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { randomUUID } from 'crypto';

const SMARTERMAIL_URL = 'https://mail.bl2020.com';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

interface SmarterMailAuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface SendEmailParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody: string;
  messagePlainText?: string;
  replyUid?: number;
  inReplyTo?: string;
  references?: string;
  /** Optional attachments to upload before sending */
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer | string;
}

// Cache for access tokens
const tokenCache = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();

export async function authenticateSmarterMail(username: string, password: string): Promise<SmarterMailAuthResponse> {
  try {
    const response = await axios.post(`${SMARTERMAIL_URL}/api/v1/auth/authenticate-user`, {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('[SmarterMail] Authentication failed:', error);
    throw new Error('SmarterMail authentication failed');
  }
}

export async function getAccessToken(username: string, password: string): Promise<string> {
  // Check cache
  const cached = tokenCache.get(username);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }
  // Authenticate
  const auth = await authenticateSmarterMail(username, password);
  // Cache token (expires in 14 minutes to be safe)
  tokenCache.set(username, {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: Date.now() + 14 * 60 * 1000,
  });
  return auth.accessToken;
}

/**
 * Upload a single attachment to SmarterMail using the two-step compose workflow.
 *
 * Endpoint: POST /api/v1/mail/attachment/{attachguid}
 * Content-Type: multipart/form-data with exactly one file field named "file".
 * The attachGuid groups all attachments for one compose session.
 */
async function uploadAttachment(
  accessToken: string,
  attachGuid: string,
  attachment: EmailAttachment
): Promise<void> {
  const form = new FormData();
  const buffer = Buffer.isBuffer(attachment.content)
    ? attachment.content
    : Buffer.from(attachment.content as string, 'utf-8');

  form.append('file', buffer, {
    filename: attachment.filename,
    contentType: attachment.contentType,
    knownLength: buffer.length,
  });

  const response = await axios.post(
    `${SMARTERMAIL_URL}/api/v1/mail/attachment/${attachGuid}`,
    form,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...form.getHeaders(),
      },
      httpsAgent,
      timeout: 20_000,
    }
  );

  if (!response.data?.success) {
    throw new Error(
      `[SmarterMail] AddAttachment failed for ${attachment.filename}: ${JSON.stringify(response.data)}`
    );
  }
  console.log(
    `[SmarterMail] Attachment uploaded: ${attachment.filename} (guid=${attachGuid}, contentType=${attachment.contentType})`
  );
}

export async function sendEmailViaSmarterMail(
  username: string,
  password: string,
  params: SendEmailParams
): Promise<boolean> {
  try {
    // Get access token
    const accessToken = await getAccessToken(username, password);

    // ── Step 1: Upload attachments if present ─────────────────────────────
    let attachGuid: string | undefined;
    if (params.attachments && params.attachments.length > 0) {
      attachGuid = randomUUID();
      for (const att of params.attachments) {
        await uploadAttachment(accessToken, attachGuid, att);
      }
    }

    // ── Step 2: Send via message-put ──────────────────────────────────────
    const body: Record<string, unknown> = {
      to: params.to,
      cc: params.cc || '',
      bcc: params.bcc || '',
      subject: params.subject,
      htmlBody: params.htmlBody,
      messagePlainText: params.messagePlainText || params.htmlBody.replace(/<[^>]*>/g, ''),
      from: username,
      replyUid: params.replyUid,
    };

    // Pass the attachGuid so SmarterMail links the uploaded files to this message
    if (attachGuid) {
      body['attachmentGuid'] = attachGuid;
    }

    console.log(
      `[SmarterMail] Sending email from ${username} to ${params.to}` +
      (attachGuid ? ` (${params.attachments!.length} attachment(s))` : '')
    );

    const response = await axios.post(
      `${SMARTERMAIL_URL}/api/v1/mail/message-put`,
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data?.success === false) {
      throw new Error(`SmarterMail send failed: ${JSON.stringify(response.data)}`);
    }

    console.log('[SmarterMail] Email sent successfully');
    return true;
  } catch (error: any) {
    console.error('[SmarterMail] Error sending email:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send email');
  }
}
