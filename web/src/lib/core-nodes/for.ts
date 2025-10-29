import type { INode } from "node-base"
import { lucideIcon } from "node-base"
import { z } from "zod"

const ForNode = {
  name: "for",
  title: "For Loop",
  description: "Iterate over an array",
  icon: lucideIcon("Repeat"),
  nodeType: "action",
  category: "core",
  isStructural: true,
  properties: z.object({
    iterator: z
      .string()
      .meta({
        title: "Iterator",
        description: "Expression that returns an array",
        field: "textarea"
      }),
    itemVariable: z
      .string()
      .meta({
        title: "Item Variable",
        description: "Name of the variable for each item"
      }),
    batchSize: z
      .number()
      .optional()
      .meta({
        title: "Batch Size",
        description: "Process items in batches (optional)"
      })
  }),
  result: z.object({}),
  customOutputs: [
    { id: "body", label: "Loop Body", type: "control" as const },
    { id: "done", label: "Done", type: "control" as const }
  ]
} as const satisfies INode

export default ForNode
