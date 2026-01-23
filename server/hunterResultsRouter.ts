import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { requireStaffOrHigher } from "./rbac";

export const hunterResultsRouter = router({
  // List all hunter results with filters
  list: publicProcedure
    .input(
      z.object({
        reviewStatus: z.enum(["all", "pending", "approved", "rejected"]).optional(),
        dataSource: z.string().optional(),
        corporationId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      await requireStaffOrHigher(ctx);
      return db.listHunterResults(input || {});
    }),

  // Get single hunter result by ID
  getById: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      await requireStaffOrHigher(ctx);
      return db.getHunterResultById(input);
    }),

  // Update review status
  updateReviewStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        reviewStatus: z.enum(["pending", "approved", "rejected"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await requireStaffOrHigher(ctx);
      return db.updateHunterResultReviewStatus(
        input.id,
        input.reviewStatus,
        user.id
      );
    }),

  // Add to CRM (create contact from hunter result)
  addToCRM: publicProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const user = await requireStaffOrHigher(ctx);
      return db.createContactFromHunterResult(input, user.id);
    }),

  // Get stats
  stats: publicProcedure.query(async ({ ctx }) => {
    await requireStaffOrHigher(ctx);
    return db.getHunterResultsStats();
  }),
});

