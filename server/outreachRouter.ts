/**
 * Outreach Agent tRPC Router
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { emailSendQueue } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { decryptCredential } from './credentialService.js';
import { getCaldavCredentials } from './db.js';
import {
import { getDb } from './db.js';
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
      const db = await getDb();

      // Load drafts with contact email
      const { getEmailDraft } = await import('./outreachDb.js');
      const queueJobs: { id: string; draftId: string; userId: string; toAddress: string; subject: string; body: string }[] = [];

      for (const draftId of input.draftIds) {
        const draft = await getEmailDraft(draftId);
        if (!draft) continue;

        // Resolve toAddress from contactId
        let toAddress: string | null = null;
        if (draft.contactId) {
          const contacts = await db.query?.contacts?.findFirst
            ? await (db as any).query.contacts.findFirst({ where: (c: any, { eq: eqFn }: any) => eqFn(c.id, draft.contactId) })
            : null;
          toAddress = contacts?.email ?? null;
        }
        if (!toAddress) {
          console.warn(`[bulkSend] No email for draft ${draftId}, skipping`);
          continue;
        }

        queueJobs.push({
          id: crypto.randomUUID(),
          draftId,
          userId: ctx.user.id,
          toAddress,
          subject: draft.subject ?? '',
          body: draft.body ?? '',
        });
      }

      if (queueJobs.length > 0) {
        await db.insert(emailSendQueue).values(queueJobs);
      }

      // Mark drafts as queued
      await bulkUpdateEmailDrafts(input.draftIds, {
        reviewStatus: "queued" as any,
        sentBy: ctx.user.id,
      });

      console.log(`[OutreachRouter] Queued ${queueJobs.length} emails for sending`);
      return { success: true, queued: queueJobs.length };
    }),

  // ============================================================================
  // STATISTICS
  // ============================================================================

  getStats: protectedProcedure.query(async () => {
    return await getOutreachStats();
  }),
});

