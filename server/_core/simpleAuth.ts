import { COOKIE_NAME } from "@shared/const";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { getSessionCookieOptions } from "./cookies";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Create a JWT session token (30 days).
 * The token is stored in the sessions table by the caller.
 */
export async function createSessionToken(userId: string, name: string): Promise<string> {
  return new SignJWT({ userId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Verify JWT only (no DB check).
 * Use validateSession() from sessionService.ts for full session validation.
 * @deprecated Prefer validateSession() for all auth checks.
 */
export async function verifySessionToken(token: string): Promise<{ userId: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOpts(req: Request) {
  return getSessionCookieOptions(req);
}
