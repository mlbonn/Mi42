/**
 * Hunter Agent tRPC Router
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  createHunterJob,
  getHunterJob,
  getAllHunterJobs,
  getHunterJobsByCorporation,
  getHunterResult,
  getHunterResultsByJob,
  getHunterResultsByCorporation,
  getPendingHunterResults,
  updateHunterResult,
  bulkUpdateHunterResults,
  createContactFromHunterResult,
  getHunterStats
} from "./hunterDb";
import { processHunterJob } from "./services/hunterService";

export const hunterRouter = router({
  // ============================================================================
  // JOBS
  // ============================================================================

  createJob: protectedProcedure
    .input(z.object({
      corporationId: z.string(),
      targetRoles: z.array(z.string()).optional(),
      targetCount: z.number().default(5),
      priority: z.number().default(5)
    }))
    .mutation(async ({ input }) => {
      const jobId = await createHunterJob({
        corporationId: input.corporationId,
        targetRoles: input.targetRoles || ["CEO", "VP Sales", "Market Research Manager"],
        targetCount: input.targetCount,
        priority: input.priority,
        status: "pending"
      });

      // Trigger async processing
      processHunterJob(jobId).catch(err => {
        console.error(`[HunterRouter] Failed to process job ${jobId}:`, err);
      });

      return { jobId };
    }),

  getJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return await getHunterJob(input.jobId);
    }),

  listJobs: protectedProcedure.query(async () => {
    return await getAllHunterJobs();
  }),

  getJobsByCorporation: protectedProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getHunterJobsByCorporation(input.corporationId);
    }),

  // ============================================================================
  // RESULTS
  // ============================================================================

  getResult: protectedProcedure
    .input(z.object({ resultId: z.string() }))
    .query(async ({ input }) => {
      return await getHunterResult(input.resultId);
    }),

  getResultsByJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return await getHunterResultsByJob(input.jobId);
    }),

  getResultsByCorporation: protectedProcedure
    .input(z.object({ corporationId: z.string() }))
    .query(async ({ input }) => {
      return await getHunterResultsByCorporation(input.corporationId);
    }),

  getPendingResults: protectedProcedure.query(async () => {
    return await getPendingHunterResults();
  }),

  // ============================================================================
  // REVIEW
  // ============================================================================

  reviewResult: protectedProcedure
    .input(z.object({
      resultId: z.string(),
      action: z.enum(["approve", "reject"])
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.action === "approve") {
        // Create contact from hunter result
        const contactId = await createContactFromHunterResult(input.resultId, ctx.user.id);
        return { success: true, contactId };
      } else {
        // Reject
        await updateHunterResult(input.resultId, {
          reviewStatus: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date()
        });
        return { success: true };
      }
    }),

  bulkReview: protectedProcedure
    .input(z.object({
      resultIds: z.array(z.string()),
      action: z.enum(["approve", "reject"])
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.action === "approve") {
        // Approve all
        const contactIds: string[] = [];
        for (const resultId of input.resultIds) {
          const contactId = await createContactFromHunterResult(resultId, ctx.user.id);
          contactIds.push(contactId);
        }
        return { success: true, contactIds };
      } else {
        // Reject all
        await bulkUpdateHunterResults(input.resultIds, {
          reviewStatus: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date()
        });
        return { success: true };
      }
    }),

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats: protectedProcedure.query(async () => {
    return await getHunterStats();
  })
});

