import { z } from "zod";

export type SideEffectLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ToolContext = {
  runId: string;
  userId?: string;
  permissions: string[];
  maxSideEffectLevel: SideEffectLevel;
};

export type ToolResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type AgentDefinition<TInput = unknown, TOutput = unknown> = {
  name: string;
  version: string;
  jobType: string;
  promptVersion: string;
  outputSchema: z.ZodType<TOutput>;
  buildInput: (jobPayload: TInput) => Promise<unknown>;
  run: (args: {
    jobId: string;
    runId: string;
    input: unknown;
  }) => Promise<TOutput>;
  apply?: (args: {
    jobId: string;
    runId: string;
    output: TOutput;
  }) => Promise<void>;
};
