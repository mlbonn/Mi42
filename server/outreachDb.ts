/**
 * Outreach Agent Database Functions
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  outreachCampaigns,
  emailDrafts,
  InsertOutreachCampaign,
  InsertEmailDraft,
  OutreachCampaign,
  EmailDraft,
} from "../drizzle/schema";

// ============================================================================
// CAMPAIGNS
// ============================================================================

export async function createCampaign(data: InsertOutreachCampaign): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(outreachCampaigns).values({ ...data, id });
  return id;
}

export async function getCampaign(id: string): Promise<OutreachCampaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, id)).limit(1);
  return result[0];
}

export async function getAllCampaigns(): Promise<OutreachCampaign[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(outreachCampaigns).orderBy(desc(outreachCampaigns.createdAt));
}

export async function updateCampaign(id: string, data: Partial<InsertOutreachCampaign>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(outreachCampaigns).set(data).where(eq(outreachCampaigns.id, id));
}

// ============================================================================
// EMAIL DRAFTS
// ============================================================================

export async function createEmailDraft(data: InsertEmailDraft): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = crypto.randomUUID();
  await db.insert(emailDrafts).values({ ...data, id });
  return id;
}

export async function getEmailDraft(id: string): Promise<EmailDraft | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(emailDrafts).where(eq(emailDrafts.id, id)).limit(1);
  return result[0];
}

export async function getEmailDraftsByCampaign(campaignId: string): Promise<EmailDraft[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.campaignId, campaignId))
    .orderBy(desc(emailDrafts.createdAt));
}

export async function getPendingEmailDrafts(): Promise<EmailDraft[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.reviewStatus, "pending"))
    .orderBy(desc(emailDrafts.createdAt));
}

export async function getApprovedEmailDrafts(): Promise<EmailDraft[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.reviewStatus, "approved"))
    .orderBy(desc(emailDrafts.createdAt));
}

export async function getSentEmails(): Promise<EmailDraft[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailDrafts)
    .where(eq(emailDrafts.reviewStatus, "sent"))
    .orderBy(desc(emailDrafts.sentAt));
}

export async function updateEmailDraft(id: string, data: Partial<InsertEmailDraft>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(emailDrafts).set(data).where(eq(emailDrafts.id, id));
}

export async function bulkUpdateEmailDrafts(ids: string[], data: Partial<InsertEmailDraft>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const id of ids) {
    await db.update(emailDrafts).set(data).where(eq(emailDrafts.id, id));
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

export async function getOutreachStats() {
  const db = await getDb();
  if (!db) {
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalDrafts: 0,
      pendingReview: 0,
      sentEmails: 0,
    };
  }

  const [campaigns, drafts, pending, sent] = await Promise.all([
    db.select().from(outreachCampaigns),
    db.select().from(emailDrafts),
    db.select().from(emailDrafts).where(eq(emailDrafts.reviewStatus, "pending")),
    db.select().from(emailDrafts).where(eq(emailDrafts.reviewStatus, "sent")),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns,
    totalDrafts: drafts.length,
    pendingReview: pending.length,
    sentEmails: sent.length,
  };
}

