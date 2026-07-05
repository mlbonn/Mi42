/**
 * Outreach Agent tRPC Router
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  createCampaign,
  getCampaign,
  getAllCampaigns,
  updateCampaign,
  createEmailDraft,
  getEmailDraft,
  getEmailDraftsByCampaign,
  getPendingEmailDrafts,
  getApprovedEmailDrafts,
  getSentEmails,
  updateEmailDraft,
  bulkUpdateEmailDrafts,
  getOutreachStats,
} from "./outreachDb";
import { processCampaign, generateEmailForContact } from "./services/outreachService";

export const outreachRouter = router({
  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  createCampaign: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        targetSegment: z.string().optional(),
        language: z.string().default("en"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const campaignId = await createCampaign({
        name: input.name,
        description: input.description,
        targetSegment: input.targetSegment,
        language: input.language,
        status: "draft",
        createdBy: ctx.user.id,
      } as any) as any;

      return { campaignId };
    }),

  getCampaign: protectedProcedure.input(z.object({ campaignId: z.string() })).query(async ({ input }) => {
    return await getCampaign(input.campaignId);
  }),

  listCampaigns: protectedProcedure.query(async () => {
    return await getAllCampaigns();
  }),

  updateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "paused", "completed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { campaignId, ...data } = input;
      await updateCampaign(campaignId, data);
      return { success: true };
    }),

  startCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        contactIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      // Update campaign status
      await updateCampaign(input.campaignId, {
        status: "active",
        startedAt: new Date(),
      });

      // Trigger async email generation
      processCampaign(input.campaignId, input.contactIds).catch((err) => {
        console.error(`[OutreachRouter] Failed to process campaign ${input.campaignId}:`, err);
      });

      return { success: true };
    }),

  // ============================================================================
  // EMAIL DRAFTS
  // ============================================================================

  generateEmail: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        contactId: z.string(),
        corporationId: z.string(),
        language: z.string().default("en"),
      })
    )
    .mutation(async ({ input }) => {
      const draftId = await generateEmailForContact(
        input.campaignId,
        input.contactId,
        input.corporationId,
        input.language
      );

      return { draftId };
    }),

  getEmailDraft: protectedProcedure.input(z.object({ draftId: z.string() })).query(async ({ input }) => {
    return await getEmailDraft(input.draftId);
  }),

  getDraftsByCampaign: protectedProcedure.input(z.object({ campaignId: z.string() })).query(async ({ input }) => {
    return await getEmailDraftsByCampaign(input.campaignId);
  }),

  getPendingDrafts: protectedProcedure.query(async () => {
    return await getPendingEmailDrafts();
  }),

  getApprovedDrafts: protectedProcedure.query(async () => {
    return await getApprovedEmailDrafts();
  }),

  getSentEmails: protectedProcedure.query(async () => {
    return await getSentEmails();
  }),

  // ============================================================================
  // REVIEW
  // ============================================================================

  reviewDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
        action: z.enum(["approve", "reject"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.action === "approve") {
        await updateEmailDraft(input.draftId, {
          reviewStatus: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
      } else {
        await updateEmailDraft(input.draftId, {
          reviewStatus: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
      }

      return { success: true };
    }),

  bulkReview: protectedProcedure
    .input(
      z.object({
        draftIds: z.array(z.string()),
        action: z.enum(["approve", "reject"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await bulkUpdateEmailDrafts(input.draftIds, {
        reviewStatus: input.action === "approve" ? "approved" : "rejected",
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
      });

      return { success: true };
    }),

  updateDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
        subject: z.string().optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { draftId, ...data } = input;
      await updateEmailDraft(draftId, data);
      return { success: true };
    }),

  // ============================================================================
  // SENDING
  // ============================================================================

  sendEmail: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // In production, integrate with email service (SendGrid, AWS SES, etc.)
      console.log(`[OutreachRouter] Sending email ${input.draftId}`);

      await updateEmailDraft(input.draftId, {
        reviewStatus: "sent",
        sentAt: new Date(),
        sentBy: ctx.user.id,
      });

      return { success: true };
    }),

  bulkSend: protectedProcedure
    .input(
      z.object({
        draftIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // In production, integrate with email service
      console.log(`[OutreachRouter] Sending ${input.draftIds.length} emails`);

      await bulkUpdateEmailDrafts(input.draftIds, {
        reviewStatus: "sent",
        sentAt: new Date(),
        sentBy: ctx.user.id,
      });

      return { success: true };
    }),

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats: protectedProcedure.query(async () => {
    return await getOutreachStats();
  }),
});

