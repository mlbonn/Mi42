import { getDb } from "../../db";
import { emailDrafts } from "../../../drizzle/schema";

export const emailTools = {
  async createEmailDraft(input: {
    campaignId?: string;
    contactId?: string;
    corporationId?: string;
    subject: string;
    body: string;
    language?: string;
    personalizationData?: unknown;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const id = crypto.randomUUID();
    await db.insert(emailDrafts).values({
      id,
      campaignId: input.campaignId,
      contactId: input.contactId,
      corporationId: input.corporationId,
      subject: input.subject,
      body: input.body,
      language: input.language ?? "en",
      personalizationData: input.personalizationData as Record<string, unknown>,
      reviewStatus: "pending",
    });

    return { id };
  },
};

// NOTE: No sendEmail tool in V1. Sending remains via manual review UI.
