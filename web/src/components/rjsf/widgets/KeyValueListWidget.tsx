import type { FieldProps } from "@rjsf/utils"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Custom RJSF field for rendering arrays of objects with {key, value} properties
 * as a dynamic list with add/remove functionality.
 *
 * This field is triggered when the uiSchema specifies:
 * - "ui:field": "KeyValueArrayField"
 *
 * @example
 * ```typescript
 * // In Zod schema:
 * headers: z.array(z.object({
 *   key: z.string(),
 *   value: z.string()
 * })).optional()
 * ```
 */
export function KeyValueArrayField(props: FieldProps) {
  const {
    idSchema,
    formData,
    required,
    disabled,
    readonly,
    onChange,
    schema,
    uiSchema,
    errorSchema,
    fieldPathId
  } = props

  // Safely access idSchema with fallback
  const id = idSchema?.$id || "key-value-field"
  const label = uiSchema?.["ui:title"] || schema.title || "Items"

  // Ensure formData is an array, default to empty array
  const items: Array<{ key: string; value: string }> = Array.isArray(formData)
    ? formData
    : []

  const hasErrors =
    errorSchema && errorSchema.__errors && errorSchema.__errors.length > 0

  /**
   * Add a new empty key-value pair to the list
   */
  const handleAdd = () => {
    const newItems = [...items, { key: "", value: "" }]
    // Call onChange with newValue and path (RJSF v6 signature)
    onChange(newItems, fieldPathId.path)
  }

  /**
   * Remove a key-value pair at the specified index
   */
  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    // Call onChange with newValue and path (RJSF v6 signature)
    onChange(newItems, fieldPathId.path)
  }

  /**
   * Update a specific field (key or value) at the specified index
   */
  const handleChange = (
    index: number,
    field: "key" | "value",
    newValue: string
  ) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: newValue }
    // Call onChange with newValue and path (RJSF v6 signature)
    onChange(newItems, fieldPathId.path)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items added yet</p>
        ) : (
          items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
            >
              <Input
                id={`${id}-${index}-key`}
                type="text"
                value={item.key}
                onChange={(e) => handleChange(index, "key", e.target.value)}
                placeholder="Key"
                disabled={disabled || readonly}
                aria-label={`Key ${index + 1}`}
              />

              <Input
                id={`${id}-${index}-value`}
                type="text"
                value={item.value}
                onChange={(e) => handleChange(index, "value", e.target.value)}
                placeholder="Value"
                disabled={disabled || readonly}
                aria-label={`Value ${index + 1}`}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                disabled={disabled || readonly}
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || readonly}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {hasErrors && (
        <div className="space-y-1">
          {errorSchema.__errors?.map((error, index) => (
            <p key={index} className="text-sm text-red-500">
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
