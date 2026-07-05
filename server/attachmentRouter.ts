import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc.js";
import { getDb } from "./db.js";
import { attachments, activities } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_BASE = path.join(process.cwd(), "storage", "attachments");

export const attachmentRouter = router({
  // Get all attachments for an activity
  getByActivity: publicProcedure
    .input(z.object({ activityId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error('Database not available');
      const results = await db!
        .select()
        .from(attachments)
        .where(eq(attachments.activityId, input.activityId));
      return results;
    }),

  // Get single attachment metadata
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error('Database not available');
      const results = await db!
        .select()
        .from(attachments)
        .where(eq(attachments.id, input.id))
        .limit(1);
      return results[0] || null;
    }),

  // Delete attachment (file + DB entry)
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error('Database not available');
      // Get attachment metadata
      const attachment = await db!
        .select()
        .from(attachments)
        .where(eq(attachments.id, input.id))
        .limit(1);

      if (!attachment[0]) {
        throw new Error("Attachment not found");
      }

      // Delete file from filesystem
      const fullPath = path.join(process.cwd(), attachment[0].filePath);
      try {
        await fs.unlink(fullPath);
      } catch (err) {
        console.error("Error deleting file:", err);
        // Continue with DB deletion even if file deletion fails
      }

      // Delete from database
      await db!.delete(attachments).where(eq(attachments.id, input.id));

      // Update activity attachment count
      const activityId = attachment[0].activityId;
      const remainingAttachments = await db!
        .select()
        .from(attachments)
        .where(eq(attachments.activityId, activityId));

      await db!
        .update(activities)
        .set({
          attachmentCount: remainingAttachments.length,
          hasAttachment: remainingAttachments.length > 0,
        })
        .where(eq(activities.id, activityId));

      return { success: true };
    }),

  // Get file path for download (used by Express route)
  getFilePath: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
  if (!db) throw new Error('Database not available');
      const results = await db!
        .select()
        .from(attachments)
        .where(eq(attachments.id, input.id))
        .limit(1);

      if (!results[0]) {
        throw new Error("Attachment not found");
      }

      return {
        filePath: path.join(process.cwd(), results[0].filePath),
        originalFileName: results[0].originalFileName,
        mimeType: results[0].mimeType,
      };
    }),
});
