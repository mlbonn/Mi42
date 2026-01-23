import { z } from "zod";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";

// Login attempt tracking (in-memory, resets on server restart)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(username: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(username);
  
  if (!attempts) {
    return true; // No previous attempts
  }
  
  // Reset if lockout period has passed
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(username);
    return true;
  }
  
  // Check if locked out
  if (attempts.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  return true;
}

function recordLoginAttempt(username: string, success: boolean) {
  if (success) {
    loginAttempts.delete(username);
    return;
  }
  
  const now = Date.now();
  const attempts = loginAttempts.get(username);
  
  if (!attempts) {
    loginAttempts.set(username, { count: 1, lastAttempt: now });
  } else {
    attempts.count++;
    attempts.lastAttempt = now;
  }
}

export const authRouter = router({
  // Login with username/password
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Rate limiting
      if (!checkRateLimit(input.username)) {
        throw new Error("Too many login attempts. Please try again in 15 minutes.");
      }
      
      // Find user by username
      const users = await db.getUserByUsername(input.username);
      
      if (!users || users.length === 0) {
        recordLoginAttempt(input.username, false);
        throw new Error("Invalid username or password");
      }
      
      const user = users[0];
      
      // Check if user has a password set (prefer password column)
      const storedHash = user.password || user.passwordHash;
      
      if (!storedHash) {
        recordLoginAttempt(input.username, false);
        throw new Error("Invalid username or password");
      }
      
      // Verify password
      const isValid = await bcrypt.compare(input.password, storedHash);
      
      if (!isValid) {
        recordLoginAttempt(input.username, false);
        throw new Error("Invalid username or password");
      }
      
      // Success - record and create session
      recordLoginAttempt(input.username, true);
      
      // Update last signed in
      await db.updateUserLastSignedIn(user.id);
      
      // Create session token
      const sessionToken = await sdk.createSessionToken(user.id, {
        name: user.name || user.username || "",
        expiresInMs: ONE_YEAR_MS,
      });
      
      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS 
      });
      
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

  // Get current user
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    const users = await db.getUserById(ctx.user.id);
    
    if (!users || users.length === 0) {
      return null;
    }

    const user = users[0];

    return {
      id: user.id,
      username: user.username,
      name: user.name || user.email || user.username || "User",
      email: user.email,
      role: user.role,
    };
  }),

  // Logout
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
    };
    
    ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, secure: true });
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, secure: false });
    
    ctx.res.cookie(COOKIE_NAME, "", {
      ...cookieOptions,
      expires: new Date(0),
      maxAge: 0,
    });
    
    return { success: true };
  }),

  // Admin: List all users
  listUsers: adminProcedure.query(async () => {
    const users = await db.getAllUsers();
    return users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastSignedIn: user.lastSignedIn,
    }));
  }),

  // Admin: Create new user
  createUser: adminProcedure
    .input(
      z.object({
        username: z.string().min(3).max(50),
        password: z.string().min(8),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).default("user"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if username already exists
      const existing = await db.getUserByUsername(input.username);
      if (existing && existing.length > 0) {
        throw new Error("Username already exists");
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);
      
      // Create user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.createUserWithPassword({
        id: userId,
        email: input.email || input.username,
        name: input.name || input.username,
        passwordHash: hashedPassword,
        role: input.role === 'admin' ? 'super_admin' : 'staff',
        lastSignedIn: new Date(),
      });
      
      return {
        success: true,
        userId,
      };
    }),

  // Admin: Update user
  updateUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        username: z.string().min(3).max(50).optional(),
        password: z.string().min(8).optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updates: any = {};
      
      if (input.username) {
        // Check if username is taken by another user
        const existing = await db.getUserByUsername(input.username);
        if (existing && existing.length > 0 && existing[0].id !== input.userId) {
          throw new Error("Username already exists");
        }
        updates.username = input.username;
      }
      
      if (input.password) {
        updates.passwordHash = await bcrypt.hash(input.password, 12);
      }
      
      if (input.name !== undefined) updates.name = input.name;
      if (input.email !== undefined) updates.email = input.email;
      if (input.role) updates.role = input.role;
      
      await db.updateUser(input.userId, updates);
      
      return { success: true };
    }),

  // Admin: Delete user
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Prevent deleting yourself
      if (input.userId === ctx.user.id) {
        throw new Error("Cannot delete your own account");
      }
      
      await db.deleteUser(input.userId);
      
      return { success: true };
    }),
});
