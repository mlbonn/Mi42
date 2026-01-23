import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import * as db from "./db";
import { ENV } from "./_core/env";

const router = Router();
const JWT_SECRET = ENV.jwtSecret || "your-secret-key-change-in-production";
const JWT_EXPIRY = "7d";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

router.post("/auth/jwt/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await db.authenticateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email || "",
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[REST API] Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/jwt/verify", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await db.getUser(decoded.userId);
    
    if (!user) {
      return res.json({ valid: false, user: null });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.json({ valid: false, user: null });
  }
});

// ============================================================================
// CONTACTS
// ============================================================================

router.get("/contacts", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const contacts = await db.getAllContacts();
    const total = contacts.length;
    const paginatedContacts = contacts.slice(offset, offset + limit);
    
    res.json({
      data: paginatedContacts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("[REST API] Get contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/contacts/search", async (req, res) => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      return res.status(400).json({ error: "Email parameter required" });
    }

    const contacts = await db.searchContactsByEmail(email);
    
    res.json({ data: contacts });
  } catch (error) {
    console.error("[REST API] Search contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, position, companyId } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: "firstName and lastName required" });
    }

    const contact = await db.createContact({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      position: position || null,
    });
    
    res.json({ data: contact });
  } catch (error) {
    console.error("[REST API] Create contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// ACTIVITIES
// ============================================================================

router.post("/activities", async (req, res) => {
  try {
    const { contactId, companyId, type, subject, content, direction, activityDate } = req.body;
    
    if (!type || !subject) {
      return res.status(400).json({ error: "type and subject required" });
    }

    const activity = await db.createActivity({
      contactId: contactId || null,
      companyId: companyId || null,
      type,
      subject,
      content: content || null,
      direction: direction || null,
      activityDate: activityDate ? new Date(activityDate) : new Date(),
    });
    
    res.json({ data: activity });
  } catch (error) {
    console.error("[REST API] Create activity error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// COMPANIES
// ============================================================================

router.get("/companies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const company = await db.getCompany(id);
    
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    
    res.json({ data: company });
  } catch (error) {
    console.error("[REST API] Get company error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// CORPORATIONS
// ============================================================================

router.get("/corporations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const corporation = await db.getCorporation(id);
    
    if (!corporation) {
      return res.status(404).json({ error: "Corporation not found" });
    }
    
    res.json({ data: corporation });
  } catch (error) {
    console.error("[REST API] Get corporation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

// DEBUG ENDPOINT
router.post("/auth/test", async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = await import("bcryptjs");
    
    // Get user from DB
    const allUsers = await db.getAllUsers();
    const user = allUsers.find(u => u.email === email);
    
    if (!user) {
      return res.json({ error: "User not found", totalUsers: allUsers.length });
    }
    
    if (!user.passwordHash) {
      return res.json({ error: "No password hash", user: { id: user.id, email: user.email } });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    res.json({ 
      userFound: true,
      hasPasswordHash: !!user.passwordHash,
      passwordValid: isValid,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    res.json({ error: error.message, stack: error.stack });
  }
});
