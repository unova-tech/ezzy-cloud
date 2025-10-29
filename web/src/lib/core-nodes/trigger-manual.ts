import type { INode } from "node-base"
import { lucideIcon } from "node-base"
import { z } from "zod"

const TriggerManualNode = {
  name: "trigger-manual",
  title: "Manual Trigger",
  description: "Start the workflow manually",
  icon: lucideIcon("Play"),
  nodeType: "trigger",
  category: "core",
  isStructural: true,
  properties: z.object({
    inputSchema: z
      .string()
      .optional()
      .meta({
        title: "Input Schema",
        description: "JSON schema for the input payload (optional)",
        field: "textarea"
      })
  }),
  result: z.object({
    payload: z.any().meta({ title: "Input payload" })
  })
} as const satisfies INode

export default TriggerManualNode
