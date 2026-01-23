import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

// JWT Secret aus Environment
const JWT_SECRET = ENV.jwtSecret || "your-secret-key-change-in-production";
const JWT_EXPIRY = "7d"; // 7 Tage gültig
const DEV_MODE = process.env.DEV_MODE === 'true';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const jwtAuthRouter = router({
  // JWT Login - Gibt Token zurück
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      // DEV_MODE: Bypass authentication
      if (DEV_MODE) {
        console.log('[DEV_MODE] Auto-login as manus');
        const devUser = {
          id: 'manus',
          email: 'manus@friday-crm.com',
          name: 'Manus Admin',
          role: 'admin',
        };
        
        const payload: JwtPayload = {
          userId: devUser.id,
          email: devUser.email,
          role: devUser.role,
        };
        
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        
        return {
          token,
          user: devUser,
        };
      }
      
      const user = await db.authenticateUser(input.email, input.password);
      
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // JWT Token erstellen
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email || "",
        role: user.role,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }),

  // JWT Token verifizieren
  verify: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as JwtPayload;
        
        // User aus DB laden
        const user = await db.getUser(decoded.userId);
        
        if (!user) {
          return { valid: false, user: null };
        }

        return {
          valid: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      } catch (error) {
        return { valid: false, user: null };
      }
    }),

  // JWT Refresh - Neuen Token generieren
  refresh: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as JwtPayload;
        
        // User aus DB laden
        const user = await db.getUser(decoded.userId);
        
        if (!user) {
          throw new Error("User not found");
        }

        // Neuen Token erstellen
        const payload: JwtPayload = {
          userId: user.id,
          email: user.email || "",
          role: user.role,
        };

        const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        return {
          token: newToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        };
      } catch (error) {
        throw new Error("Invalid or expired token");
      }
    }),
});
