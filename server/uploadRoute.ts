/**
 * File Upload Route for Activities
 * Handles file uploads (Office, PDF, Images) and email archiving
 */
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import crypto from "crypto";
import { getDb } from "./db";
import { attachments, activities, contacts } from "../drizzle/schema";
import { eq, like, or } from "drizzle-orm";

const router = Router();

// Configure multer for file uploads
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// Allowed file types
const ALLOWED_MIME_TYPES = [
  // Office documents
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // PDF
  "application/pdf",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Text
  "text/plain",
  "text/csv",
];

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = UPLOAD_DIR;
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: UUID + original extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * POST /api/upload/activity-file
 * Upload a file and create an activity with attachment
 */
router.post("/activity-file", upload.single("file"), async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { contactId, companyId, corporationId } = req.body;

    if (!contactId && !companyId && !corporationId) {
      // Delete uploaded file if no association provided
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ 
        error: "At least one of contactId, companyId, or corporationId is required" 
      });
    }

    // Create activity with file as subject (filename = description)
    const activityId = crypto.randomUUID();
    const originalFileName = req.file.originalname;
    
    await db.insert(activities).values({
      id: activityId,
      contactId: contactId || null,
      companyId: companyId || null,
      corporationId: corporationId || null,
      activityType: "Document",
      subject: originalFileName, // Filename as description
      content: `Uploaded file: ${originalFileName}`,
      direction: "Internal",
      hasAttachment: true,
      attachmentCount: 1,
      activityDate: new Date(),
      createdAt: new Date(),
    });

    // Create attachment record
    const attachmentId = crypto.randomUUID();
    const relativePath = path.relative(process.cwd(), req.file.path);

    await db.insert(attachments).values({
      id: attachmentId,
      activityId,
      fileName: req.file.filename,
      originalFileName,
      filePath: relativePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    });

    res.json({
      success: true,
      activity: {
        id: activityId,
        subject: originalFileName,
        activityType: "Document",
        activityDate: new Date().toISOString(),
      },
      attachment: {
        id: attachmentId,
        fileName: originalFileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        downloadUrl: `/api/download/${attachmentId}`,
      },
    });
  } catch (error: any) {
    console.error("[Upload] Error:", error);
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

/**
 * GET /api/download/:attachmentId
 * Download an attachment file
 */
router.get("/download/:attachmentId", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const { attachmentId } = req.params;

    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId))
      .limit(1);

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const filePath = path.join(process.cwd(), attachment.filePath);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName}"`);
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");

    // Stream file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("[Download] Error:", error);
    res.status(500).json({ error: error.message || "Download failed" });
  }
});

/**
 * POST /api/email-archive/webhook
 * Webhook endpoint for email archiving via forwarding
 * Email forwarded to FRIDAYarchiv@BL2020.com will be processed here
 */
router.post("/email-archive/webhook", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // Expected payload from email forwarding service (e.g., SmarterMail, Mailgun, SendGrid)
    const {
      from,           // Original sender email
      to,             // Should be FRIDAYarchiv@BL2020.com
      subject,        // Email subject
      body,           // Email body (plain text or HTML)
      html,           // HTML body if available
      date,           // Email date
      messageId,      // Unique message ID
      attachments: emailAttachments, // Array of attachments if any
    } = req.body;

    // Extract sender email address
    const senderEmail = extractEmail(from);
    
    if (!senderEmail) {
      return res.status(400).json({ error: "Could not extract sender email" });
    }

    // Find contact by email
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, senderEmail))
      .limit(1);

    if (!contact) {
      // Try to find in contact_emails table or log for manual assignment
      console.log(`[Email Archive] No contact found for email: ${senderEmail}`);
      return res.status(200).json({ 
        success: false, 
        message: `No contact found for email: ${senderEmail}`,
        archived: false,
      });
    }

    // Create activity for the archived email
    const activityId = crypto.randomUUID();
    
    await db.insert(activities).values({
      id: activityId,
      contactId: contact.id,
      companyId: null, // Could be enhanced to look up company
      corporationId: null,
      activityType: "Email",
      subject: subject || "(No Subject)",
      content: html || body || "",
      direction: "Inbound", // Forwarded emails are typically inbound
      emailMessageId: messageId,
      hasAttachment: emailAttachments && emailAttachments.length > 0,
      attachmentCount: emailAttachments?.length || 0,
      activityDate: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    });

    // Handle attachments if present
    if (emailAttachments && Array.isArray(emailAttachments)) {
      for (const att of emailAttachments) {
        // Save attachment to disk
        const ext = path.extname(att.filename) || ".bin";
        const uniqueName = `${crypto.randomUUID()}${ext}`;
        const filePath = path.join(UPLOAD_DIR, uniqueName);
        
        // Decode base64 content if provided
        if (att.content) {
          const buffer = Buffer.from(att.content, "base64");
          await fs.writeFile(filePath, buffer);
          
          // Create attachment record
          await db.insert(attachments).values({
            id: crypto.randomUUID(),
            activityId,
            fileName: uniqueName,
            originalFileName: att.filename,
            filePath: path.relative(process.cwd(), filePath),
            fileSize: buffer.length,
            mimeType: att.contentType || "application/octet-stream",
            uploadedAt: new Date(),
          });
        }
      }
    }

    res.json({
      success: true,
      message: "Email archived successfully",
      activityId,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
    });
  } catch (error: any) {
    console.error("[Email Archive] Error:", error);
    res.status(500).json({ error: error.message || "Email archiving failed" });
  }
});

/**
 * Helper function to extract email address from "Name <email>" format
 */
function extractEmail(fromField: string): string | null {
  if (!fromField) return null;
  
  // Try to match email in angle brackets: "Name <email@example.com>"
  const angleMatch = fromField.match(/<([^>]+)>/);
  if (angleMatch) {
    return angleMatch[1].toLowerCase();
  }
  
  // Try to match plain email
  const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    return emailMatch[0].toLowerCase();
  }
  
  return null;
}



/**
 * GET /api/download/activity/:activityId
 * Download attachment by activity ID (finds the first attachment for the activity)
 */
router.get("/activity/:activityId", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    const { activityId } = req.params;
    
    // Find attachment by activity ID
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.activityId, activityId))
      .limit(1);
    if (!attachment) {
      return res.status(404).json({ error: "No attachment found for this activity" });
    }
    const filePath = path.join(process.cwd(), attachment.filePath);
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: "File not found on disk" });
    }
    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName}"`);
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    // Stream file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("[Download by Activity] Error:", error);
    res.status(500).json({ error: error.message || "Download failed" });
  }
});

export default router;
