import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from './_core/trpc';
import * as db from './db';
import { requireStaffOrHigher } from './rbac';

export const templatesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    await requireStaffOrHigher(ctx.user.id);
    return db.getAllEmailTemplates();
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      return db.getEmailTemplateById(input.id);
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        subject: z.string().min(1),
        body: z.string().min(1),
        language: z.string().default('de'),
        variables: z.array(z.string()).optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      
      const template = await db.createEmailTemplate({
        ...input,
        variables: input.variables ? JSON.stringify(input.variables) : null,
        createdBy: ctx.user.id,
      });

      return { id: template.id, message: 'Template created successfully' };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        language: z.string().optional(),
        variables: z.array(z.string()).optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);

      const { id, variables, ...rest } = input;
      await db.updateEmailTemplate(id, {
        ...rest,
        variables: variables ? JSON.stringify(variables) : undefined,
      });

      return { message: 'Template updated successfully' };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      await requireStaffOrHigher(ctx.user.id);
      await db.deleteEmailTemplate(input.id);
      return { message: 'Template deleted successfully' };
    }),
});

