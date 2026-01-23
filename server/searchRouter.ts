/**
 * FRIDAY CRM - Search Router
 * Globale Suche über alle Entitäten
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { globalSearch } from "./db";

export const searchRouter = router({
  // Global search across all entities
  global: publicProcedure
    .input(z.object({ 
      query: z.string(),
      limit: z.number().optional().default(10)
    }))
    .query(async ({ input }) => {
      const { query, limit } = input;
      
      if (query.length < 2) {
        return {
          corporations: [],
          companies: [],
          contacts: [],
          deals: [],
          emails: []
        };
      }
      
      const results = await globalSearch(query, limit);
      
      return {
        corporations: results.corporations || [],
        companies: results.companies || [],
        contacts: results.contacts || [],
        deals: [], // TODO: Add deals search
        emails: []  // TODO: Add emails search
      };
    }),
});

