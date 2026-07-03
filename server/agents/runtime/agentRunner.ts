import { getAgentByJobType } from "./agentRegistry";
import {
  createAgentRun,
  completeAgentRun,
  failAgentRun,
  completeAgentJob,
  failAgentJob,
} from "../agentDb";

export async function runAgentJob(job: {
  id: string;
  type: string;
  payload: unknown;
}) {
  const agent = getAgentByJobType(job.type);
  let runId: string | undefined;

  try {
    const input = await agent.buildInput(job.payload as never);

    runId = await createAgentRun({
      jobId: job.id,
      agentName: agent.name,
      promptVersion: agent.promptVersion,
      inputJson: input,
    });

    const output = await agent.run({
      jobId: job.id,
      runId,
      input,
    });

    const parsed = agent.outputSchema.parse(output);

    if (agent.apply) {
      await agent.apply({ jobId: job.id, runId, output: parsed });
    }

    await completeAgentRun(runId, parsed);
    await completeAgentJob(job.id);

    return parsed;
  } catch (error) {
    if (runId) await failAgentRun(runId, error);
    await failAgentJob(job.id, error);
    throw error;
  }
}
