import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const router = Router();

// Configure multer for temporary email attachment uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "tmp", "email-attachments");
    
    // Create directory if it does not exist
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
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".com", ".scr", ".vbs", ".js"];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(ext)) {
      cb(new Error(`File type ${ext} is not allowed`));
      return;
    }
    
    cb(null, true);
  },
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("[EMAIL ATTACHMENT] File uploaded:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.json({
      success: true,
      file: {
        id: req.file.filename,
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error: any) {
    console.error("[EMAIL ATTACHMENT] Upload error:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
});

router.delete("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), "tmp", "email-attachments", filename);

    await fs.unlink(filePath);
    
    console.log("[EMAIL ATTACHMENT] File deleted:", filename);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("[EMAIL ATTACHMENT] Delete error:", error);
    res.status(500).json({ error: error.message || "Delete failed" });
  }
});

export default router;
