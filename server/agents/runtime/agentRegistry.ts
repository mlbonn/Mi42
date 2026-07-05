import { replyClassifierAgent } from "../agents/replyClassifierAgent";
import { companyEnrichmentAgent } from "../agents/companyEnrichmentAgent";

export const agentRegistry = {
  [replyClassifierAgent.jobType]: replyClassifierAgent,
  [companyEnrichmentAgent.jobType]: companyEnrichmentAgent,
};

export function getAgentByJobType(jobType: string) {
  const agent = agentRegistry[jobType as keyof typeof agentRegistry];
  if (!agent) throw new Error(`Unknown agent job type: ${jobType}`);
  return agent;
}
