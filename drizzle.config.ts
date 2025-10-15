import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "src/backend/database/schema.ts",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: This file is only ever run in a development environment where these env vars are always set.
    url: process.env.DATABASE_URL!
  }
})
