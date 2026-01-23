import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getDb } from "../db.js";
import { attachments, activities } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uploadDir = path.join(process.cwd(), "storage", "attachments", String(year), month);
    
    // Create directory if it doesn't exist
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${uuid}_${safeBaseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Upload attachment
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { activityId } = req.body;
    if (!activityId) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: "activityId is required" });
    }

    // Get relative path from project root
    const relativePath = path.relative(process.cwd(), req.file.path);

    // Insert into database
    const db = await getDb();
    const attachmentId = crypto.randomUUID();
    await db.insert(attachments).values({
      id: attachmentId,
      activityId,
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      filePath: relativePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    // Update activity attachment count
    const activityAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.activityId, activityId));

    await db
      .update(activities)
      .set({
        attachmentCount: activityAttachments.length,
        hasAttachment: true,
      })
      .where(eq(activities.id, activityId));

    res.json({
      success: true,
      attachment: {
        id: attachmentId,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download attachment
router.get("/:id/download", async (req, res) => {
  try {
    const { id } = req.params;

    const db = await getDb();
    const results = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1);

    if (!results[0]) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = results[0];
    const fullPath = path.join(process.cwd(), attachment.filePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Set headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName}"`);
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");

    // Stream file to response
    const fileStream = await fs.readFile(fullPath);
    res.send(fileStream);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;
