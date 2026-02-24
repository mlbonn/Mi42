/**
 * Email Sender Utility for FRIDAY CRM
 * 
 * Sends emails with attachments using SmarterMail API
 */

import fetch from 'node-fetch';

interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

interface SendEmailOptions {
  from: {
    name: string;
    email: string;
  };
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  inReplyTo?: string;
  references?: string;
}

/**
 * Send email with attachments via SmarterMail API
 */
export async function sendEmailWithAttachment(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Get SmarterMail credentials from environment
    const SMARTERMAIL_URL = process.env.SMARTERMAIL_URL || 'https://mail.bl2020.com';
    const SMARTERMAIL_USERNAME = process.env.SMARTERMAIL_USERNAME;
    const SMARTERMAIL_PASSWORD = process.env.SMARTERMAIL_PASSWORD;

    if (!SMARTERMAIL_USERNAME || !SMARTERMAIL_PASSWORD) {
      throw new Error('SmarterMail credentials not configured');
    }

    // Authenticate with SmarterMail
    const authResponse = await fetch(`${SMARTERMAIL_URL}/api/v1/auth/authenticate-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: SMARTERMAIL_USERNAME,
        password: SMARTERMAIL_PASSWORD
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.statusText}`);
    }

    const authData: any = await authResponse.json();
    const accessToken = authData.accessToken;

    if (!accessToken) {
      throw new Error('No access token received from SmarterMail');
    }

    // Prepare recipients
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
    const ccAddresses = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : [];
    const bccAddresses = options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : [];

    // Prepare attachments
    const attachments = options.attachments?.map(att => ({
      filename: att.filename,
      content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
      contentType: att.contentType || 'application/octet-stream',
      encoding: typeof att.content === 'string' ? 'utf-8' : 'base64'
    })) || [];

    // Send email via SmarterMail API
    const sendResponse = await fetch(`${SMARTERMAIL_URL}/api/v1/mail/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        from: {
          name: options.from.name,
          address: options.from.email
        },
        to: toAddresses.map(email => ({ address: email })),
        cc: ccAddresses.map(email => ({ address: email })),
        bcc: bccAddresses.map(email => ({ address: email })),
        subject: options.subject,
        htmlBody: options.html || '',
        textBody: options.text || '',
        attachments: attachments,
        inReplyTo: options.inReplyTo,
        references: options.references
      })
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      throw new Error(`Failed to send email: ${sendResponse.statusText} - ${errorText}`);
    }

    const sendData: any = await sendResponse.json();

    return {
      success: true,
      messageId: sendData.messageId
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Send simple text email
 */
export async function sendSimpleEmail(
  to: string,
  subject: string,
  body: string,
  from?: { name: string; email: string }
): Promise<{ success: boolean; error?: string }> {
  const defaultFrom = {
    name: 'FRIDAY CRM',
    email: process.env.SMARTERMAIL_USERNAME || 'noreply@bl2020.com'
  };

  return sendEmailWithAttachment({
    from: from || defaultFrom,
    to,
    subject,
    html: body
  });
}
