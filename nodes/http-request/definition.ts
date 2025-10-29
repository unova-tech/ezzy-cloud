import type { INode } from "node-base"
import { lucideIcon } from "node-base"
import { z } from "zod"

const HttpRequestNode = {
  name: "http-request",
  title: "HTTP Request",
  description: "Make an HTTP request to any URL",
  icon: lucideIcon("ArrowRightLeft"),
  nodeType: "action",
  category: "default-lib",
  properties: z.object({
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).meta({
      title: "Method",
      description: "HTTP method"
    }),
    url: z.url().meta({
      title: "URL",
      description: "Target URL for the request"
    }),
    headers: z
      .array(
        z.object({
          key: z.string().meta({ title: "Header Name" }),
          value: z.string().meta({ title: "Header Value" })
        })
      )
      .optional()
      .meta({
        title: "Headers",
        description: "HTTP headers to include"
      }),
    body: z.string().optional().meta({
      title: "Body",
      description: "Request body (for POST, PUT, PATCH)",
      field: "textarea"
    }),
    timeout: z.number().default(30000).meta({
      title: "Timeout",
      description: "Request timeout in milliseconds"
    })
  }),
  result: z.object({
    statusCode: z.number().meta({ title: "HTTP status code" }),
    headers: z.record(z.string(), z.string()).meta({ title: "Response headers" }),
    body: z.string().meta({ title: "Response body" }),
    responseTime: z.number().meta({ title: "Response time in ms" })
  })
} as const satisfies INode

export default HttpRequestNode
