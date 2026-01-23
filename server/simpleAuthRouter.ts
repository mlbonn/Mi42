import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcrypt";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);
const COOKIE_NAME = "app_session_id";

export const simpleAuthRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { username, password } = input;
      
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // Find user by username or email
      const result = await db.execute(
        sql`SELECT id, username, password, passwordHash, name, email, role FROM users WHERE username = ${username} OR email = ${username} LIMIT 1`
      );
      
      const users = result[0] as any[];
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
        .setExpirationTime("1y")
        .sign(JWT_SECRET);

      // Set cookie - compatible with all browsers
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60 * 1000,
        path: "/",
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

      const result = await db.execute(
        sql`SELECT id, username, name, email, role FROM users WHERE id = ${payload.userId as string} LIMIT 1`
      );
      
      const users = result[0] as any[];
      if (!users || users.length === 0) {
        return null;
      }

      return users[0];
    } catch (error) {
      return null;
    }
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return { success: true };
  }),
});

