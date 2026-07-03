import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { enqueueAgentJob } from "./agents/agentDb";
import { getDb } from "./db";
import { agentJobs, agentSuggestions, tasks } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const agentRouter = router({
  enqueueReplyClassification: protectedProcedure
    .input(
      z.object({
        emailResponseId: z.string().optional(),
        emailId: z.string().optional(),
        contactId: z.string().optional(),
        subject: z.string(),
        body: z.string(),
        from: z.string().optional(),
        receivedAt: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const jobId = await enqueueAgentJob({
        type: "email.reply.classify",
        entityType: input.emailResponseId ? "email_response" : "email",
        entityId: input.emailResponseId || input.emailId,
        payload: input,
        priority: 3,
        createdBy: ctx.user.id,
      });
      return { jobId };
    }),

  listSuggestions: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pending", "approved", "rejected", "applied"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input?.status) {
        return db
          .select()
          .from(agentSuggestions)
          .where(eq(agentSuggestions.status, input.status))
          .orderBy(desc(agentSuggestions.createdAt))
          .limit(100);
      }

      return db
        .select()
        .from(agentSuggestions)
        .orderBy(desc(agentSuggestions.createdAt))
        .limit(100);
    }),

  listTasks: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["open", "in_progress", "done", "cancelled"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input?.status) {
        return db
          .select()
          .from(tasks)
          .where(eq(tasks.status, input.status))
          .orderBy(desc(tasks.createdAt))
          .limit(100);
      }

      return db
        .select()
        .from(tasks)
        .orderBy(desc(tasks.createdAt))
        .limit(100);
    }),

  approveSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(agentSuggestions)
        .set({
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(agentSuggestions.id, input.id));

      return { ok: true };
    }),

  rejectSuggestion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(agentSuggestions)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(agentSuggestions.id, input.id));

      return { ok: true };
    }),
});
