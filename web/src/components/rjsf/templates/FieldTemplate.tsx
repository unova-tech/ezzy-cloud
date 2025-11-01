import {
  type FieldTemplateProps,
  type FormContextType,
  getTemplate,
  getUiOptions,
  type RJSFSchema,
  type StrictRJSFSchema
} from "@rjsf/utils"
import { cn } from "@/lib/utils"

/**
 * Custom FieldTemplate that extends the default shadcn behavior
 * but moves the description BEFORE the input field for better UX.
 *
 * Order: label → description → children → errors → help
 */
export default function FieldTemplate<
  T = unknown,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = FormContextType
>({
  id,
  children,
  displayLabel,
  rawErrors = [],
  errors,
  help,
  description,
  rawDescription,
  classNames,
  style,
  disabled,
  label,
  hidden,
  onKeyRename,
  onKeyRenameBlur,
  onRemoveProperty,
  readonly,
  required,
  schema,
  uiSchema,
  registry
}: FieldTemplateProps<T, S, F>) {
  const uiOptions = getUiOptions(uiSchema)
  const WrapIfAdditionalTemplate = getTemplate<
    "WrapIfAdditionalTemplate",
    T,
    S,
    F
  >("WrapIfAdditionalTemplate", registry, uiOptions)

  if (hidden) {
    return <div className="hidden">{children}</div>
  }

  return (
    <WrapIfAdditionalTemplate
      classNames={classNames}
      style={style}
      disabled={disabled}
      id={id}
      label={label}
      onKeyRename={onKeyRename}
      onKeyRenameBlur={onKeyRenameBlur}
      onRemoveProperty={onRemoveProperty}
      readonly={readonly}
      required={required}
      schema={schema}
      uiSchema={uiSchema}
      registry={registry}
    >
      <div className="flex flex-col gap-2">
        {/* Label */}
        {displayLabel && (
          <label
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              { " text-destructive": rawErrors.length > 0 }
            )}
            htmlFor={id}
          >
            {label}
            {required ? <span className="text-destructive ml-1">*</span> : null}
          </label>
        )}

        {/* Description BEFORE input */}
        {displayLabel && rawDescription && (
          <span
            className={cn("text-xs font-medium text-muted-foreground", {
              " text-destructive": rawErrors.length > 0
            })}
          >
            {description}
          </span>
        )}

        {/* Input field */}
        {children}

        {/* Errors */}
        {errors}

        {/* Help text */}
        {help}
      </div>
    </WrapIfAdditionalTemplate>
  )
}
