/**
 * Outreach Agent Service
 * Handles email generation using real CRM data and LLM.
 * No mock data. No fake news. No automatic sending.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createEmailDraft } from "../outreachDb";
import { getDb } from "../db";
import { contacts, contactCompanyRelations, companies, corporations } from "../../drizzle/schema";
import { invokeLLMWithDbKeys } from "../_core/llm";

// ─── Context Loader ──────────────────────────────────────────────────────────

async function getOutreachContext(contactId: string, corporationId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const contactRows = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  const contact = contactRows[0];
  if (!contact) throw new Error("Contact not found");

  let corporation = null;
  let company = null;

  if (corporationId) {
    const corpRows = await db.select().from(corporations).where(eq(corporations.id, corporationId)).limit(1);
    corporation = corpRows[0] ?? null;
  } else {
    const relRows = await db.select().from(contactCompanyRelations).where(eq(contactCompanyRelations.contactId, contactId)).limit(1);
    const rel = relRows[0];
    if (rel?.companyId) {
      const companyRows = await db.select().from(companies).where(eq(companies.id, rel.companyId)).limit(1);
      company = companyRows[0] ?? null;
      if (company?.corporationId) {
        const corpRows = await db.select().from(corporations).where(eq(corporations.id, company.corporationId)).limit(1);
        corporation = corpRows[0] ?? null;
      }
    }
  }

  return { contact, company, corporation };
}

// ─── LLM Email Generation ────────────────────────────────────────────────────

const EmailDraftOutput = z.object({
  subject: z.string(),
  body: z.string(),
  personalizationReason: z.string(),
  riskFlags: z.array(z.string()).default([]),
});

type EmailDraftOutput = z.infer<typeof EmailDraftOutput>;

async function generatePersonalizedEmail(context: {
  contactName: string;
  contactTitle?: string | null;
  corporationName?: string | null;
  products?: string | null;
  targetMarkets?: string | null;
  language: string;
}): Promise<EmailDraftOutput> {
  const response = await invokeLLMWithDbKeys({
    messages: [
      {
        role: "system",
        content: `You write concise, professional B2B outreach emails for a construction forecast database product. Use only the provided CRM context. Do not invent company news. Do not claim that competitors use the product unless provided in context. Return JSON with subject, body, personalizationReason, and riskFlags. Keep the email short and specific. Language: ${context.language}.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          contactName: context.contactName,
          contactTitle: context.contactTitle,
          corporationName: context.corporationName,
          products: context.products,
          targetMarkets: context.targetMarkets,
        }),
      },
    ],
    outputSchema: {
      name: "email_draft_output",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
          personalizationReason: { type: "string" },
          riskFlags: { type: "array", items: { type: "string" } },
        },
        required: ["subject", "body", "personalizationReason", "riskFlags"],
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  return EmailDraftOutput.parse(JSON.parse(raw));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Process a campaign and generate email drafts for all contacts using real CRM data.
 */
export async function processCampaign(campaignId: string, contactIds: string[]): Promise<void> {
  console.log(`[OutreachService] Processing campaign ${campaignId} with ${contactIds.length} contacts`);

  for (const contactId of contactIds) {
    try {
      await generateEmailForContact(campaignId, contactId, undefined, "en");
    } catch (error) {
      console.error(`[OutreachService] Failed for contact ${contactId}:`, error);
    }
  }

  console.log(`[OutreachService] Campaign ${campaignId} processing completed`);
}

/**
 * Generate a single email draft for a contact using real CRM data and LLM.
 */
export async function generateEmailForContact(
  campaignId: string,
  contactId: string,
  corporationId: string | undefined,
  language: string
): Promise<string> {
  console.log(`[OutreachService] Generating email for contact ${contactId}`);

  const { contact, corporation } = await getOutreachContext(contactId, corporationId);

  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "there";
  const contactTitle = (contact as Record<string, unknown>).title as string | null ?? null;

  const email = await generatePersonalizedEmail({
    contactName,
    contactTitle,
    corporationName: corporation?.name ?? null,
    products: corporation?.products ?? null,
    targetMarkets: corporation?.targetMarkets ?? null,
    language,
  });

  if (email.riskFlags.length > 0) {
    console.warn(`[OutreachService] Risk flags for contact ${contactId}:`, email.riskFlags);
  }

  const draftId = await createEmailDraft({
    campaignId,
    contactId,
    corporationId: corporation?.id,
    subject: email.subject,
    body: email.body,
    language,
    personalizationData: {
      personalizationReason: email.personalizationReason,
      riskFlags: email.riskFlags,
    },
    reviewStatus: "pending",
  });

  console.log(`[OutreachService] Created draft ${draftId} for contact ${contactId}`);
  return draftId;
}
