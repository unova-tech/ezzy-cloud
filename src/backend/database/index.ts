import { upstashCache } from "drizzle-orm/cache/upstash"
import config from "@/lib/config"
import * as schema from "./schema"

let drizzle: typeof import("drizzle-orm/node-postgres").drizzle

if (config.NODE_ENV !== "production") {
  drizzle = (await import("drizzle-orm/node-postgres")).drizzle
} else {
  drizzle = (await import("drizzle-orm/neon-http"))
    .drizzle as unknown as typeof import("drizzle-orm/node-postgres").drizzle
}

const db = drizzle(config.DATABASE_URL, {
  schema,
  cache: upstashCache({
    url: config.KV_REST_API_URL,
    token: config.KV_REST_API_TOKEN
  })
})

export default db
export * from "./schema"
