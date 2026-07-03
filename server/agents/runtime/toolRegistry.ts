import { crmTools } from "../tools/crmTools";
import { emailTools } from "../tools/emailTools";
import { taskTools } from "../tools/taskTools";
import { complianceTools } from "../tools/complianceTools";

export const toolRegistry = {
  ...crmTools,
  ...emailTools,
  ...taskTools,
  ...complianceTools,
};

export type ToolName = keyof typeof toolRegistry;
