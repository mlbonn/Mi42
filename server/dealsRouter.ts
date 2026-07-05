import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getDealsByCorporation,
  getDealsByCompany,
  getDealsByUser,
  createDeal,
  updateDealStage,
  getAllDeals,
} from "./db";

export const dealsRouter = router({
  // List all deals
  list: publicProcedure.query(async () => {
    return await getAllDeals();
  }),

  // List deals by corporation
  listByCorporation: publicProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getDealsByCorporation(input.corporationId);
    }),

  // List deals by company
  listByCompany: publicProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      return await getDealsByCompany(input.companyId);
    }),

  // List deals by user
  listByUser: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return await getDealsByUser(input.userId);
    }),

  // Create new deal
  create: publicProcedure
    .input(
      z.object({
        title: z.string(),
        value: z.number().optional(),
        stage: z.string().optional(),
        probability: z.number().optional(),
        expectedCloseDate: z.string().optional(),
        corporationId: z.string().optional(),
        companyId: z.string().optional(),
        contactId: z.string().optional(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, ...dealData } = input;
      return await createDeal(dealData as any, userId);
    }),

  // Update deal stage
  updateStage: publicProcedure
    .input(
      z.object({
        dealId: z.string(),
        stage: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await updateDealStage(input.dealId, input.stage);
    }),
  // Update deal
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        stage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.stage) {
        return await updateDealStage(input.id, input.stage);
      }
      return null;
    }),
});
