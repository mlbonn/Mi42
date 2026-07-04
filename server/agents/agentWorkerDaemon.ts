import { claimNextAgentJob, recoverStaleJobs } from './agentDb';
import { runAgentJob } from './agentRunner';

const POLL_INTERVAL_MS = 5_000;       // 5 Sekunden
const STALE_RECOVERY_INTERVAL = 12;   // alle 12 Polls = ~60 Sekunden
const STALE_TIMEOUT_MINUTES = 15;
const MAX_JOBS_PER_POLL = 5;          // max. gleichzeitig abarbeitbare Jobs pro Zyklus

let isShuttingDown = false;
let activeJobs = 0;
let pollCount = 0;

// ─── Graceful Shutdown (B4) ──────────────────────────────────────────────────

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[AgentWorker] ${signal} received — waiting for ${activeJobs} active job(s) to finish...`);

  // Warte bis alle aktiven Jobs fertig sind (max. 30 Sekunden)
  const deadline = Date.now() + 30_000;
  while (activeJobs > 0 && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
  }

  if (activeJobs > 0) {
    console.warn(`[AgentWorker] Forced shutdown with ${activeJobs} job(s) still running`);
  } else {
    console.log('[AgentWorker] Clean shutdown complete');
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Poll-Schleife (B3) ──────────────────────────────────────────────────────

async function poll() {
  if (isShuttingDown) return;

  pollCount++;

  // Stale-Lock Recovery alle N Polls
  if (pollCount % STALE_RECOVERY_INTERVAL === 1) {
    try {
      await recoverStaleJobs(STALE_TIMEOUT_MINUTES);
    } catch (err) {
      console.error('[AgentWorker] Stale recovery error:', err);
    }
  }

  // Batch-Drain: bis zu MAX_JOBS_PER_POLL Jobs pro Zyklus abarbeiten
  let processed = 0;
  while (processed < MAX_JOBS_PER_POLL && !isShuttingDown) {
    let job;
    try {
      job = await claimNextAgentJob();
    } catch (err) {
      console.error('[AgentWorker] Claim error:', err);
      break;
    }

    if (!job) break; // Keine weiteren Jobs in der Queue

    processed++;
    activeJobs++;

    // Job asynchron ausführen (nicht awaiten, damit nächster Job sofort starten kann)
    runAgentJob(job)
      .catch(err => {
        console.error(`[AgentWorker] Unhandled error in job ${job.id}:`, err);
      })
      .finally(() => {
        activeJobs--;
      });
  }

  // Nur loggen wenn tatsächlich Jobs verarbeitet wurden (kein Noise bei leerer Queue)
  if (processed > 0) {
    console.log(`[AgentWorker] Poll #${pollCount}: processed ${processed} job(s), active: ${activeJobs}`);
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────

console.log('[AgentWorker] Starting — poll interval:', POLL_INTERVAL_MS, 'ms');

// Stale Recovery beim Start
recoverStaleJobs(STALE_TIMEOUT_MINUTES).catch(err =>
  console.error('[AgentWorker] Initial stale recovery error:', err)
);

// Erster Poll sofort
poll().catch(err => console.error('[AgentWorker] Initial poll error:', err));

// Regelmäßiger Poll
setInterval(() => {
  poll().catch(err => console.error('[AgentWorker] Poll error:', err));
}, POLL_INTERVAL_MS);

// Session-Aufräumjob: Abgelaufene und widerrufene Sessions löschen (täglich)
const SESSION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
async function cleanupExpiredSessions() {
  try {
    const { getDb } = await import('../db');
    const { sql: rawSql } = await import('drizzle-orm');
    const db = await getDb();
    if (!db) return;
    const result = await db.execute(
      rawSql`DELETE FROM sessions WHERE expiresAt < NOW() OR (revokedAt IS NOT NULL AND revokedAt < DATE_SUB(NOW(), INTERVAL 7 DAY))`
    );
    const deleted = (result[0] as any)?.affectedRows || 0;
    if (deleted > 0) {
      console.log(`[AgentWorker] Cleaned up ${deleted} expired/revoked session(s)`);
    }
  } catch (err) {
    console.error('[AgentWorker] Session cleanup error:', err);
  }
}
// Erster Cleanup nach 1 Stunde, dann täglich
setTimeout(() => {
  cleanupExpiredSessions();
  setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
}, 60 * 60 * 1000);
