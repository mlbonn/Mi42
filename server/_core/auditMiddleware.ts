import { middleware } from "./trpc";

/**
 * Audit middleware that adds userId to context for tracking
 * Use this in procedures that need to track who created/updated records
 */
export const auditMiddleware = middleware(async ({ ctx, next }) => {
  const userId = ctx.user?.id || null;
  
  return next({
    ctx: {
      ...ctx,
      audit: {
        userId,
        timestamp: new Date(),
      },
    },
  });
});

/**
 * Helper function to add audit fields to insert data
 */
export function withAuditCreate(data: any, userId: string | null) {
  return {
    ...data,
    createdBy: userId,
    updatedBy: userId,
  };
}

/**
 * Helper function to add audit fields to update data
 */
export function withAuditUpdate(data: any, userId: string | null) {
  return {
    ...data,
    updatedBy: userId,
  };
}
