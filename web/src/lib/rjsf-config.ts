import type { RJSFSchema, UiSchema } from "@rjsf/utils"
import { customizeValidator } from "@rjsf/validator-ajv8"
import { z } from "zod"

/**
 * Custom AJV8 validator instance for RJSF forms
 * Configured to handle Zod-generated schemas properly by removing $schema references
 */
export const validator = customizeValidator({
  ajvOptionsOverrides: {
    // Allow unknown formats to prevent errors with custom Zod formats
    strict: false,
    validateFormats: false,
  },
})

/**
 * Default configuration for RJSF forms across the application
 */
export const defaultFormConfig = {
  /**
   * Disable live validation - only validate on form submit
   * This provides a better UX by not showing errors while user is typing
   */
  liveValidate: false,

  /**
   * Don't show error list at the top of the form
   * Errors will still be shown inline next to each field
   */
  showErrorList: false,

  /**
   * Focus on the first field with an error after validation
   * Helps user quickly locate and fix validation issues
   */
  focusOnFirstError: true
}

/**
 * Converts a Zod schema to JSON Schema format compatible with RJSF,
 * removing the $schema property that causes validation issues.
 *
 * @param schema - Zod schema to convert
 * @returns JSON Schema object that can be used with RJSF
 *
 * @example
 * ```ts
 * const zodSchema = z.object({
 *   name: z.string(),
 *   age: z.number().optional()
 * })
 *
 * const jsonSchema = zodToJsonSchema(zodSchema)
 * // Use jsonSchema with RJSF Form component
 * ```
 */
export function zodToJsonSchema(schema: z.ZodType): RJSFSchema {
  const jsonSchema = z.toJSONSchema(schema) as any
  
  // Remove $schema property that causes validation issues with AJV
  if (jsonSchema.$schema) {
    delete jsonSchema.$schema
  }
  
  // Recursively remove $schema from nested schemas
  function cleanSchema(obj: any): void {
    if (!obj || typeof obj !== "object") return
    
    if (obj.$schema) {
      delete obj.$schema
    }
    
    // Clean properties
    if (obj.properties) {
      for (const prop of Object.values(obj.properties)) {
        cleanSchema(prop)
      }
    }
    
    // Clean items (for arrays)
    if (obj.items) {
      cleanSchema(obj.items)
    }
    
    // Clean definitions/defs
    if (obj.definitions) {
      for (const def of Object.values(obj.definitions)) {
        cleanSchema(def)
      }
    }
    if (obj.$defs) {
      for (const def of Object.values(obj.$defs)) {
        cleanSchema(def)
      }
    }
  }
  
  cleanSchema(jsonSchema)
  
  return jsonSchema as RJSFSchema
}

/**
 * Builds a RJSF uiSchema dynamically from a JSON Schema by detecting patterns
 * and mapping them to appropriate custom widgets.
 *
 * Detection rules:
 * - `field === "select"` → Maps to `ShadcnMetaSelectWidget`
 * - `field === "textarea"` → Maps to default `textarea` widget
 * - Array of objects with `{key, value}` properties → Maps to `KeyValueArrayField` (custom field)
 *
 * @param schema - JSON Schema to generate uiSchema from
 * @returns UiSchema object with widget mappings
 *
 * @example
 * ```ts
 * const jsonSchema = {
 *   type: "object",
 *   properties: {
 *     method: { type: "string", enum: ["GET", "POST"], field: "select" },
 *     headers: {
 *       type: "array",
 *       items: {
 *         type: "object",
 *         properties: { key: { type: "string" }, value: { type: "string" } }
 *       }
 *     }
 *   }
 * }
 *
 * const uiSchema = buildUiSchemaFromJsonSchema(jsonSchema)
 * // Returns: { method: { "ui:widget": "ShadcnMetaSelectWidget" }, headers: { "ui:field": "KeyValueArrayField" } }
 * ```
 */
export function buildUiSchemaFromJsonSchema(schema: RJSFSchema): UiSchema {
  const uiSchema: UiSchema = {}

  /**
   * Process a single schema node and return UI configuration
   */
  function processNode(node: any): Record<string, any> | null {
    const config: Record<string, any> = {}

    // Check for field metadata to map to specific widgets
    if (node.field === "select") {
      config["ui:widget"] = "ShadcnMetaSelectWidget"
    } else if (node.field === "textarea") {
      config["ui:widget"] = "textarea"
    }

    // Detect key-value array pattern and use custom field instead of widget
    if (
      node.type === "array" &&
      node.items &&
      typeof node.items === "object" &&
      node.items.type === "object" &&
      node.items.properties &&
      "key" in node.items.properties &&
      "value" in node.items.properties
    ) {
      config["ui:field"] = "KeyValueArrayField"
    }

    return Object.keys(config).length > 0 ? config : null
  }

  /**
   * Recursively walk the schema and build uiSchema
   */
  function walkSchema(node: any, dst: any) {
    if (!node || typeof node !== "object") return

    // Process current node for widget mapping
    const nodeConfig = processNode(node)
    if (nodeConfig) {
      Object.assign(dst, nodeConfig)
    }

    // Process object properties recursively
    if (node.type === "object" && node.properties) {
      for (const [key, prop] of Object.entries(node.properties)) {
        if (!dst[key]) dst[key] = {}
        walkSchema(prop, dst[key])
      }
    }

    // Process array items recursively
    if (node.type === "array" && node.items) {
      if (!dst.items) dst.items = {}
      walkSchema(node.items, dst.items)
    }
  }

  // Start walking from root schema
  walkSchema(schema, uiSchema)

  return uiSchema
}