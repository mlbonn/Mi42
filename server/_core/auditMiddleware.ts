// Audit context helper - adds userId to context
// Used by procedures that need to track who created/updated records

export function getAuditContext(ctx: any) {
  return {
    userId: ctx.user?.id || null,
    timestamp: new Date(),
  };
}
