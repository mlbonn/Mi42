import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { requireStaffOrHigher } from './rbac';

export const draftsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    await requireStaffOrHigher(ctx.user.id);
    return db.getAllEmailDrafts();
  }),

  listByStatus: publicProcedure
    .input(z.object({ status: z.enum(['pending', 'approved', 'rejected', 'sent']) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      return db.getEmailDraftsByStatus(input.status);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      return db.getEmailDraftById(input.id);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        subject: z.string().optional(),
        body: z.string().optional(),
        reviewStatus: z.enum(['pending', 'approved', 'rejected', 'sent']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      const { id, ...data } = input;
      await db.updateEmailDraft(id, {
        ...data,
        reviewedBy: data.reviewStatus ? ctx.user.id : undefined,
        sentBy: data.reviewStatus === 'sent' ? ctx.user.id : undefined,
      });

      return { message: 'Draft updated successfully' };
    }),

  approve: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      await db.updateEmailDraft(input.id, {
        reviewStatus: 'approved',
        reviewedBy: ctx.user.id,
      });

      return { message: 'Draft approved' };
    }),

  reject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      await db.updateEmailDraft(input.id, {
        reviewStatus: 'rejected',
        reviewedBy: ctx.user.id,
      });

      return { message: 'Draft rejected' };
    }),

  send: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      await db.updateEmailDraft(input.id, {
        reviewStatus: 'sent',
        sentBy: ctx.user.id,
      });

      // TODO: Actually send the email via SMTP here

      return { message: 'Draft sent' };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      await db.deleteEmailDraft(input.id);
      return { message: 'Draft deleted successfully' };
    }),
});

