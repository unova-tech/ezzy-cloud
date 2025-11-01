import type { INode } from "node-base"
import { simpleIcon } from "node-base"
import { z } from "zod"
import ResendAPIKeySecret from "../apikey-secret"

const ResendSendEmailNode = {
  name: "resend-send-email",
  title: "Resend send email",
  description: "Resend an email to a specified recipient",
  icon: simpleIcon("SiResend"),
  nodeType: "action",
  category: "default-lib",
  properties: z.object({
    toEmail: z.email().meta({
      title: "Recipient",
      description: "The email address of the email to resend"
    }),
    fromEmail: z.string().min(1).meta({
      title: "Sender",
      description: "The sender's email address"
    }),
    subject: z.string().min(1).meta({
      title: "Subject",
      description: "The subject of the email"
    }),
    body: z.string().min(1).meta({
      title: "Body",
      description: "The body content of the email",
      field: "textarea"
    })
  }),
  result: z.object({
    success: z
      .boolean()
      .describe("Indicates if the email was resent successfully"),
    message: z.string().describe("A message regarding the resend operation")
  }),
  secrets: {
    apiKey: ResendAPIKeySecret
  }
} as const satisfies INode

export default ResendSendEmailNode
