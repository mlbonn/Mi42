/**
 * JWT Authentication Router for REST API
 * Provides login, verify, and refresh endpoints for VSTO Add-in
 */

import { Router } from "express";
import jwt from "jsonwebtoken";
import { authenticateUser } from "../db";

const router = Router();

// JWT Secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "24h"; // Token expires in 24 hours
const JWT_REFRESH_EXPIRES_IN = "7d"; // Refresh token expires in 7 days

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh";
}

/**
 * POST /api/auth/jwt/login
 * Login with email and password, returns JWT token
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Authenticate user
    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: "access",
      } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: "refresh",
      } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    console.log(`[JWT Auth] Login successful: ${email}`);

    res.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[JWT Auth] Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/jwt/verify
 * Verify JWT token validity
 */
router.post("/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

      if (decoded.type !== "access") {
        return res.status(401).json({ error: "Invalid token type" });
      }

      res.json({
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        },
      });
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("[JWT Auth] Verify error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/jwt/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as JWTPayload;

      if (decoded.type !== "refresh") {
        return res.status(401).json({ error: "Invalid token type" });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          type: "access",
        } as JWTPayload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      console.log(`[JWT Auth] Token refreshed for: ${decoded.email}`);

      res.json({
        token: newAccessToken,
      });
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
  } catch (error) {
    console.error("[JWT Auth] Refresh error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
