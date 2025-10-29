import type { ISecret } from "node-base"
import { z } from "zod"

const ResendAPIKeySecret = {
  name: "resend-api-key",
  title: "Resend API Key",
  description: "API key for Resend service",
  schema: z.string().meta({
    title: "API Key",
    description: "Your Resend API key"
  })
} as const satisfies ISecret

export default ResendAPIKeySecret
