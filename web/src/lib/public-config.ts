import * as z from "zod"

const configSchema = z.object({
  BETTER_AUTH_URL: z.string().min(1),
  TURNSTILE_SITE_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional()
})

const { data: publicConfig, error } = configSchema.safeParse({
  BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
})

if (error) {
  throw new Error(error.message)
}

export default publicConfig as z.infer<typeof configSchema>