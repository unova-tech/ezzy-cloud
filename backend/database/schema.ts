import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const signatures = pgTable("waitlist", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull()
})
