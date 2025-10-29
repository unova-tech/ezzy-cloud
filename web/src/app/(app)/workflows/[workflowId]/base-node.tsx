import {
  type ConnectionState,
  type Node,
  type NodeProps,
  Position,
  useConnection,
  useEdges
} from "@xyflow/react"
import { AlertCircle, Box, Plus } from "lucide-react"
import type { INode as INodeTypeData } from "node-base"
import type React from "react"
import { BaseHandle } from "@/components/base-handle"
import {
  BaseNode as Base,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle
} from "@/components/base-node"
import { ButtonHandle } from "@/components/button-handle"
import { Button } from "@/components/ui/button"
import { getIconComponent, type IconDefinition } from "@/lib/icon-registry"
import { useNodeContext } from "./node-context"

type BaseNodeData = Node<{
  label: string | null
  nodeTypeData: INodeTypeData
  properties?: Record<string, unknown>
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
  if (!data.nodeTypeData) return false

  const schema = data.nodeTypeData.properties
  const properties = data.properties || {}

  // Check if schema has safeParse method (is a Zod schema)
  if (
    schema &&
    typeof schema === "object" &&
    "safeParse" in schema &&
    typeof schema.safeParse === "function"
  ) {
    const result = schema.safeParse(properties)
    return result.success
  }

  // If no schema or schema doesn't have safeParse, consider it valid
  // (This happens when nodes are loaded from saved data)
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
  const customOutputs = data.nodeTypeData.customOutputs || []
  const customInputs = data.nodeTypeData.customInputs || []
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
    return (
      <Base className="min-w-[200px] relative">
        {!isValid && (
          <div className="absolute -top-2 -right-2 z-10">
            <AlertCircle className="w-5 h-5 text-red-500 fill-red-50" />
          </div>
        )}
        <BaseNodeHeader>
          <IconRenderer icon={data.nodeTypeData.icon} className="w-5 h-5" />
          <BaseNodeHeaderTitle>
            {data.label || data.nodeTypeData.title}
          </BaseNodeHeaderTitle>
        </BaseNodeHeader>
        <BaseNodeContent className="py-8">
          {/* Default input handle for structural nodes */}
          {customInputs.length === 0 && (
            <BaseHandle id="input" type="target" position={Position.Left} />
          )}

          {/* Custom input handles */}
          {customInputs.map((input, idx) => (
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

          {/* Labels for custom outputs */}
          {customOutputs.map((output, idx) => (
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
  return (
    <Base className="w-14 h-14 relative">
      {!isValid && (
        <div className="absolute -top-2 -right-2 z-10">
          <AlertCircle className="w-5 h-5 text-red-500 fill-red-50" />
        </div>
      )}
      <BaseNodeContent className="flex items-center justify-center h-full">
        {data.nodeTypeData.nodeType === "action" && (
          <BaseHandle id="target-1" type="target" position={Position.Left} />
        )}
        <IconRenderer icon={data.nodeTypeData.icon} />
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
