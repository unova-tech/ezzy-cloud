import { relations } from "drizzle-orm"
import {
  foreignKey,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text
} from "drizzle-orm/sqlite-core"
import type { INodeProperties, INodeTypeDescription } from "n8n-workflow"

export const nodesTable = sqliteTable(
  "nodes",
  {
    packageName: text("package_name").notNull(),
    nodeName: text("node_name").notNull(),
    isVersioned: integer("is_versioned", { mode: "boolean" }).notNull(),
    nodeVersion: real("node_version"),
    description: text("description"),
    type: text({ enum: ["trigger", "action"] }).notNull(),
    categories: text("categories", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    propertiesSchema: text("properties_schema", {
      mode: "json"
    })
      .$type<INodeTypeDescription["properties"]>()
      .notNull(),
    inputs: text("inputs", { mode: "json" })
      .$type<INodeTypeDescription["inputs"]>()
      .notNull(),
    outputs: text("outputs", { mode: "json" })
      .$type<INodeTypeDescription["outputs"]>()
      .notNull(),
    executionCode: text("execution_code"),
    documentationMarkdown: text("documentation_markdown")
  },
  (table) => [primaryKey({ columns: [table.packageName, table.nodeName] })]
)

export const credentialsTable = sqliteTable(
  "credentials",
  {
    packageName: text("package_name").notNull(),
    credentialName: text("credential_name").notNull(),
    properties: text("properties", { mode: "json" })
      .$type<INodeProperties[]>()
      .notNull()
  },
  (table) => [
    primaryKey({ columns: [table.packageName, table.credentialName] })
  ]
)

export const nodeCredentialsTable = sqliteTable(
  "node_credentials",
  {
    packageName: text("package_name").notNull(),
    nodeName: text("node_name").notNull(),
    credentialName: text("credential_name").notNull(),
    required: integer("required", { mode: "boolean" }).notNull().default(false)
  },
  (table) => [
    primaryKey({
      columns: [table.packageName, table.nodeName, table.credentialName]
    }),
    foreignKey({
      columns: [table.packageName, table.nodeName],
      foreignColumns: [nodesTable.packageName, nodesTable.nodeName]
    }),
    foreignKey({
      columns: [table.packageName, table.credentialName],
      foreignColumns: [
        credentialsTable.packageName,
        credentialsTable.credentialName
      ]
    })
  ]
)

export const nodesRelations = relations(nodesTable, ({ many }) => ({
  credentials: many(nodeCredentialsTable)
}))

export const credentialsRelations = relations(credentialsTable, ({ many }) => ({
  nodes: many(nodeCredentialsTable)
}))

export const nodeCredentialsRelations = relations(
  nodeCredentialsTable,
  ({ one }) => ({
    node: one(nodesTable, {
      fields: [nodeCredentialsTable.packageName, nodeCredentialsTable.nodeName],
      references: [nodesTable.packageName, nodesTable.nodeName]
    }),
    credential: one(credentialsTable, {
      fields: [
        nodeCredentialsTable.packageName,
        nodeCredentialsTable.credentialName
      ],
      references: [
        credentialsTable.packageName,
        credentialsTable.credentialName
      ]
    })
  })
)
