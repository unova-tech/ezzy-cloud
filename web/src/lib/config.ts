import * as z from "zod"

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  DATABASE_URL: z.url(),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.email(),
  KV_REST_API_URL: z.url(),
  KV_REST_API_TOKEN: z.string().min(1),
  SENTRY_AUTH_TOKEN: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  FORMBRICKS_API_KEY: z.string().min(1),
  AI_GATEWAY_API_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(2),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  AUTUMN_SECRET_KEY: z.string().min(1)
})

const { data: config, error } = configSchema.safeParse(process.env)

if (error) {
  throw new Error(error.message)
}

export default config as z.infer<typeof configSchema>
