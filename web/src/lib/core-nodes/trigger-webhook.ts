import { lucideIcon, type INode } from "node-base"
import { z } from "zod"

const TriggerWebhookNode: INode = {
  name: "trigger-webhook",
  title: "Webhook",
  description: "Generic webhook trigger with configurable authentication and validation",
  icon: lucideIcon("Webhook"),
  nodeType: "trigger",
  category: "core",
  
  properties: z.object({
    path: z.string().default("/").describe("Webhook endpoint path"),
    methods: z.array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"])).default(["POST"]).describe("Allowed HTTP methods"),
    authMode: z.enum(["public", "frontend"]).default("public").describe("Authentication mode: public (HMAC) or frontend (bearer token)"),
    verifySignature: z.boolean().default(false).describe("Verify HMAC signature for public webhooks"),
    secretKeyRef: z.string().optional().describe("Reference to secret key for HMAC verification")
  }),

  result: z.object({
    body: z.any().describe("Request body/input data"),
    headers: z.record(z.string()).describe("HTTP request headers"),
    query: z.record(z.string()).describe("Query parameters"),
    method: z.string().describe("HTTP method used")
  }),

  customOutputs: [
    {
      id: "output",
      label: "On Request",
      type: "control"
    }
  ]
}

export default TriggerWebhookNode
