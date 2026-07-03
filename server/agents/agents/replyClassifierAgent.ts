import { z } from "zod";
import { invokeLLMWithDbKeys } from "../../_core/llm";
import { agentSuggestions } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { taskTools } from "../tools/taskTools";
import { emailTools } from "../tools/emailTools";

const ReplyClassifierOutput = z.object({
  classification: z.enum([
    "interested",
    "meeting_requested",
    "not_interested",
    "wrong_person",
    "forwarded",
    "out_of_office",
    "unsubscribe",
    "pricing_question",
    "data_question",
    "legal_question",
    "competitor_question",
    "unclear",
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  nextAction: z.object({
    type: z.enum([
      "create_task",
      "create_reply_draft",
      "mark_do_not_contact",
      "no_action",
    ]),
    title: z.string().optional(),
    dueAt: z.string().optional(),
  }),
  suggestedReply: z.string().optional(),
  riskFlags: z.array(z.string()).default([]),
});

type ReplyClassifierOutput = z.infer<typeof ReplyClassifierOutput>;

export const replyClassifierAgent = {
  name: "reply_classifier",
  version: "1.0.0",
  jobType: "email.reply.classify",
  promptVersion: "reply-classifier.v1",
  outputSchema: ReplyClassifierOutput,

  async buildInput(payload: unknown) {
    return payload;
  },

  async run({ input }: { jobId: string; runId: string; input: unknown }) {
    const response = await invokeLLMWithDbKeys({
      messages: [
        {
          role: "system",
          content: `You classify B2B sales email replies for FRIDAY CRM. Return only valid JSON matching the schema. Do not invent facts. If the message is ambiguous, use unclear. If the sender asks not to be contacted, use unsubscribe.`,
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      outputSchema: {
        name: "reply_classifier_output",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            classification: {
              type: "string",
              enum: [
                "interested",
                "meeting_requested",
                "not_interested",
                "wrong_person",
                "forwarded",
                "out_of_office",
                "unsubscribe",
                "pricing_question",
                "data_question",
                "legal_question",
                "competitor_question",
                "unclear",
              ],
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            summary: { type: "string" },
            nextAction: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "create_task",
                    "create_reply_draft",
                    "mark_do_not_contact",
                    "no_action",
                  ],
                },
                title: { type: "string" },
                dueAt: { type: "string" },
              },
              required: ["type"],
            },
            suggestedReply: { type: "string" },
            riskFlags: { type: "array", items: { type: "string" } },
          },
          required: [
            "classification",
            "confidence",
            "summary",
            "nextAction",
            "riskFlags",
          ],
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    const raw = typeof content === "string" ? content : JSON.stringify(content);
    return ReplyClassifierOutput.parse(JSON.parse(raw));
  },

  async apply({
    runId,
    output,
  }: {
    runId: string;
    output: ReplyClassifierOutput;
    jobId: string;
  }) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.insert(agentSuggestions).values({
      id: crypto.randomUUID(),
      agentRunId: runId,
      suggestionType: "email_reply_classification",
      suggestionJson: output as Record<string, unknown>,
      confidence: String(output.confidence),
      status: output.confidence >= 0.85 ? "applied" : "pending",
    });

    if (output.nextAction.type === "create_task") {
      await taskTools.createTask({
        title:
          output.nextAction.title ||
          `Reply requires action: ${output.classification}`,
        description: output.summary,
        priority: output.classification === "meeting_requested" ? 90 : 70,
        dueAt: output.nextAction.dueAt
          ? new Date(output.nextAction.dueAt)
          : undefined,
        sourceAgentRunId: runId,
      });
    }

    if (
      output.nextAction.type === "create_reply_draft" &&
      output.suggestedReply
    ) {
      await emailTools.createEmailDraft({
        subject: "Re: follow-up",
        body: output.suggestedReply,
        personalizationData: {
          agentRunId: runId,
          classification: output.classification,
        },
      });
    }
  },
};
