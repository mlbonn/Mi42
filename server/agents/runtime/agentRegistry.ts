import { replyClassifierAgent } from "../agents/replyClassifierAgent";

export const agentRegistry = {
  [replyClassifierAgent.jobType]: replyClassifierAgent,
};

export function getAgentByJobType(jobType: string) {
  const agent = agentRegistry[jobType as keyof typeof agentRegistry];
  if (!agent) throw new Error(`Unknown agent job type: ${jobType}`);
  return agent;
}
