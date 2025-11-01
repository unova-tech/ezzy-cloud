import { simpleIcon, type INode } from "node-base"
import { z } from "zod"

const CodeNode = {
  name: "code",
  title: "Code",
  description: "Execute custom JavaScript code",
  icon: simpleIcon("SiJavascript"),
  nodeType: "action",
  category: "core",
  properties: z.object({
    code: z.string().meta({
      title: "Code",
      description: "JavaScript code to execute",
      field: "textarea"
    }),
    inputVariables: z.array(z.string()).optional().meta({
      title: "Input Variables",
      description: "Variables available in the code context"
    })
  }),
  result: z.object({
    output: z.any().meta({ title: "Code execution result" }),
    logs: z.array(z.string()).meta({ title: "Console logs" })
  })
} as const satisfies INode

export default CodeNode
