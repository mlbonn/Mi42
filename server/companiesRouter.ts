import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getAllCompanies,
  getCompany,
  getCompaniesByCorporation,
  createCompany,
  updateCompany,
} from "./db";

export const companiesRouter = router({
  // List all companies with pagination
  list: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        corporationId: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;
      
      let companies = input?.corporationId
        ? await getCompaniesByCorporation(input.corporationId)
        : await getAllCompanies();
      
      // Apply filters
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        companies = companies.filter(
          (c: any) =>
            c.name?.toLowerCase().includes(searchLower) ||
            c.city?.toLowerCase().includes(searchLower) ||
            c.country?.toLowerCase().includes(searchLower)
        );
      }
      
      if (input?.country) {
        companies = companies.filter(
          (c: any) => c.country?.toLowerCase() === input.country?.toLowerCase()
        );
      }
      
      // Apply pagination
      const total = companies.length;
      const paginatedCompanies = companies.slice(offset, offset + limit);
      
      return {
        data: paginatedCompanies,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),

  // Get single company by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getCompany(input.id);
    }),

  // Get companies by corporation
  getByCorporation: publicProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getCompaniesByCorporation(input.corporationId);
    }),
  // Alias for listByCorporation (used by frontend)
  listByCorporation: publicProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getCompaniesByCorporation(input.corporationId);
    }),

  // Create new company
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        city: z.string().optional(),
        country: z.string().optional(),
        website: z.string().optional(),
        products: z.string().optional(),
        corporationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createCompany(input);
    }),

  // Update company
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        website: z.string().optional(),
        products: z.string().optional(),
        corporationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await updateCompany(id, data);
    }),
});
