import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcrypt";
import crypto from "crypto";


// Simple in-memory rate limiter for login endpoint
const _loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // max 10 attempts per window per IP

function _checkRateLimit(ip: string, username?: string): boolean {
  const key = username ? `${ip}:${username.toLowerCase()}` : ip;
  const now = Date.now();
  const entry = _loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    _loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}
function _clearRateLimit(ip: string, username?: string) {
  const key = username ? `${ip}:${username.toLowerCase()}` : ip;
  _loginAttempts.delete(key);
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET!
);
const COOKIE_NAME = "app_session_id";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export const simpleAuthRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Rate limiting: max 10 attempts per IP per 15 minutes
      const clientIp = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || ctx.req.socket?.remoteAddress || 'unknown';
      if (!_checkRateLimit(clientIp, input.username)) {
        throw new Error('Too many login attempts. Please try again in 15 minutes.');
      }
      const { username, password } = input;
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      // Find user by username or email
      const result = await db.execute(
        sql`SELECT id, username, password, passwordHash, name, email, role FROM users WHERE username = ${username} OR email = ${username} LIMIT 1`
      );
      const users = (result as unknown as any[][])[0];
      if (!users || users.length === 0) {
        throw new Error("Invalid username or password");
      }
      const user = users[0];
      // Get stored password (bcrypt hash)
      const storedHash = user.password || user.passwordHash;
      if (!storedHash) {
        throw new Error("Invalid username or password");
      }
      // Verify password with bcrypt
      const isValid = await bcrypt.compare(password, storedHash);
      if (!isValid) {
        throw new Error("Invalid username or password");
      }
      // Update lastSignedIn timestamp
      try {
        await db.execute(
          sql`UPDATE users SET lastSignedIn = NOW() WHERE id = ${user.id}`
        );
      } catch (updateError) {
        console.error("Failed to update lastSignedIn:", updateError);
      }
      // Create JWT token with jose
      const token = await new SignJWT({
        userId: user.id,
        name: user.name,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(JWT_SECRET);
      // Session-Row in DB anlegen
      const tokenHash = sha256Hex(token);
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const userAgent = ctx.req.headers["user-agent"] || null;
      const ipAddress = ctx.req.ip || ctx.req.socket?.remoteAddress || null;
      try {
        await db.execute(
          sql`INSERT INTO sessions (id, userId, tokenHash, expiresAt, userAgent, ipAddress)
              VALUES (${sessionId}, ${user.id}, ${tokenHash}, ${expiresAt}, ${userAgent}, ${ipAddress})`
        );
      } catch (sessionError) {
        console.error("[Auth] Failed to create session row:", sessionError);
        // Kein Hard-Fail – Token ist trotzdem gültig
      }
      // Set cookie - compatible with all browsers
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 Tage
        path: "/",
      });
      _clearRateLimit(clientIp, input.username);
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),
  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies[COOKIE_NAME];
    if (!token) {
      return null;
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const db = await getDb();
      if (!db) {
        return null;
      }
      // Session-Validierung
      const tokenHash = sha256Hex(token);
      const sessionResult = await db.execute(
        sql`SELECT id, revokedAt, expiresAt FROM sessions WHERE tokenHash = ${tokenHash} LIMIT 1`
      );
      const sessions = (sessionResult as unknown as any[][])[0];
      if (!sessions || sessions.length === 0) {
        // Kein Session-Row – Token noch gültig (Legacy-Kompatibilität)
        // Wird nach vollständiger Migration entfernt
      } else {
        const session = sessions[0];
        if (session.revokedAt) {
          return null; // Session widerrufen
        }
        if (new Date(session.expiresAt) < new Date()) {
          return null; // Session abgelaufen
        }
        // lastSeenAt max. 1x/5min updaten
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!session.lastSeenAt || new Date(session.lastSeenAt) < fiveMinAgo) {
          try {
            await db.execute(
              sql`UPDATE sessions SET lastSeenAt = NOW() WHERE id = ${session.id}`
            );
          } catch {
            // Non-critical
          }
        }
      }
      const result = await db.execute(
        sql`SELECT id, username, name, email, role FROM users WHERE id = ${payload.userId as string} LIMIT 1`
      );
      const users = (result as unknown as any[][])[0];
      if (!users || users.length === 0) {
        return null;
      }
      return users[0];
    } catch (error) {
      return null;
    }
  }),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.req.cookies[COOKIE_NAME];
    // Session in DB widerrufen
    if (token) {
      try {
        const db = await getDb();
        if (db) {
          const tokenHash = sha256Hex(token);
          await db.execute(
            sql`UPDATE sessions SET revokedAt = NOW() WHERE tokenHash = ${tokenHash} AND revokedAt IS NULL`
          );
        }
      } catch (err) {
        console.error("[Auth] Failed to revoke session:", err);
      }
    }
    ctx.res.clearCookie(COOKIE_NAME, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return { success: true };
  }),
});
