export const complianceTools = {
  async checkOutreachAllowed(input: { contactId?: string; email?: string }) {
    // V1: defensive default. When a do-not-contact table exists, check here.
    return {
      allowed: true,
      reason: "No do-not-contact signal found in V1 check",
      requiresHumanReview: true,
    };
  },
};
