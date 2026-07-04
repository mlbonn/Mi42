import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "./env";
import * as db from "../db";

const JWT_SECRET = ENV.jwtSecret!;

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * JWT Middleware für Express
 * Validiert Bearer Token aus Authorization Header
 * Fügt user zu req hinzu wenn Token gültig
 */
export async function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // Kein Token, weiter ohne User
  }

  const token = authHeader.substring(7); // "Bearer " entfernen

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // User aus DB laden
    const user = await db.getUser(decoded.userId);
    
    if (user) {
      // User zu Request hinzufügen
      (req as any).user = user;
    }
  } catch (error) {
    // Token ungültig oder abgelaufen, ignorieren
    console.log("Invalid JWT token:", error);
  }

  next();
}
