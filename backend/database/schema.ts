import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core"
import * as authSchema from "./auth-schema"

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

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull().$type<any[]>(),
  edges: jsonb("edges").notNull().$type<any[]>(),
  compiledCode: text("compiled_code"),
  isPublished: boolean("is_published").default(false).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull()
})

export const workflowSecrets = pgTable("workflow_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull()
})

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),
  status: text("status")
    .notNull()
    .$type<"pending" | "running" | "success" | "failed">(),
  input: jsonb("input"),
  output: jsonb("output"),
  error: text("error"),
  logs: jsonb("logs").$type<any[]>(),
  startedAt: timestamp("started_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", {
    mode: "date",
    precision: 3,
    withTimezone: true
  })
})

export * from "./auth-schema"
