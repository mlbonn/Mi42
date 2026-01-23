import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql, eq, desc, and } from "drizzle-orm";
import { mysqlTable, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";
import crypto from "crypto";

// Define contact_phones table schema for Drizzle
const contactPhones = mysqlTable("contact_phones", {
  id: varchar("id", { length: 64 }).primaryKey(),
  contactId: varchar("contactId", { length: 64 }).notNull(),
  phoneType: varchar("phoneType", { length: 20 }),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  isPrimary: boolean("isPrimary"),
  createdAt: timestamp("createdAt"),
});

// Input validation schemas
const phoneInput = z.object({
  contactId: z.string(),
  phoneType: z.enum(["business", "mobile", "private", "fax", "office"]).default("business"),
  phoneNumber: z.string(),
  isPrimary: z.boolean().default(false),
});

const phoneUpdateInput = z.object({
  id: z.string(),
  phoneType: z.enum(["business", "mobile", "private", "fax", "office"]).optional(),
  phoneNumber: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const contactPhonesRouter = router({
  // List all phones for a contact
  listByContact: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = await db
        .select()
        .from(contactPhones)
        .where(eq(contactPhones.contactId, input.contactId))
        .orderBy(desc(contactPhones.isPrimary));
      return results;
    }),

  // Get single phone by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = await db
        .select()
        .from(contactPhones)
        .where(eq(contactPhones.id, input.id));
      return results[0] || null;
    }),

  // Create new phone
  create: publicProcedure
    .input(phoneInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = crypto.randomUUID();
      
      // If this is set as primary, unset other primary phones for this contact
      if (input.isPrimary) {
        await db
          .update(contactPhones)
          .set({ isPrimary: false })
          .where(eq(contactPhones.contactId, input.contactId));
      }

      await db.insert(contactPhones).values({
        id,
        contactId: input.contactId,
        phoneType: input.phoneType,
        phoneNumber: input.phoneNumber,
        isPrimary: input.isPrimary,
      });

      return { id, ...input };
    }),

  // Update phone
  update: publicProcedure
    .input(phoneUpdateInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      
      // If setting as primary, unset other primary phones
      if (updates.isPrimary) {
        const existing = await db
          .select()
          .from(contactPhones)
          .where(eq(contactPhones.id, id));
        
        if (existing[0]) {
          await db
            .update(contactPhones)
            .set({ isPrimary: false })
            .where(and(
              eq(contactPhones.contactId, existing[0].contactId),
              sql`${contactPhones.id} != ${id}`
            ));
        }
      }

      await db
        .update(contactPhones)
        .set(updates)
        .where(eq(contactPhones.id, id));

      return { success: true, id };
    }),

  // Delete phone
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(contactPhones)
        .where(eq(contactPhones.id, input.id));
      return { success: true };
    }),

  // Set primary phone
  setPrimary: publicProcedure
    .input(z.object({ id: z.string(), contactId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Unset all primary for this contact
      await db
        .update(contactPhones)
        .set({ isPrimary: false })
        .where(eq(contactPhones.contactId, input.contactId));
      // Set this one as primary
      await db
        .update(contactPhones)
        .set({ isPrimary: true })
        .where(eq(contactPhones.id, input.id));
      return { success: true };
    }),
});
