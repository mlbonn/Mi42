import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllCorporations,
  getCorporation,
  createCorporation,
  updateCorporation,
} from "./db";

export const corporationsRouter = router({
  // List all corporations with pagination
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      
      let corporations = await getAllCorporations();
      
      // Apply filters
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        corporations = corporations.filter(
          (c: any) =>
            c.name?.toLowerCase().includes(searchLower) ||
            c.country?.toLowerCase().includes(searchLower)
        );
      }
      
      if (input?.status) {
        corporations = corporations.filter(
          (c: any) => c.status?.toLowerCase() === input.status?.toLowerCase()
        );
      }
      
      if (input?.priority) {
        corporations = corporations.filter(
          (c: any) => c.priority?.toLowerCase() === input.priority?.toLowerCase()
        );
      }
      
      if (input?.country) {
        corporations = corporations.filter(
          (c: any) => c.country?.toLowerCase() === input.country?.toLowerCase()
        );
      }
      
      // Apply pagination
      const total = corporations.length;
      const paginatedCorporations = corporations.slice(offset, offset + limit);
      
      return {
        data: paginatedCorporations,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),

  // Get single corporation by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getCorporation(input.id);
    }),

  // Create new corporation
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        status: z.string().optional(),
        priority: z.string().optional(),
        revenue: z.number().optional(),
        country: z.string().optional(),
        keyword1: z.string().optional(),
        keyword2: z.string().optional(),
        companySize: z.string().optional(),
        responsiblePerson: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createCorporation(input);
    }),

  // Update corporation
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        revenue: z.number().optional(),
        country: z.string().optional(),
        keyword1: z.string().optional(),
        keyword2: z.string().optional(),
        companySize: z.string().optional(),
        responsiblePerson: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateCorporation(id, data);
    }),
});
