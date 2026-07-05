/**
 * FRIDAY CRM - Email Send Worker Daemon
 * Processes email_send_queue jobs via SmarterMail API
 * - Atomic claiming (UPDATE ... WHERE status='pending', affectedRows check)
 * - Throttle: max SEND_RATE_PER_MINUTE mails/min (default 20)
 * - Backoff on failure, max attempts before marking failed
 * - Stale-lock recovery for 'sending' jobs stuck > 5 min
 * - Graceful shutdown: finish current job, then exit
 */
import 'dotenv/config';
import { validateEnv } from './_core/validateEnv';
import { getDb } from './db';
import { emailSendQueue } from '../drizzle/schema';
import { eq, and, lte, sql as drizzleSql } from 'drizzle-orm';
import axios from 'axios';
import https from 'https';
import { decryptCredential } from './credentialService';
import { getCaldavCredentials } from './db';

validateEnv();

const POLLING_INTERVAL_MS = 5_000;          // poll every 5 s
const SEND_RATE_PER_MINUTE = parseInt(process.env.EMAIL_SEND_RATE_PER_MINUTE ?? '20', 10);
const STALE_LOCK_MINUTES = 5;               // reclaim 'sending' jobs older than this

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const SMARTERMAIL_BASE_URL = process.env.SMARTERMAIL_BASE_URL ?? 'https://mail.bl2020.com';

// ── Rate-limit state ──────────────────────────────────────────────────────────
let sentThisMinute = 0;
let minuteWindowStart = Date.now();

function canSend(): boolean {
  const now = Date.now();
  if (now - minuteWindowStart >= 60_000) {
    sentThisMinute = 0;
    minuteWindowStart = now;
  }
  return sentThisMinute < SEND_RATE_PER_MINUTE;
}

function recordSent() {
  sentThisMinute++;
}

// ── Worker state ──────────────────────────────────────────────────────────────
let isShuttingDown = false;
let isProcessing = false;
let sentCount = 0;
let failCount = 0;

// ── SmarterMail send ──────────────────────────────────────────────────────────
async function sendViaSmarterMail(params: {
  fromEmail: string;
  fromPassword: string;
  toAddress: string;
  subject: string;
  body: string;
}): Promise<void> {
  // 1. Authenticate
  const authResp = await axios.post(
    `${SMARTERMAIL_BASE_URL}/api/v1/auth/authenticate-user`,
    { username: params.fromEmail, password: params.fromPassword },
    { httpsAgent, timeout: 10_000 }
  );
  const token: string = authResp.data?.accessToken ?? authResp.data?.token;
  if (!token) throw new Error('SmarterMail auth failed: no token returned');

  // 2. Send
  const sendResp = await axios.post(
    `${SMARTERMAIL_BASE_URL}/api/v1/mail/send-message`,
    {
      to: params.toAddress,
      subject: params.subject,
      body: params.body,
    },
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      httpsAgent,
      timeout: 15_000,
    }
  );
  if (sendResp.data?.success === false) {
    throw new Error(`SmarterMail send failed: ${JSON.stringify(sendResp.data)}`);
  }
}

// ── Process one job ───────────────────────────────────────────────────────────
async function processNextJob(): Promise<{ processed: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { processed: false, error: 'DB not available' };

  // Stale-lock recovery: reset 'sending' jobs stuck > STALE_LOCK_MINUTES
  const staleThreshold = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000);
  await db
    .update(emailSendQueue)
    .set({ status: 'pending' })
    .where(
      and(
        eq(emailSendQueue.status, 'sending'),
        lte(emailSendQueue.scheduledAt, staleThreshold)
      )
    );

  // Atomic claim: UPDATE WHERE status='pending' AND scheduledAt <= now
  const now = new Date();
  const claimResult = await db
    .update(emailSendQueue)
    .set({ status: 'sending', attempts: drizzleSql`${emailSendQueue.attempts} + 1` })
    .where(
      and(
        eq(emailSendQueue.status, 'pending'),
        lte(emailSendQueue.scheduledAt, now)
      )
    )
    .limit(1);

  // @ts-ignore affectedRows is available on mysql2 result
  if (!claimResult || (claimResult as any).rowsAffected === 0) {
    return { processed: false };
  }

  // Fetch the claimed job
  const jobs = await db
    .select()
    .from(emailSendQueue)
    .where(eq(emailSendQueue.status, 'sending'))
    .limit(1);

  if (!jobs.length) return { processed: false };
  const job = jobs[0];

  try {
    // Load sender credentials
    const creds = await getCaldavCredentials(job.userId);
    if (!creds) throw new Error(`No email credentials for userId=${job.userId}`);

    const fromEmail = creds.email;
    const fromPassword = creds.password; // getCaldavCredentials already decrypts

    // Send
    await sendViaSmarterMail({
      fromEmail,
      fromPassword,
      toAddress: job.toAddress,
      subject: job.subject ?? '(no subject)',
      body: job.body ?? '',
    });

    // Mark sent
    await db
      .update(emailSendQueue)
      .set({ status: 'sent', sentAt: new Date(), errorMessage: null })
      .where(eq(emailSendQueue.id, job.id));

    recordSent();
    sentCount++;
    console.log(`[EmailSendWorker] ✅ Sent job ${job.id} to ${job.toAddress}`);
    return { processed: true };

  } catch (err: any) {
    const errMsg = String(err?.message ?? err).slice(0, 500);
    // No password in logs
    const safeMsg = errMsg.replace(/password[^,}]*/gi, 'password=[REDACTED]');

    const newAttempts = (job.attempts ?? 1);
    const maxAttempts = job.maxAttempts ?? 3;

    if (newAttempts >= maxAttempts) {
      await db
        .update(emailSendQueue)
        .set({ status: 'failed', errorMessage: safeMsg })
        .where(eq(emailSendQueue.id, job.id));
      failCount++;
      console.error(`[EmailSendWorker] ❌ Job ${job.id} permanently failed: ${safeMsg}`);
    } else {
      // Exponential backoff: 2^attempts minutes
      const backoffMs = Math.pow(2, newAttempts) * 60_000;
      const nextScheduled = new Date(Date.now() + backoffMs);
      await db
        .update(emailSendQueue)
        .set({ status: 'pending', scheduledAt: nextScheduled, errorMessage: safeMsg })
        .where(eq(emailSendQueue.id, job.id));
      console.warn(`[EmailSendWorker] ⚠️ Job ${job.id} failed (attempt ${newAttempts}/${maxAttempts}), retry at ${nextScheduled.toISOString()}`);
    }
    return { processed: true, error: safeMsg };
  }
}

// ── Worker loop ───────────────────────────────────────────────────────────────
async function workerLoop() {
  if (isProcessing || isShuttingDown) return;
  isProcessing = true;
  try {
    if (!canSend()) {
      console.log(`[EmailSendWorker] Rate limit reached (${sentThisMinute}/${SEND_RATE_PER_MINUTE}/min), waiting`);
      return;
    }
    const result = await processNextJob();
    if (!result.processed && !result.error) {
      // No pending jobs – silent
    }
  } catch (err: any) {
    console.error('[EmailSendWorker] Unexpected error:', err.message);
  } finally {
    isProcessing = false;
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────
export function startWorker() {
  console.log('='.repeat(60));
  console.log('FRIDAY CRM - Email Send Worker');
  console.log('='.repeat(60));
  console.log(`Polling interval: ${POLLING_INTERVAL_MS / 1000}s`);
  console.log(`Rate limit: ${SEND_RATE_PER_MINUTE} mails/min`);
  console.log(`SmarterMail: ${SMARTERMAIL_BASE_URL}`);
  console.log('='.repeat(60));

  workerLoop();
  const intervalId = setInterval(workerLoop, POLLING_INTERVAL_MS);

  const shutdown = (signal: string) => {
    console.log(`\n[EmailSendWorker] ${signal} received, shutting down gracefully...`);
    isShuttingDown = true;
    clearInterval(intervalId);
    // Wait for current job to finish (max 30 s)
    const deadline = Date.now() + 30_000;
    const check = setInterval(() => {
      if (!isProcessing || Date.now() > deadline) {
        clearInterval(check);
        console.log(`[EmailSendWorker] Stats - Sent: ${sentCount}, Failed: ${failCount}`);
        process.exit(0);
      }
    }, 500);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export function getWorkerStats() {
  return { sentCount, failCount, isProcessing, uptime: process.uptime() };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker();
}
