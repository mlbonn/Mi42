import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "friday-crm-default-secret-change-in-production"
);

// Hash password with SHA-256 + encrypt for CalDAV
// Format: "sha256_hash|encrypted_password"
function hashPassword(password: string): string {
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  
  // Also encrypt password for CalDAV (AES-256-GCM)
  const { encryptPassword } = require('../encryption');
  const encryptedPassword = encryptPassword(password);
  
  // Store both: hash for login, encrypted for CalDAV
  return `${hash}|${encryptedPassword}`;
}

// Create JWT session token
async function createSessionToken(userId: string, name: string): Promise<string> {
  const token = await new SignJWT({ userId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(JWT_SECRET);
  
  return token;
}

// Verify JWT session token
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

export function registerSimpleAuthRoutes(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      console.log("[Auth Debug] Login attempt for:", username);
      // Find user by email (username)
      const users = await db.getUserByEmail(username);
      console.log("[Auth Debug] Users found:", users ? users.length : 0);
      
      if (!users || users.length === 0) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const user = users[0];

      // Check password (handle both old and new format)
      // Old format: "sha256_hash"
      // New format: "sha256_hash|encrypted_password"
      const storedHash = user.passwordHash.split('|')[0]; // Extract hash part
      const inputHash = crypto.createHash("sha256").update(password).digest("hex");
      
      console.log("[Auth Debug] Calculated hash:", inputHash);
      console.log("[Auth Debug] Stored hash:", storedHash);
      console.log("[Auth Debug] Hashes match:", storedHash === inputHash);
      
      if (storedHash !== inputHash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Update last signed in
      console.log(`[Auth] Updating lastSignedIn for user: ${user.id}`);
      try {
        await db.updateUserLastSignedIn(user.id);
        console.log(`[Auth] Successfully updated lastSignedIn for user: ${user.id}`);
      } catch (updateError) {
        console.error(`[Auth] Failed to update lastSignedIn:`, updateError);
      }

      // Create session token
      const sessionToken = await createSessionToken(user.id, user.name || user.email || "User");

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role 
        } 
      });
    } catch (error) {
      console.error("[Auth] Login failed - Full error:", error);
      console.error("[Auth] Error stack:", error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Register endpoint (optional - for creating first admin user)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { username, password, name } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    try {
      // Check if user already exists
      const existingUsers = await db.getUserByEmail(username);
      
      if (existingUsers && existingUsers.length > 0) {
        res.status(400).json({ error: "User already exists" });
        return;
      }

      // Create user
      const userId = crypto.randomUUID();
      const passwordHash = hashPassword(password);

      await db.createUserWithPassword({
        id: userId,
        email: username,
        name: name || username,
        passwordHash,
        role: "admin", // First user is admin
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await createSessionToken(userId, name || username);

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ 
        success: true, 
        user: { 
          id: userId, 
          name: name || username, 
          email: username,
          role: "admin"
        } 
      });
    } catch (error) {
      console.error("[Auth] Registration failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({ success: true });
  });

  // Check auth status
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const session = await verifySessionToken(token);

    if (!session) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    try {
      const users = await db.getUserById(session.userId);
      
      if (!users || users.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const user = users[0];

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      console.error("[Auth] Get user failed", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });
}



// Get user from request (for tRPC context)
export async function getUserFromRequest(req: Request): Promise<{ id: string; name: string | null; email: string | null; role: string | null } | null> {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session) {
    return null;
  }

  try {
    const users = await db.getUserById(session.userId);
    
    if (!users || users.length === 0) {
      return null;
    }

    const user = users[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error("[Auth] Get user from request failed", error);
    return null;
  }
}

