import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { distributionLists, contactDistributionLists } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const distributionListsRouter = router({
  // Get all distribution lists
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(distributionLists).orderBy(desc(distributionLists.createdAt));
  }),

  // Get a single distribution list by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [list] = await db.select().from(distributionLists).where(eq(distributionLists.id, input.id));
      return list;
    }),

  // Create a new distribution list
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      listType: z.enum(["newsletter", "event", "product_update", "press", "partner", "custom"]).default("newsletter"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = crypto.randomUUID();
      await db.insert(distributionLists).values({
        id,
        name: input.name,
        description: input.description,
        listType: input.listType,
      });
      return { id };
    }),

  // Update a distribution list
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      listType: z.enum(["newsletter", "event", "product_update", "press", "partner", "custom"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(distributionLists).set(data).where(eq(distributionLists.id, id));
      return { success: true };
    }),

  // Delete a distribution list
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(contactDistributionLists).where(eq(contactDistributionLists.distributionListId, input.id));
      await db.delete(distributionLists).where(eq(distributionLists.id, input.id));
      return { success: true };
    }),

  // Get all lists for a specific contact
  getByContactId: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db
        .select({
          id: contactDistributionLists.id,
          listId: distributionLists.id,
          listName: distributionLists.name,
          listType: distributionLists.listType,
          description: distributionLists.description,
          subscribedAt: contactDistributionLists.subscribedAt,
          isActive: contactDistributionLists.isActive,
          source: contactDistributionLists.source,
        })
        .from(contactDistributionLists)
        .innerJoin(distributionLists, eq(contactDistributionLists.distributionListId, distributionLists.id))
        .where(eq(contactDistributionLists.contactId, input.contactId));
      return results;
    }),

  // Add contact to distribution list
  addContact: publicProcedure
    .input(z.object({
      contactId: z.string(),
      distributionListId: z.string(),
      source: z.enum(["manual", "widget", "import", "api"]).default("manual"),
      sourceDetails: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const id = crypto.randomUUID();
      await db.insert(contactDistributionLists).values({
        id,
        contactId: input.contactId,
        distributionListId: input.distributionListId,
        source: input.source,
        sourceDetails: input.sourceDetails,
      });
      return { id };
    }),

  // Remove contact from distribution list
  removeContact: publicProcedure
    .input(z.object({
      contactId: z.string(),
      distributionListId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(contactDistributionLists).where(
        and(
          eq(contactDistributionLists.contactId, input.contactId),
          eq(contactDistributionLists.distributionListId, input.distributionListId)
        )
      );
      return { success: true };
    }),

  // Toggle contact subscription status
  toggleSubscription: publicProcedure
    .input(z.object({
      contactId: z.string(),
      distributionListId: z.string(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(contactDistributionLists)
        .set({ 
          isActive: input.isActive,
          unsubscribedAt: input.isActive ? null : new Date(),
        })
        .where(
          and(
            eq(contactDistributionLists.contactId, input.contactId),
            eq(contactDistributionLists.distributionListId, input.distributionListId)
          )
        );
      return { success: true };
    }),
});
