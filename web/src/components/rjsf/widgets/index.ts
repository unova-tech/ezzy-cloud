/**
 * Custom RJSF widgets and fields for Ezzy Cloud workflow editor
 *
 * This module exports custom widgets and fields that extend the @rjsf/shadcn theme:
 *
 * **Widgets:**
 * - **ShadcnMetaSelectWidget**: Renders enums as shadcn/ui Select component when
 *   `schema.field === "select"` (set via Zod's `.meta({ field: "select" })`).
 *   Does not override the base SelectWidget, allowing default enum rendering to work.
 *
 * **Fields:**
 * - **KeyValueArrayField**: Renders arrays of `{key, value}` objects as a
 *   dynamic list with add/remove functionality. Automatically applied when
 *   uiSchema specifies `"ui:field": "KeyValueArrayField"`.
 *
 * @example
 * ```typescript
 * import { customWidgets, customFields } from '@/components/rjsf/widgets'
 * import { validator } from '@/lib/rjsf-config'
 *
 * <Form
 *   schema={schema}
 *   validator={validator}
 *   widgets={customWidgets}
 *   fields={customFields}
 *   formData={formData}
 *   onChange={handleChange}
 * />
 * ```
 */

import { Theme } from "@rjsf/shadcn"
import type { RegistryFieldsType, RegistryWidgetsType } from "@rjsf/utils"
import { KeyValueArrayField } from "./KeyValueListWidget"
import { ShadcnMetaSelectWidget } from "./SelectWidget"

/**
 * Combined widgets object merging base shadcn theme widgets with custom widgets.
 * Custom widgets are registered with unique names to avoid overriding base widgets.
 */
export const customWidgets: RegistryWidgetsType = {
  ...Theme.widgets,
  ShadcnMetaSelectWidget
}

/**
 * Custom fields registry for specialized form field rendering.
 * Fields provide more control than widgets for complex data structures.
 */
export const customFields: RegistryFieldsType = {
  KeyValueArrayField
}

// Re-export individual widgets and fields for direct usage if needed
export { ShadcnMetaSelectWidget, KeyValueArrayField }

// Default export for convenience
export default customWidgets
