import type { INode } from "node-base"
import { lucideIcon } from "node-base"
import { z } from "zod"

const MergeNode = {
  name: "merge",
  title: "Merge",
  description: "Synchronize multiple branches",
  icon: lucideIcon("Merge"),
  nodeType: "action",
  category: "core",
  isStructural: true,
  properties: z.object({
    mode: z
      .enum(["wait-all", "first"])
      .meta({
        title: "Mode",
        description: "Wait for all branches or just the first to complete"
      })
  }),
  result: z.object({
    inputs: z.array(z.any()).meta({ title: "Inputs from all branches" })
  }),
  // Supports dynamic multiple inputs
  customInputs: [] as Array<{ id: string; label: string; type: "control" | "data" }>
} as const satisfies INode

export default MergeNode
