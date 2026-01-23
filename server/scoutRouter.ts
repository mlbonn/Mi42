/**
 * FRIDAY CRM - Scout Agent tRPC Router
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import * as scoutDb from "./scoutDb";
import * as discoveryLlm from "./discoveryLlmService";
import { TRPCError } from "@trpc/server";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const scoutRouter = router({
  // ============================================================================
  // SCOUT QUEUE
  // ============================================================================

  addToQueue: adminProcedure
    .input(
      z.object({
        seedType: z.string(),
        seedData: z.any(),
        priority: z.number().optional(),
        generation: z.number().optional(),
        parentId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await scoutDb.addToScoutQueue({
        seedType: input.seedType,
        seedData: input.seedData,
        priority: input.priority || 5,
        status: "Pending",
        generation: input.generation || 0,
        parentId: input.parentId || null,
        discoveryMethod: null,
      });
    }),

  getQueueJobs: adminProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          generation: z.number().optional(),
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await scoutDb.getScoutQueueJobs(input);
    }),

  getQueueStats: adminProcedure.query(async () => {
    return await scoutDb.getScoutQueueStats();
  }),

  deleteQueueJob: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await scoutDb.deleteScoutQueueJob(input.id);
      return { success: true };
    }),

  retryQueueJob: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await scoutDb.retryScoutQueueJob(input.id);
      return { success: true };
    }),

  bulkDeleteQueueJobs: adminProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      for (const id of input.ids) {
        await scoutDb.deleteScoutQueueJob(id);
      }
      return { success: true, count: input.ids.length };
    }),

  bulkRetryQueueJobs: adminProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      for (const id of input.ids) {
        await scoutDb.retryScoutQueueJob(id);
      }
      return { success: true, count: input.ids.length };
    }),

  // ============================================================================
  // DISCOVERY METHODS
  // ============================================================================

  getDiscoveryMethods: adminProcedure.query(async () => {
    return await scoutDb.getDiscoveryMethods();
  }),

  updateDiscoveryMethod: adminProcedure
    .input(
      z.object({
        id: z.string(),
        enabled: z.boolean().optional(),
        priority: z.number().optional(),
        config: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await scoutDb.updateDiscoveryMethod(id, updates);
      return { success: true };
    }),

  seedDiscoveryMethods: adminProcedure.mutation(async () => {
    await scoutDb.seedDiscoveryMethods();
    return { success: true };
  }),

  createDiscoveryMethod: adminProcedure
    .input(
      z.object({
        name: z.string(),
        enabled: z.boolean().optional(),
        priority: z.number().optional(),
        config: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await scoutDb.createDiscoveryMethod(input);
    }),

  deleteDiscoveryMethod: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await scoutDb.deleteDiscoveryMethod(input.id);
      return { success: true };
    }),

  // ============================================================================
  // LLM-POWERED DISCOVERY
  // ============================================================================

  generateKeywords: adminProcedure
    .input(
      z.object({
        companyName: z.string(),
        industry: z.string().optional(),
        products: z.array(z.string()).optional(),
        competitors: z.array(z.string()).optional(),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await discoveryLlm.generateDiscoveryKeywords(input);
    }),

  analyzeCompanySimilarity: adminProcedure
    .input(
      z.object({
        sourceCompany: z.object({
          name: z.string(),
          description: z.string().optional(),
          products: z.array(z.string()).optional(),
          industry: z.string().optional(),
        }),
        targetCompany: z.object({
          name: z.string(),
          description: z.string().optional(),
          products: z.array(z.string()).optional(),
          industry: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return await discoveryLlm.analyzeCompanySimilarity(input);
    }),

  suggestAssociations: adminProcedure
    .input(
      z.object({
        industry: z.string(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await discoveryLlm.suggestIndustryAssociations(
        input.industry,
        input.country
      );
    }),

  analyzeNews: adminProcedure
    .input(
      z.object({
        headline: z.string(),
        content: z.string(),
        targetIndustry: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await discoveryLlm.analyzeNewsArticle(
        input.headline,
        input.content,
        input.targetIndustry
      );
    }),

  // ============================================================================
  // SUGGESTIONS
  // ============================================================================

  getSuggestions: protectedProcedure
    .input(
      z
        .object({
          generation: z.number().optional(),
          limit: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await scoutDb.getScoutSuggestions(input);
    }),

  approveSuggestion: adminProcedure
    .input(z.object({ corporationId: z.string() }))
    .mutation(async ({ input }) => {
      await scoutDb.approveScoutSuggestion(input.corporationId);
      return { success: true };
    }),

  rejectSuggestion: adminProcedure
    .input(z.object({ corporationId: z.string() }))
    .mutation(async ({ input }) => {
      await scoutDb.rejectScoutSuggestion(input.corporationId);
      return { success: true };
    }),

  bulkApprove: adminProcedure
    .input(z.object({ corporationIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      for (const id of input.corporationIds) {
        await scoutDb.approveScoutSuggestion(id);
      }
      return { success: true, count: input.corporationIds.length };
    }),

  bulkReject: adminProcedure
    .input(z.object({ corporationIds: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      for (const id of input.corporationIds) {
        await scoutDb.rejectScoutSuggestion(id);
      }
      return { success: true, count: input.corporationIds.length };
    }),

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getGenerationStats: protectedProcedure.query(async () => {
    return await scoutDb.getScoutGenerationStats();
  }),

  // ============================================================================
  // WORKER
  // ============================================================================

  processNextJob: adminProcedure.mutation(async () => {
    const { processNextQueueJob } = await import("./scoutWorker");
    return await processNextQueueJob();
  }),
});

