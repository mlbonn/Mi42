import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import * as db from './db';

export const projectRouter = router({
  // Link E-Mail zu Projekt
  linkEmailToProject: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
        projectId: z.string(),
        taskId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const linkId = await db.linkEmailToProject(
          input.emailId,
          input.projectId,
          input.taskId
        );
        return { success: true, linkId };
      } catch (error) {
        console.error('[Project] Link failed:', error);
        throw new Error('Failed to link email to project');
      }
    }),

  // Projekt-Statistiken abrufen
  getProjectStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await db.getProjectStats(input.projectId);
      } catch (error) {
        console.error('[Project] Stats failed:', error);
        throw new Error('Failed to get project stats');
      }
    }),

  // Projekt-E-Mails abrufen
  getProjectEmails: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await db.getProjectEmails(input.projectId);
      } catch (error) {
        console.error('[Project] Get emails failed:', error);
        throw new Error('Failed to get project emails');
      }
    }),

  // Timesheet hinzufügen
  addTimesheet: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        hours: z.number().positive(),
        cost: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const id = await db.addProjectTimesheet(
          input.projectId,
          ctx.user.id,
          input.hours,
          input.cost,
          input.description
        );
        return { success: true, id };
      } catch (error) {
        console.error('[Project] Timesheet failed:', error);
        throw new Error('Failed to add timesheet');
      }
    }),

  // Budget hinzufügen
  addBudget: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        category: z.string(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const id = await db.addProjectBudget(
          input.projectId,
          input.category,
          input.amount
        );
        return { success: true, id };
      } catch (error) {
        console.error('[Project] Budget failed:', error);
        throw new Error('Failed to add budget');
      }
    }),
});
