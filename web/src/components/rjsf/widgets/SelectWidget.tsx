import type { WidgetProps } from "@rjsf/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

/**
 * Custom RJSF widget for rendering enums as shadcn/ui Select component
 * when explicitly marked with metadata.
 *
 * This widget is triggered when the schema contains `field: "select"` metadata
 * (added via Zod's `.meta({ field: "select" })`).
 *
 * Registered as `ShadcnMetaSelectWidget` to avoid overriding the base SelectWidget.
 *
 * @example
 * ```typescript
 * // In Zod schema:
 * method: z.enum(["GET", "POST", "PUT", "DELETE"]).meta({ field: "select" })
 * ```
 */
export function ShadcnMetaSelectWidget(props: WidgetProps) {
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    onChange,
    options,
    schema,
    rawErrors
  } = props

  // Only render if this is explicitly marked as a select field
  if (schema.field !== "select") {
    return null
  }

  // Get enum options from RJSF
  const enumOptions = options.enumOptions || []
  const hasErrors = rawErrors && rawErrors.length > 0

  return (
    <Select
      value={value || ""}
      onValueChange={(newValue) => onChange(newValue)}
      disabled={disabled || readonly}
      required={required}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={hasErrors}>
        <SelectValue placeholder="Select an option..." />
      </SelectTrigger>

      <SelectContent>
        {enumOptions.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}