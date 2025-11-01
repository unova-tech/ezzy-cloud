import type React from "react"
import type { z } from "zod"

export type IconDefinition = {
  library: "lucide" | "simple-icons"
  name: string
}

export type ISecret = {
  name: string
  title: string
  description: string
  schema: z.ZodType
}

export type INode = {
  name: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }> | IconDefinition
  properties: z.ZodType
  result: z.ZodType
  secrets?: Record<string, ISecret>
  nodeType: "trigger" | "action"

  // Optional fields for structural and executable nodes
  customOutputs?: Array<{
    id: string
    label: string
    type?: "control" | "data"
  }>
  customInputs?: Array<{ id: string; label: string; type?: "control" | "data" }>
  category?: "core" | "default-lib" | "external-lib"
  isStructural?: boolean
}

// Helper type para extrair os tipos dos secrets de um Node
export type ExtractSecrets<T extends INode> = {
  [K in keyof T["secrets"]]: T["secrets"][K] extends { schema: infer S }
    ? S extends z.ZodType
      ? z.input<S>
      : never
    : never
}

// Helper type para extrair os tipos das properties de um Node
export type ExtractProps<T extends INode> = z.input<T["properties"]>

// Helper functions to create icon definitions
export function lucideIcon(name: string): IconDefinition {
  return { library: "lucide", name }
}

export function simpleIcon(name: string): IconDefinition {
  return { library: "simple-icons", name }
}
