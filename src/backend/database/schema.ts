import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { defaultLanguage, supportedLanguages } from "@/i18n/languages"

export const languagesEnum = pgEnum("languages", supportedLanguages)

export const users = pgTable("waitlist", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  ipAddress: text("ip_address").notNull(),
  language: languagesEnum().notNull().default(defaultLanguage),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull()
})
