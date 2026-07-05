import { jwtVerify } from "jose";
import crypto from "crypto";
import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { sessions } from "../../drizzle/schema";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface SessionPayload {
  userId: string;
  name: string;
  sessionId: string;
}

/**
 * Validate a session token:
 * 1. Verify JWT signature
 * 2. Check sessions table: row must exist, revokedAt IS NULL, expiresAt > NOW()
 * 3. Update lastSeenAt at most once per 5 minutes
 * Returns { userId, name, sessionId } or null
 */
export async function validateSession(token: string): Promise<SessionPayload | null> {
  // Step 1: JWT verify
  let payload: { userId: string; name: string; sessionId?: string };
  try {
    const result = await jwtVerify(token, JWT_SECRET);
    payload = result.payload as typeof payload;
    if (!payload.userId) return null;
  } catch {
    return null;
  }

  // Step 2: DB session check
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  const session = rows[0];

  // Step 3: Update lastSeenAt at most once per 5 minutes
  const lastSeen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : 0;
  if (Date.now() - lastSeen > FIVE_MINUTES_MS) {
    await db
      .update(sessions)
      .set({ lastSeenAt: now })
      .where(eq(sessions.id, session.id));
  }

  return { userId: session.userId, name: payload.name, sessionId: session.id };
}
