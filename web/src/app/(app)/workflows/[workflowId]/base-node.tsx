import {
  type ConnectionState,
  type Node,
  type NodeProps,
  Position,
  useConnection,
  useEdges
} from "@xyflow/react"
import { AlertCircle, Box, Plus } from "lucide-react"
import type React from "react"
import { BaseHandle } from "@/components/base-handle"
import { BaseNode as Base, BaseNodeContent } from "@/components/base-node"
import { ButtonHandle } from "@/components/button-handle"
import { Button } from "@/components/ui/button"
import { getIconComponent, type IconDefinition } from "@/lib/icon-registry"
import { useNodeContext } from "./node-context"
import { cn } from "@/lib/utils"

// NodeMetadata type matching the one in page.tsx
type NodeMetadata = {
  name: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }> | IconDefinition
  nodeType: "trigger" | "action"
  propertiesSchema: {
    type?: string
    properties?: Record<string, unknown>
  }
  customOutputs?: Array<{
    id: string
    label: string
    type?: "control" | "data"
  }>
  customInputs?: Array<{ id: string; label: string; type?: "control" | "data" }>
}

type BaseNodeData = Node<{
  type: string
  label?: string
  properties?: Record<string, unknown>
  _metadata?: NodeMetadata
}>

const selector = (connection: ConnectionState) => {
  return connection.inProgress
}

// Component to render icon from IconDefinition
function IconRenderer({
  icon,
  className
}: {
  icon: unknown
  className?: string
}) {
  // Try to get the icon component
  const IconComponent =
    icon && typeof icon === "object"
      ? getIconComponent(icon as IconDefinition)
      : null

  // If we have a valid icon component, render it
  if (IconComponent) {
    return <IconComponent className={className} />
  }

  // Fallback to Box icon
  return <Box className={className} />
}

// Função para validar se o node está em estado válido
function validateNodeData(data: BaseNodeData["data"]): boolean {
  if (!data._metadata) return false

  const schema = data._metadata.propertiesSchema
  const properties = data.properties || {}

  // Check if schema has required fields array (JSON Schema standard)
  if (schema && typeof schema === "object" && "required" in schema) {
    const requiredFields = schema.required as string[]
    if (Array.isArray(requiredFields)) {
      // Check if all required fields are present (excluding fields with defaults)
      for (const field of requiredFields) {
        // Skip fields that have a default value - they're auto-filled
        const fieldSchema = schema.properties?.[field] as
          | { default?: unknown }
          | undefined
        if (fieldSchema?.default !== undefined) {
          continue
        }

        if (!(field in properties)) {
          return false
        }
      }
    }
  }

  return true
}

export default function BaseNode({
  data,
  id,
  positionAbsoluteX,
  positionAbsoluteY
}: NodeProps<BaseNodeData>) {
  const connectionInProgress = useConnection(selector)
  const edges = useEdges()
  const { onAddNodeFromHandle } = useNodeContext()

  const hasConnection = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "source-1"
  )

  const isValid = validateNodeData(data)
  const customOutputs = data._metadata?.customOutputs || []
  const customInputs = data._metadata?.customInputs || []
  const hasCustomHandles = customOutputs.length > 0 || customInputs.length > 0

  // Handler para botão que previne propagação de eventos
  const handleButtonClick = (e: React.MouseEvent, handleId: string) => {
    e.stopPropagation()
    e.preventDefault()
    onAddNodeFromHandle(id, handleId, {
      x: positionAbsoluteX,
      y: positionAbsoluteY
    })
  }

  const preventNodeInteraction = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // If node has custom handles, render differently
  if (hasCustomHandles) {
    const isTrigger = data._metadata?.nodeType === "trigger"
    
    return (
      <Base className={cn(
        "min-w-[200px] relative rounded-md",
        isTrigger && "min-w-[56px] w-14 h-14 rounded-l-4xl"
      )}>
        {!isValid && (
          <div className="absolute -top-2 -right-2 z-10">
            <AlertCircle className="w-5 h-5 text-red-500 fill-red-50" />
          </div>
        )}
        <BaseNodeContent className={cn(
          "py-8 relative",
          isTrigger && "py-0 flex items-center justify-center h-full"
        )}>
          {/* Icon - centered for all nodes */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none",
            isTrigger && "relative"
          )}>
            <IconRenderer icon={data._metadata?.icon} className="w-8 h-8" />
          </div>

          {/* Default input handle - NOT for triggers */}
          {!isTrigger && customInputs.length === 0 && (
            <BaseHandle id="input" type="target" position={Position.Left} />
          )}

          {/* Custom input handles - NOT for triggers */}
          {!isTrigger && customInputs.map((input, idx) => (
            <BaseHandle
              key={input.id}
              id={input.id}
              type="target"
              position={Position.Left}
              style={{
                top: `${((idx + 1) / (customInputs.length + 1)) * 100}%`
              }}
            />
          ))}

          {/* Custom output handles with buttons */}
          {customOutputs.map((output, idx) => {
            const handleHasConnection = edges.some(
              (edge) => edge.source === id && edge.sourceHandle === output.id
            )

            return (
              <ButtonHandle
                key={output.id}
                type="source"
                id={output.id}
                position={Position.Right}
                style={{
                  top: `${((idx + 1) / (customOutputs.length + 1)) * 100}%`
                }}
                showButton={!connectionInProgress && !handleHasConnection}
              >
                <Button
                  onClick={(e) => handleButtonClick(e, output.id)}
                  onMouseDown={preventNodeInteraction}
                  onMouseEnter={preventNodeInteraction}
                  onMouseMove={preventNodeInteraction}
                  size="sm"
                  variant="secondary"
                  className="rounded-full h-6 w-6"
                >
                  <Plus size={12} />
                </Button>
              </ButtonHandle>
            )
          })}

          {/* Labels for custom outputs - NOT for triggers */}
          {!isTrigger && customOutputs.map((output, idx) => (
            <div
              key={`label-${output.id}`}
              className="absolute right-4 text-xs text-muted-foreground pointer-events-none"
              style={{
                top: `${((idx + 1) / (customOutputs.length + 1)) * 100}%`,
                transform: "translateY(-50%)"
              }}
            >
              <span>{output.label}</span>
            </div>
          ))}
        </BaseNodeContent>
      </Base>
    )
  }

  // Default rendering for nodes without custom handles
  const isTrigger = data._metadata?.nodeType === "trigger"

  return (
    <Base
      className={cn(
        "w-14 h-14 relative rounded-md",
        isTrigger && "rounded-l-4xl"
      )}
    >
      {!isValid && (
        <div className="absolute -top-2 -right-2 z-10">
          <AlertCircle className="w-5 h-5 text-red-500 fill-red-50" />
        </div>
      )}
      <BaseNodeContent className="flex items-center justify-center h-full">
        {data._metadata?.nodeType === "action" && (
          <BaseHandle id="target-1" type="target" position={Position.Left} />
        )}
        <IconRenderer icon={data._metadata?.icon} />
        <ButtonHandle
          type="source"
          id="source-1"
          position={Position.Right}
          showButton={!connectionInProgress && !hasConnection}
        >
          <Button
            onClick={(e) => handleButtonClick(e, "source-1")}
            onMouseDown={preventNodeInteraction}
            onMouseEnter={preventNodeInteraction}
            onMouseMove={preventNodeInteraction}
            size="sm"
            variant="secondary"
            className="rounded-full h-6 w-6"
          >
            <Plus size={12} />
          </Button>
        </ButtonHandle>
      </BaseNodeContent>
    </Base>
  )
}