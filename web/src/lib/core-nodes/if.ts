import type { INode } from "node-base"
import { lucideIcon } from "node-base"
import { z } from "zod"

const IfNode = {
  name: "if",
  title: "If",
  description: "Conditional branch based on a JavaScript expression",
  icon: lucideIcon("GitBranch"),
  nodeType: "action",
  category: "core",
  isStructural: true,
  properties: z.object({
    condition: z.string().meta({
      title: "Condition",
      description: "JavaScript expression that evaluates to true or false",
      field: "textarea"
    })
  }),
  result: z.object({}),
  customOutputs: [
    { id: "true", label: "True", type: "control" as const },
    { id: "false", label: "False", type: "control" as const }
  ]
} as const satisfies INode

export default IfNode
