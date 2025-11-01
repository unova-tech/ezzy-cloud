import { type INode, lucideIcon } from "node-base"
import { z } from "zod"

const TriggerManualNode: INode = {
  name: "trigger-manual",
  title: "Manual Trigger",
  description: "Trigger workflow manually from dashboard or API",
  icon: lucideIcon("PlayCircle"),
  nodeType: "trigger",
  category: "core",

  // Manual trigger doesn't need configuration - it's triggered by user action
  properties: z.object({}),

  result: z.object({
    input: z.any().describe("Input data provided when triggering manually"),
    triggeredBy: z.string().optional().describe("User who triggered the workflow"),
    triggeredAt: z.string().optional().describe("Timestamp when workflow was triggered")
  }),

  customOutputs: [
    {
      id: "output",
      label: "On Trigger",
      type: "control"
    }
  ]
}

export default TriggerManualNode
