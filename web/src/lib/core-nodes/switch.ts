import type { INode } from "node-base"
import { lucideIcon } from "node-base"
import { z } from "zod"

const SwitchNode = {
  name: "switch",
  title: "Switch",
  description: "Multiple branches based on expression value",
  icon: lucideIcon("GitMerge"),
  nodeType: "action",
  category: "core",
  isStructural: true,
  properties: z.object({
    expression: z.string().meta({
      title: "Expression",
      description: "Expression to evaluate",
      field: "textarea"
    }),
    cases: z
      .array(
        z.object({
          value: z.string().meta({ title: "Value" }),
          label: z.string().optional().meta({ title: "Label" })
        })
      )
      .meta({
        title: "Cases",
        description: "List of cases to match against"
      })
  }),
  result: z.object({}),
  // CustomOutputs will be generated dynamically: one for each case + 'default'
  customOutputs: [] as Array<{
    id: string
    label: string
    type: "control" | "data"
  }>
} as const satisfies INode

export default SwitchNode
