import axios from 'axios';

const SMARTERMAIL_URL = 'https://mail.bl2020.com';

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

export async function sendEmailViaSmarterMail(
  username: string,
  password: string,
  params: SendEmailParams
): Promise<boolean> {
  try {
    // Get access token
    const accessToken = await getAccessToken(username, password);
    
    // Prepare request body
    const body = {
      to: params.to,
      cc: params.cc || '',
      bcc: params.bcc || '',
      subject: params.subject,
      htmlBody: params.htmlBody,
      messagePlainText: params.messagePlainText || params.htmlBody.replace(/<[^>]*>/g, ''),
      from: username,
      replyUid: params.replyUid,
    };
    
    console.log(`[SmarterMail] Sending email from ${username} to ${params.to}`);
    
    // Send email
    const response = await axios.post(
      `${SMARTERMAIL_URL}/api/v1/mail/message-put`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('[SmarterMail] Email sent successfully');
    return true;
  } catch (error: any) {
    console.error('[SmarterMail] Error sending email:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send email');
  }
}
