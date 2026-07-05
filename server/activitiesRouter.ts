import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getActivitiesByCorporation,
  getActivitiesByContact,
  getActivitiesByCompany,
  getRecentActivities,
  createActivity,
} from "./db";

export const activitiesRouter = router({
  // List activities by corporation
  listByCorporation: publicProcedure
    .input(
      z.object({
        corporationId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getActivitiesByCorporation(input.corporationId, input.limit);
    }),

  // List activities by contact
  listByContact: publicProcedure
    .input(
      z.object({
        contactId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getActivitiesByContact(input.contactId, input.limit);
    }),

  // List activities by company
  listByCompany: publicProcedure
    .input(
      z.object({
        companyId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getActivitiesByCompany(input.companyId, input.limit);
    }),

  // Get recent activities for user
  recent: protectedProcedure
    .input(
      z.object({
        
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getRecentActivities(ctx.user.id, input.limit);
    }),

  // Create new activity
  create: publicProcedure
    .input(
      z.object({
        type: z.string(),
        subject: z.string(),
        description: z.string().optional(),
        date: z.string().optional(),
        contactId: z.string().optional(),
        companyId: z.string().optional(),
        corporationId: z.string().optional(),
        userId: z.string(),
        hasAttachment: z.boolean().optional(),
        attachmentCount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createActivity(input as any as any);
    }),
});
