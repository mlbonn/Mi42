import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { requireStaffOrHigher } from './rbac';

export const responsesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    await requireStaffOrHigher(ctx.user.id);
    return db.getAllEmailResponses();
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      return db.getEmailResponseById(input.id);
    }),

  byContact: publicProcedure
    .input(z.object({ contactId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      return db.getEmailResponsesByContact(input.contactId);
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        sentiment: z.enum(['positive', 'neutral', 'negative', 'interested', 'not_interested']).optional(),
        requiresAction: z.boolean().optional(),
        actionType: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      const { id, ...data } = input;
      await db.updateEmailResponse(id, {
        ...data,
        processedBy: ctx.user.id,
      });

      return { message: 'Response updated successfully' };
    }),

  markProcessed: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      await db.updateEmailResponse(input.id, {
        processedBy: ctx.user.id,
      });

      return { message: 'Response marked as processed' };
    }),
});

