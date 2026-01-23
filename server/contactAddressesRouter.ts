import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { sql, eq, desc, and } from "drizzle-orm";
import { mysqlTable, varchar, text, datetime, boolean, timestamp } from "drizzle-orm/mysql-core";
import crypto from "crypto";

// Define contact_addresses table schema for Drizzle
const contactAddresses = mysqlTable("contact_addresses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  contactId: varchar("contactId", { length: 64 }).notNull(),
  companyId: varchar("companyId", { length: 64 }),
  addressType: varchar("addressType", { length: 20 }),
  street: varchar("street", { length: 100 }),
  zip: varchar("zip", { length: 20 }),
  city: varchar("city", { length: 50 }),
  state: varchar("state", { length: 50 }),
  country: varchar("country", { length: 50 }),
  poBox: varchar("poBox", { length: 20 }),
  poBoxZip: varchar("poBoxZip", { length: 20 }),
  isPrimary: boolean("isPrimary"),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// Input validation schemas
const addressInput = z.object({
  contactId: z.string(),
  companyId: z.string().optional(),
  addressType: z.enum(["business", "private", "delivery", "invoice"]).default("business"),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  poBox: z.string().optional(),
  poBoxZip: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

const addressUpdateInput = z.object({
  id: z.string(),
  addressType: z.enum(["business", "private", "delivery", "invoice"]).optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  poBox: z.string().optional(),
  poBoxZip: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const contactAddressesRouter = router({
  // List all addresses for a contact
  listByContact: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = await db
        .select()
        .from(contactAddresses)
        .where(eq(contactAddresses.contactId, input.contactId))
        .orderBy(desc(contactAddresses.isPrimary));
      return results;
    }),

  // Get single address by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const results = await db
        .select()
        .from(contactAddresses)
        .where(eq(contactAddresses.id, input.id));
      return results[0] || null;
    }),

  // Create new address
  create: publicProcedure
    .input(addressInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = crypto.randomUUID();
      
      // If this is set as primary, unset other primary addresses for this contact
      if (input.isPrimary) {
        await db
          .update(contactAddresses)
          .set({ isPrimary: false })
          .where(eq(contactAddresses.contactId, input.contactId));
      }

      await db.insert(contactAddresses).values({
        id,
        contactId: input.contactId,
        companyId: input.companyId || null,
        addressType: input.addressType,
        street: input.street || null,
        zip: input.zip || null,
        city: input.city || null,
        state: input.state || null,
        country: input.country || null,
        poBox: input.poBox || null,
        poBoxZip: input.poBoxZip || null,
        isPrimary: input.isPrimary,
      });

      return { id, ...input };
    }),

  // Update address
  update: publicProcedure
    .input(addressUpdateInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      
      // If setting as primary, unset other primary addresses
      if (updates.isPrimary) {
        const existing = await db
          .select()
          .from(contactAddresses)
          .where(eq(contactAddresses.id, id));
        
        if (existing[0]) {
          await db
            .update(contactAddresses)
            .set({ isPrimary: false })
            .where(and(
              eq(contactAddresses.contactId, existing[0].contactId),
              sql`${contactAddresses.id} != ${id}`
            ));
        }
      }

      await db
        .update(contactAddresses)
        .set(updates)
        .where(eq(contactAddresses.id, id));

      return { success: true, id };
    }),

  // Delete address
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(contactAddresses)
        .where(eq(contactAddresses.id, input.id));
      return { success: true };
    }),

  // Set primary address
  setPrimary: publicProcedure
    .input(z.object({ id: z.string(), contactId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Unset all primary for this contact
      await db
        .update(contactAddresses)
        .set({ isPrimary: false })
        .where(eq(contactAddresses.contactId, input.contactId));
      // Set this one as primary
      await db
        .update(contactAddresses)
        .set({ isPrimary: true })
        .where(eq(contactAddresses.id, input.id));
      return { success: true };
    }),
});
