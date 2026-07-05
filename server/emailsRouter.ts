import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb, matchContactsForEmail, linkEmailToContactDb } from "./db";
import { sql, eq, desc, like, or, and, isNull } from "drizzle-orm";
import { mysqlTable, varchar, text, datetime, boolean, int } from "drizzle-orm/mysql-core";
import crypto from "crypto";
import OpenAI from "openai";

// Define emails table schema for Drizzle (erweitert)
const emails = mysqlTable("emails", {
  id: varchar("id", { length: 36 }).primaryKey(),
  contactId: varchar("contactId", { length: 36 }),
  fromAddress: varchar("fromAddress", { length: 255 }),
  toAddress: text("toAddress"),
  cc: text("cc"),
  bcc: text("bcc"),
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  htmlBody: text("htmlBody"),
  timestamp: datetime("timestamp"),
  outlookId: varchar("outlookId", { length: 255 }),
  direction: varchar("direction", { length: 20 }),
  isRead: boolean("isRead"),
  createdAt: datetime("createdAt"),
  createdBy: varchar("createdBy", { length: 36 }),
  // Neue Felder für erweiterte E-Mail-Historie
  keywords: text("keywords"), // JSON Array mit 5 Stichworten
  summary: text("summary"), // 1-2 Sätze Zusammenfassung
  replyStatus: varchar("replyStatus", { length: 50 }), // open, replied, waiting
  threadId: varchar("threadId", { length: 64 }),
  threadPosition: int("threadPosition"),
  enrichedAt: datetime("enrichedAt"),
});

// Define email_attachments table schema for Drizzle
const emailAttachments = mysqlTable("email_attachments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  emailId: varchar("emailId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }),
  size: int("size"),
  mimeType: varchar("mimeType", { length: 100 }),
  path: varchar("path", { length: 500 }),
  createdAt: datetime("createdAt"),
});

// LLM-Enrichment Funktion
async function enrichEmailWithLLM(emailId: string, subject: string, body: string) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });

    const prompt = `Analysiere die folgende E-Mail und extrahiere:
1. Genau 5 Stichworte (kurze, prägnante Begriffe die den Inhalt beschreiben)
2. Eine Zusammenfassung in 1-2 Sätzen (max. 150 Zeichen)

Betreff: ${subject}

Inhalt:
${body?.substring(0, 2000) || "(kein Inhalt)"}

Antworte im folgenden JSON-Format:
{
  "keywords": ["stichwort1", "stichwort2", "stichwort3", "stichwort4", "stichwort5"],
  "summary": "Kurze Zusammenfassung der E-Mail"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Parse JSON aus der Antwort
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        keywords: JSON.stringify(parsed.keywords || []),
        summary: parsed.summary || "",
      };
    }
    
    return null;
  } catch (error) {
    console.error("[Email Enrichment] LLM error:", error);
    return null;
  }
}

export const emailsRouter = router({
  // E-Mail speichern (Hauptfunktion für Outlook Add-in)
  // Hinweis: protectedProcedure – Outlook Add-in muss mit JWT-Token authentifiziert sein
  save: protectedProcedure
    .input(
      z.object({
        contactId: z.string().optional(),
        from: z.string(),
        to: z.string(),
        cc: z.string().optional(),
        bcc: z.string().optional(),
        subject: z.string(),
        body: z.string().optional(),
        htmlBody: z.string().optional(),
        timestamp: z.string(),
        outlookId: z.string().optional(),
        direction: z.enum(["inbound", "outbound"]).optional(),
        attachments: z
          .array(
            z.object({
              name: z.string(),
              size: z.number(),
              data: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const emailId = crypto.randomUUID();
      const createdBy = (ctx as any).user?.id || null;

      // Thread-ID generieren basierend auf Subject (Re: / Fwd: entfernen)
      const cleanSubject = input.subject.replace(/^(Re:|Fwd:|AW:|WG:)\s*/gi, "").trim();
      const threadId = crypto.createHash("md5").update(cleanSubject.toLowerCase()).digest("hex");

      // Thread-Position ermitteln
      const existingThread = await db
        .select({ count: sql<number>`count(*)` })
        .from(emails)
        .where(eq(emails.threadId, threadId));
      const threadPosition = (existingThread[0]?.count || 0) + 1;

      // E-Mail speichern
      await db.insert(emails).values({
        id: emailId,
        contactId: input.contactId || null,
        fromAddress: input.from,
        toAddress: input.to,
        cc: input.cc || null,
        bcc: input.bcc || null,
        subject: input.subject,
        body: input.body || null,
        htmlBody: input.htmlBody || null,
        timestamp: new Date(input.timestamp),
        outlookId: input.outlookId || null,
        direction: input.direction || "inbound",
        isRead: false,
        createdAt: new Date(),
        createdBy: createdBy,
        replyStatus: "open",
        threadId: threadId,
        threadPosition: threadPosition,
      });

      // Anhänge speichern
      if (input.attachments && input.attachments.length > 0) {
        for (const attachment of input.attachments) {
          await db.insert(emailAttachments).values({
            id: crypto.randomUUID(),
            emailId: emailId,
            name: attachment.name,
            size: attachment.size,
            mimeType: null,
            path: null,
            createdAt: new Date(),
          });
        }
      }

      // LLM-Enrichment asynchron starten (nicht blockierend)
      enrichEmailWithLLM(emailId, input.subject, input.body || "").then(async (enrichment) => {
        if (enrichment) {
          const db2 = await getDb();
          if (db2) {
            await db2.update(emails).set({
              keywords: enrichment.keywords,
              summary: enrichment.summary,
              enrichedAt: new Date(),
            }).where(eq(emails.id, emailId));
          }
        }
      });


      // Auto-Link: Kontakte zu dieser Mail verknüpfen (direkt nach dem Speichern)
      try {
        const fromAddr = input.from.match(/<([^>]+)>/)?.[1] ?? input.from;
        const toAddrs = (input.to ?? '').split(/[,;]/).map((a: string) => {
          const m = a.match(/<([^>]+)>/); return m ? m[1] : a.trim();
        }).filter(Boolean);
        const ccAddrs = (input.cc ?? '').split(/[,;]/).map((a: string) => {
          const m = a.match(/<([^>]+)>/); return m ? m[1] : a.trim();
        }).filter(Boolean);
        const contactIds = await matchContactsForEmail(fromAddr, toAddrs, ccAddrs);
        const userId = (ctx as any).user?.id ?? 'system';
        for (const contactId of contactIds) {
          await linkEmailToContactDb({
            emailId,
            contactId,
            userId,
            fromAddress: fromAddr,
            toAddress: toAddrs[0] ?? undefined,
          });
        }
        if (contactIds.length > 0) {
          console.log(`[emailsRouter] Auto-linked ${contactIds.length} contact(s) to email ${emailId}`);
        }
      } catch (linkErr: any) {
        console.warn('[emailsRouter] Auto-link failed (non-fatal):', linkErr.message);
      }

      return { id: emailId, success: true };
    }),

  // E-Mail archivieren (Legacy-Alias für save)
  archive: protectedProcedure
    .input(
      z.object({
        contactId: z.string().optional(),
        from: z.string(),
        to: z.string(),
        cc: z.string().optional(),
        bcc: z.string().optional(),
        subject: z.string(),
        body: z.string().optional(),
        htmlBody: z.string().optional(),
        timestamp: z.string(),
        outlookId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const emailId = crypto.randomUUID();
      const createdBy = (ctx as any).user?.id || null;

      // Thread-ID generieren
      const cleanSubject = input.subject.replace(/^(Re:|Fwd:|AW:|WG:)\s*/gi, "").trim();
      const threadId = crypto.createHash("md5").update(cleanSubject.toLowerCase()).digest("hex");

      await db.insert(emails).values({
        id: emailId,
        contactId: input.contactId || null,
        fromAddress: input.from,
        toAddress: input.to,
        cc: input.cc || null,
        bcc: input.bcc || null,
        subject: input.subject,
        body: input.body || null,
        htmlBody: input.htmlBody || null,
        timestamp: new Date(input.timestamp),
        outlookId: input.outlookId || null,
        direction: "inbound",
        isRead: false,
        createdAt: new Date(),
        createdBy: createdBy,
        replyStatus: "open",
        threadId: threadId,
      });


      // Auto-Link: Kontakte zu dieser Mail verknüpfen (direkt nach dem Speichern)
      try {
        const fromAddr = input.from.match(/<([^>]+)>/)?.[1] ?? input.from;
        const toAddrs = (input.to ?? '').split(/[,;]/).map((a: string) => {
          const m = a.match(/<([^>]+)>/); return m ? m[1] : a.trim();
        }).filter(Boolean);
        const ccAddrs = (input.cc ?? '').split(/[,;]/).map((a: string) => {
          const m = a.match(/<([^>]+)>/); return m ? m[1] : a.trim();
        }).filter(Boolean);
        const contactIds = await matchContactsForEmail(fromAddr, toAddrs, ccAddrs);
        const userId = (ctx as any).user?.id ?? 'system';
        for (const contactId of contactIds) {
          await linkEmailToContactDb({
            emailId,
            contactId,
            userId,
            fromAddress: fromAddr,
            toAddress: toAddrs[0] ?? undefined,
          });
        }
        if (contactIds.length > 0) {
          console.log(`[emailsRouter] Auto-linked ${contactIds.length} contact(s) to email ${emailId}`);
        }
      } catch (linkErr: any) {
        console.warn('[emailsRouter] Auto-link failed (non-fatal):', linkErr.message);
      }

      return { id: emailId, success: true };
    }),

  // Einzelne E-Mail abrufen
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(emails)
        .where(eq(emails.id, input.id))
        .limit(1);

      if (result.length === 0) return null;

      // Anhänge laden
      const attachments = await db
        .select()
        .from(emailAttachments)
        .where(eq(emailAttachments.emailId, input.id));

      // Thread-Anzahl ermitteln
      const threadCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(emails)
        .where(eq(emails.threadId, result[0].threadId || ""));

      return {
        ...result[0],
        attachments,
        threadCount: threadCount[0]?.count || 1,
        keywords: result[0].keywords ? JSON.parse(result[0].keywords) : [],
      };
    }),

  // E-Mails pro Kontakt abrufen (erweitert)
  listByContact: publicProcedure
    .input(
      z.object({
        contactId: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const emailList = await db
        .select()
        .from(emails)
        .where(eq(emails.contactId, input.contactId))
        .orderBy(desc(emails.timestamp))
        .limit(input.limit || 100);

      // Für jede E-Mail: Anhänge und Thread-Info laden
      const enrichedEmails = await Promise.all(
        emailList.map(async (email) => {
          const attachments = await db
            .select()
            .from(emailAttachments)
            .where(eq(emailAttachments.emailId, email.id));

          const threadCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(emails)
            .where(eq(emails.threadId, email.threadId || ""));

          return {
            ...email,
            attachments,
            threadCount: threadCount[0]?.count || 1,
            keywords: email.keywords ? JSON.parse(email.keywords) : [],
          };
        })
      );

      return enrichedEmails;
    }),

  // Alle E-Mails auflisten (mit Pagination)
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], pagination: { total: 0, limit: 50, offset: 0, hasMore: false } };

      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      let query;
      if (input?.search) {
        query = db
          .select()
          .from(emails)
          .where(
            or(
              like(emails.subject, `%${input.search}%`),
              like(emails.fromAddress, `%${input.search}%`),
              like(emails.toAddress, `%${input.search}%`)
            )
          )
          .orderBy(desc(emails.timestamp))
          .limit(limit)
          .offset(offset);
      } else {
        query = db
          .select()
          .from(emails)
          .orderBy(desc(emails.timestamp))
          .limit(limit)
          .offset(offset);
      }

      const data = await query;

      // Zähle Gesamtanzahl
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emails);
      const total = countResult[0]?.count || 0;

      return {
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),

  // E-Mail als gelesen markieren
  markAsRead: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(emails)
        .set({ isRead: true })
        .where(eq(emails.id, input.id));

      return { success: true };
    }),

  // Antwort-Status aktualisieren
  updateReplyStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      replyStatus: z.enum(["open", "replied", "waiting"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(emails)
        .set({ replyStatus: input.replyStatus })
        .where(eq(emails.id, input.id));

      return { success: true };
    }),

  // E-Mails ohne Enrichment anreichern (Batch-Job)
  enrichPending: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Finde E-Mails ohne Enrichment
      const pendingEmails = await db
        .select()
        .from(emails)
        .where(isNull(emails.enrichedAt))
        .limit(input.limit || 10);

      let enrichedCount = 0;
      for (const email of pendingEmails) {
        const enrichment = await enrichEmailWithLLM(
          email.id,
          email.subject || "",
          email.body || ""
        );

        if (enrichment) {
          await db.update(emails).set({
            keywords: enrichment.keywords,
            summary: enrichment.summary,
            enrichedAt: new Date(),
          }).where(eq(emails.id, email.id));
          enrichedCount++;
        }
      }

      return { success: true, enrichedCount, totalPending: pendingEmails.length };
    }),

  // E-Mail löschen
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Anhänge werden automatisch durch CASCADE gelöscht
      await db.delete(emails).where(eq(emails.id, input.id));

      return { success: true };
    }),
});
