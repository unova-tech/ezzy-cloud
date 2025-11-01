"use client"
import type { IChangeEvent } from "@rjsf/core"
import Form from "@rjsf/shadcn"
import type { RJSFSchema } from "@rjsf/utils"
import {
  addEdge,
  Background,
  BackgroundVariant,
  type ColorMode,
  ConnectionLineType,
  Controls,
  type Edge,
  type FitViewOptions,
  MiniMap,
  type Node,
  type OnConnect,
  type OnNodeDrag,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react"
import defaultNodesLib from "core-nodes"
import { useParams, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import type { INode } from "node-base"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { DevTools } from "@/components/devtools"
import { FieldTemplate } from "@/components/rjsf/templates"
import { customFields, customWidgets } from "@/components/rjsf/widgets"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { SidebarProvider } from "@/components/ui/sidebar"
import {
  useCompileWorkflow,
  useSaveWorkflow,
  useWorkflow
} from "@/hooks/use-workflows"
import coreNodesLib from "@/lib/core-nodes"
import { getIconComponent, type IconDefinition } from "@/lib/icon-registry"
import { buildUiSchemaFromJsonSchema, validator, zodToJsonSchema } from "@/lib/rjsf-config"
import BaseEdge from "./base-edge"
import BaseNode from "./base-node"
import { NodeProvider } from "./node-context"
import AppSidebar from "./sidebar"
import { TopBar } from "./TopBar"

import "@xyflow/react/dist/style.css"
import "./style.css"

// Combine core nodes and default lib nodes
const coreNodes = coreNodesLib
const { nodes: defaultNodes } = defaultNodesLib
const allNodes = [...coreNodes, ...defaultNodes]

// Create a map of node types to their JSON Schema definitions (computed once)
const nodeSchemaMap = new Map<
  string,
  {
    node: INode
    propertiesSchema: RJSFSchema
  }
>(
  allNodes.map((node) => {
    // Convert Zod schema to JSON Schema once, removing $schema property
    const propertiesSchema = zodToJsonSchema(node.properties)
    return [node.name, { node, propertiesSchema }]
  })
)

// Group nodes by category
const groupedNodes = allNodes.reduce(
  (acc, node) => {
    const category = node.category || "other"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(node)
    return acc
  },
  {} as Record<string, INode[]>
)

// Simplified node metadata for UI (hydrated from node registry)
type NodeMetadata = {
  name: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }> | IconDefinition
  nodeType: "trigger" | "action"
  propertiesSchema: RJSFSchema
  customOutputs?: Array<{
    id: string
    label: string
    type?: "control" | "data"
  }>
  customInputs?: Array<{ id: string; label: string; type?: "control" | "data" }>
}

// Tipo para dados do node (only persisted data)
type NodeData = {
  type: string // Node type identifier (e.g., "code", "http-request")
  label?: string
  properties?: Record<string, unknown>
  // Hydrated at runtime (not saved to backend)
  _metadata?: NodeMetadata
}

const initialNodes: Node[] = []

const initialEdges: Edge[] = []

const fitViewOptions: FitViewOptions = {
  padding: 0.2
}

const onNodeDrag: OnNodeDrag = () => {}

const nodeTypes = {
  base: BaseNode
}

const edgeTypes = {
  base: BaseEdge
}

// Utility function to sanitize edges by removing UI-only fields
function sanitizeEdges(edges: Edge[]): Edge[] {
  return edges.map((edge) => {
    const { data, ...rest } = edge
    if (!data) return edge

    // Remove UI-only fields like isHovered
    const { isHovered: _isHovered, ...sanitizedData } = data as {
      isHovered?: boolean
      [key: string]: unknown
    }

    return {
      ...rest,
      ...(Object.keys(sanitizedData).length > 0 ? { data: sanitizedData } : {})
    }
  })
}

// Utility function to hydrate nodes with metadata when loading from backend
function hydrateNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const nodeData = node.data as NodeData

    // If already hydrated, skip
    if (nodeData._metadata) {
      return node
    }

    // Get node type identifier
    const nodeType = nodeData.type

    if (!nodeType) {
      console.warn("Node missing type identifier:", node)
      return node
    }

    // Look up node definition and pre-computed schema
    const nodeInfo = nodeSchemaMap.get(nodeType)

    if (!nodeInfo) {
      console.warn(`No definition found for node type: ${nodeType}`, node)
      return node
    }

    // Hydrate with metadata
    const metadata: NodeMetadata = {
      name: nodeInfo.node.name,
      title: nodeInfo.node.title,
      description: nodeInfo.node.description,
      icon: nodeInfo.node.icon,
      nodeType: nodeInfo.node.nodeType,
      propertiesSchema: nodeInfo.propertiesSchema,
      customOutputs: nodeInfo.node.customOutputs,
      customInputs: nodeInfo.node.customInputs
    }

    return {
      ...node,
      data: {
        ...nodeData,
        _metadata: metadata
      }
    }
  })
}

// Utility function to sanitize nodes by removing runtime-only fields before saving
function sanitizeNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    const nodeData = node.data as NodeData

    return {
      ...node,
      data: {
        type: nodeData.type,
        label: nodeData.label,
        properties: nodeData.properties
        // _metadata is intentionally omitted (runtime-only)
      }
    }
  })
}

// Create a sanitized snapshot for comparison
function createSanitizedSnapshot(nodes: Node[], edges: Edge[], name: string) {
  return {
    nodes: sanitizeNodes(nodes),
    edges: sanitizeEdges(edges),
    name
  }
}

function FlowContent() {
  const { resolvedTheme } = useTheme()
  const params = useParams()
  const router = useRouter()
  const workflowId = params.workflowId as string
  const [mounted, setMounted] = useState(false)
  const [showNodePalette, setShowNodePalette] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null)
  const [editingNodeData, setEditingNodeData] = useState<{
    label: string
    properties: Record<string, unknown>
  } | null>(null)
  const [workflowName, setWorkflowName] = useState("Untitled Workflow")
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [tempWorkflowName, setTempWorkflowName] = useState("")
  const [lastSavedState, setLastSavedState] = useState<{
    nodes: Node[]
    edges: Edge[]
    name: string
  } | null>(null)
  // This state will be used by the top bar to show unsaved changes badge
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { screenToFlowPosition } = useReactFlow()
  // biome-ignore lint/suspicious/noExplicitAny: RJSF Form ref type is complex
  const formRef = useRef<any>(null)

  // Custom hooks for React Query
  const workflowQuery = useWorkflow(workflowId)
  const saveMutation = useSaveWorkflow()
  const compileMutation = useCompileWorkflow()

  // Estado para armazenar informações de conexão pendente
  const [pendingConnection, setPendingConnection] = useState<{
    sourceNodeId: string
    sourceHandleId: string
    position: { x: number; y: number }
  } | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Load workflow data if editing existing workflow
  useEffect(() => {
    if (workflowId === "new") {
      setLastSavedState({
        nodes: [],
        edges: [],
        name: "Untitled Workflow"
      })
    } else if (workflowQuery.isSuccess && workflowQuery.data) {
      const hydratedNodes = hydrateNodes(workflowQuery.data.nodes || [])
      const sanitizedEdges = sanitizeEdges(workflowQuery.data.edges || [])
      const loadedName = workflowQuery.data.name || "Untitled Workflow"

      setWorkflowName(loadedName)
      setNodes(hydratedNodes)
      setEdges(sanitizedEdges)
      setLastSavedState({
        nodes: hydratedNodes,
        edges: sanitizedEdges,
        name: loadedName
      })
    }
  }, [
    workflowId,
    workflowQuery.isSuccess,
    workflowQuery.data,
    setNodes,
    setEdges
  ])

  // Show error toast when workflow fails to load
  useEffect(() => {
    if (workflowQuery.isError && workflowQuery.error) {
      toast.error("Error", {
        description: workflowQuery.error.message || "Failed to load workflow"
      })
    }
  }, [workflowQuery.isError, workflowQuery.error])

  // Detect changes by comparing current state with last saved state
  useEffect(() => {
    if (lastSavedState === null) {
      setHasUnsavedChanges(false)
      return
    }

    const currentSnapshot = createSanitizedSnapshot(nodes, edges, workflowName)

    const hasChanges =
      JSON.stringify(currentSnapshot) !== JSON.stringify(lastSavedState)
    setHasUnsavedChanges(hasChanges)
  }, [nodes, edges, workflowName, lastSavedState])

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Atualiza o estado de edição quando um node é selecionado
  useEffect(() => {
    if (!selectedNode) {
      setEditingNodeData(null)
      return
    }

    const nodeData = selectedNode.data as NodeData

    console.log(
      "Selected node:",
      selectedNode.id,
      "has metadata:",
      !!nodeData._metadata,
      "type:",
      nodeData.type
    )

    // If metadata is missing, try to hydrate it on-the-fly
    if (!nodeData._metadata && nodeData.type) {
      console.log("Hydrating metadata for node type:", nodeData.type)
      const nodeInfo = nodeSchemaMap.get(nodeData.type)

      if (nodeInfo) {
        const metadata: NodeMetadata = {
          name: nodeInfo.node.name,
          title: nodeInfo.node.title,
          description: nodeInfo.node.description,
          icon: nodeInfo.node.icon,
          nodeType: nodeInfo.node.nodeType,
          propertiesSchema: nodeInfo.propertiesSchema,
          customOutputs: nodeInfo.node.customOutputs,
          customInputs: nodeInfo.node.customInputs
        }

        console.log(
          "Metadata created:",
          metadata.title,
          "Schema:",
          metadata.propertiesSchema
        )

        // Update the node with metadata immediately
        const updatedData = {
          ...nodeData,
          _metadata: metadata
        }

        // Update in nodes array
        setNodes((nds) =>
          nds.map((node) =>
            node.id === selectedNode.id
              ? {
                  ...node,
                  data: updatedData
                }
              : node
          )
        )

        // Update selectedNode to trigger re-render with metadata
        setSelectedNode({
          ...selectedNode,
          data: updatedData
        })

        return // Let the next render cycle handle setting editingNodeData
      } else {
        console.error(
          "No nodeInfo found for type:",
          nodeData.type,
          "Available types:",
          Array.from(nodeSchemaMap.keys())
        )
      }
    }

    // Set editing data (this runs when metadata is already present)
    console.log(
      "Setting editing data, metadata:",
      nodeData._metadata?.title,
      "properties:",
      nodeData.properties
    )
    setEditingNodeData({
      label: nodeData.label || nodeData._metadata?.title || "",
      properties: nodeData.properties || {}
    })
  }, [selectedNode, setNodes]) // Depend on full selectedNode object

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: "base" }, eds)),
    [setEdges]
  )

  // Shared save logic to avoid duplication
  const saveWorkflow = async (name: string) => {
    const isNewWorkflow = workflowId === "new"

    // Sanitize data before saving
    const sanitizedNodes = sanitizeNodes(nodes)
    const sanitizedEdges = sanitizeEdges(edges)

    const params = isNewWorkflow
      ? { name, nodes: sanitizedNodes, edges: sanitizedEdges }
      : { id: workflowId, name, nodes: sanitizedNodes, edges: sanitizedEdges }

    saveMutation
      .mutateAsync(params)
      .then((result) => {
        toast.success("Workflow saved", {
          description: "Your workflow has been saved successfully."
        })

        // Update last saved state with sanitized data
        setLastSavedState({
          nodes: sanitizedNodes,
          edges: sanitizedEdges,
          name
        })
        setHasUnsavedChanges(false)

        // If this was a new workflow, navigate to the workflow's URL without reload
        if (isNewWorkflow && result?.id) {
          router.replace(`/workflows/${result.id}`)
        }
      })
      .catch((error) => {
        toast.error("Error", {
          description:
            error instanceof Error ? error.message : "Failed to save workflow"
        })
      })
  }

  const handleSaveWorkflow = async () => {
    // Guard against saving after load failure
    if (
      workflowId !== "new" &&
      (workflowQuery.isError || lastSavedState === null)
    ) {
      toast.error("Error", {
        description: "Cannot save workflow that failed to load"
      })
      return
    }

    // Validate workflow name is not empty
    if (!workflowName.trim()) {
      toast.error("Error", {
        description: "Workflow name cannot be empty"
      })
      return
    }

    // Check if this is a new workflow with default name - show naming dialog
    if (workflowId === "new" && workflowName === "Untitled Workflow") {
      setTempWorkflowName(workflowName)
      setShowNameDialog(true)
      return
    }

    await saveWorkflow(workflowName)
  }

  const handleNameDialogConfirm = async () => {
    // Validate name is not empty
    if (!tempWorkflowName.trim()) {
      toast.error("Error", {
        description: "Workflow name cannot be empty"
      })
      return
    }

    // Update the workflow name and close dialog
    const trimmedName = tempWorkflowName.trim()
    setWorkflowName(trimmedName)
    setShowNameDialog(false)

    // Use shared save logic
    await saveWorkflow(trimmedName)
  }

  const handleCompileWorkflow = async () => {
    const sanitizedNodes = sanitizeNodes(nodes)
    const sanitizedEdges = sanitizeEdges(edges)

    compileMutation
      .mutateAsync({ nodes: sanitizedNodes, edges: sanitizedEdges })
      .then((result) => {
        if (result.success) {
          toast.success("Workflow compiled", {
            description: "Your workflow has been compiled successfully."
          })
          console.log("Compiled code:", result.code)

          // Optionally show warnings if present
          if (result.warnings && result.warnings.length > 0) {
            console.warn("Compilation warnings:", result.warnings)
          }
        } else {
          toast.error("Compilation failed", {
            description: result.error || "Failed to compile workflow"
          })
        }
      })
      .catch((error) => {
        toast.error("Error", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to compile workflow"
        })
      })
  }

  const addNode = useCallback(
    (nodeDefinition: INode, position?: { x: number; y: number }) => {
      // Se uma posição for fornecida, usa ela, senão usa o centro do viewport
      const nodePosition =
        position ||
        screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        })

      // Get pre-computed schema
      const nodeInfo = nodeSchemaMap.get(nodeDefinition.name)

      if (!nodeInfo) {
        console.error(
          `Cannot create node: ${nodeDefinition.name} not found in schema map`
        )
        return
      }

      // Create metadata
      const metadata: NodeMetadata = {
        name: nodeInfo.node.name,
        title: nodeInfo.node.title,
        description: nodeInfo.node.description,
        icon: nodeInfo.node.icon,
        nodeType: nodeInfo.node.nodeType,
        propertiesSchema: nodeInfo.propertiesSchema,
        customOutputs: nodeInfo.node.customOutputs,
        customInputs: nodeInfo.node.customInputs
      }

      const newNode: Node<NodeData> = {
        id: `node-${Date.now()}`,
        type: "base",
        position: nodePosition,
        data: {
          type: nodeDefinition.name, // Persist type identifier
          _metadata: metadata // Hydrated metadata
        }
      }

      setNodes((nds) => [...nds, newNode])

      // Se há uma conexão pendente, cria a edge
      if (pendingConnection) {
        // Determina o targetHandle baseado no tipo de node
        // Nodes com custom handles usam "input", nodes normais usam "target-1"
        const hasCustomHandles =
          (nodeDefinition.customOutputs &&
            nodeDefinition.customOutputs.length > 0) ||
          (nodeDefinition.customInputs &&
            nodeDefinition.customInputs.length > 0)

        const targetHandle = hasCustomHandles ? "input" : "target-1"

        // Usa setTimeout para garantir que o node foi adicionado antes de criar a edge
        setTimeout(() => {
          const newEdge: Edge = {
            id: `edge-${Date.now()}`,
            source: pendingConnection.sourceNodeId,
            sourceHandle: pendingConnection.sourceHandleId,
            target: newNode.id,
            targetHandle: targetHandle,
            type: "base"
          }
          setEdges((eds) => [...eds, newEdge])
          setPendingConnection(null)
        }, 10)
      }

      setSelectedNode(newNode)
      setShowNodePalette(false)
    },
    [screenToFlowPosition, setNodes, setEdges, pendingConnection]
  )

  // Função chamada quando o botão + é clicado em uma handle
  const handleAddNodeFromHandle = useCallback(
    (
      sourceNodeId: string,
      sourceHandleId: string,
      sourcePosition: { x: number; y: number }
    ) => {
      // Calcula posição à direita do node atual (200px à direita)
      const newPosition = {
        x: sourcePosition.x + 300,
        y: sourcePosition.y
      }

      // Fecha o sheet de edição se estiver aberto
      setSelectedNode(null)

      setPendingConnection({
        sourceNodeId,
        sourceHandleId,
        position: newPosition
      })

      setShowNodePalette(true)
    },
    []
  )

  const colorMode = (mounted ? resolvedTheme : "dark") as ColorMode

  // Contexto para os nodes
  const nodeContextValue = {
    onAddNodeFromHandle: handleAddNodeFromHandle,
    setShowNodePalette
  }

  if (workflowQuery.isLoading && workflowId !== "new") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading workflow...</div>
      </div>
    )
  }

  return (
    <NodeProvider value={nodeContextValue}>
      {/* Top bar with workflow name and action buttons */}
      <TopBar
        workflowName={workflowName}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSaveWorkflow}
        onCompile={handleCompileWorkflow}
        onAddNode={() => setShowNodePalette(true)}
        isSaving={saveMutation.isPending}
        isCompiling={compileMutation.isPending}
        loadError={workflowQuery.isError}
      />

      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0 border-t-2 border-l-2 border-border rounded-tl-4xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          onNodeClick={(_, node) => setSelectedNode(node as Node<NodeData>)}
          connectionLineType={ConnectionLineType.Bezier}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={fitViewOptions}
          colorMode={colorMode}
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <MiniMap />
          <Controls />
          {process.env.NODE_ENV === "development" && (
            <DevTools position="top-left" />
          )}
        </ReactFlow>
      </div>

      {/* Sheet para adicionar nodes */}
      <Sheet
        open={showNodePalette}
        onOpenChange={(open) => {
          setShowNodePalette(open)
          if (!open) {
            setPendingConnection(null)
          }
        }}
      >
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Add Node</SheetTitle>
            <SheetDescription>
              {pendingConnection
                ? "Choose a node to connect"
                : "Choose a node to add to your workflow"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {(Object.entries(groupedNodes) as Array<[string, INode[]]>).map(
              ([category, nodes]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">
                    {category === "core"
                      ? "Core Nodes"
                      : category === "default-lib"
                        ? "Default Library"
                        : category}
                  </h3>
                  <div className="space-y-3">
                    {nodes.map((node) => (
                      <button
                        type="button"
                        key={node.name}
                        onClick={() =>
                          addNode(node, pendingConnection?.position)
                        }
                        className="flex w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all group"
                      >
                        <div className="flex items-center justify-center h-full mr-4">
                          {(() => {
                            const IconComponent = getIconComponent(
                              node.icon as IconDefinition
                            )
                            return IconComponent ? (
                              <IconComponent className="w-5 h-5" />
                            ) : null
                          })()}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-base group-hover:text-primary transition-colors">
                            {node.title}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {node.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 font-mono">
                            Type: {node.nodeType}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet para editar propriedades do node */}
      <Sheet
        open={selectedNode !== null}
        onOpenChange={(open) => !open && setSelectedNode(null)}
      >
        <SheetContent className="w-[400px] sm:w-[540px] p-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Node Properties</SheetTitle>
            <SheetDescription>
              {(selectedNode?.data as NodeData)?._metadata?.title ||
                "Configure your node"}
            </SheetDescription>
          </SheetHeader>
          {(selectedNode?.data as NodeData)?._metadata && editingNodeData && (
            // biome-ignore lint/a11y: Need interactive div for form keyboard shortcuts
            <div
              role="form"
              onKeyDown={(e) => {
                // Ctrl+Enter ou Cmd+Enter submete o formulário
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault()
                  formRef.current?.submit()
                }
              }}
              className="mt-6 space-y-4 px-1"
            >
              {/* Campo Label (mantido) */}
              <div className="space-y-2">
                <Label htmlFor="node-label">Label</Label>
                <Input
                  id="node-label"
                  value={editingNodeData.label}
                  onChange={(e) => {
                    setEditingNodeData({
                      ...editingNodeData,
                      label: e.target.value
                    })
                  }}
                />
              </div>

              {/* Divisor e propriedades do node */}
              {(() => {
                if (!selectedNode) return null

                const nodeData = selectedNode.data as NodeData
                const metadata = nodeData._metadata

                if (!metadata) return null

                // Use pre-computed JSON Schema
                const jsonSchema = metadata.propertiesSchema

                // Check if node has properties
                const hasProperties =
                  jsonSchema.type === "object" &&
                  jsonSchema.properties &&
                  Object.keys(jsonSchema.properties).length > 0

                // If no properties, don't render this section at all
                if (!hasProperties) return null

                // Generate uiSchema dynamically
                const uiSchema = buildUiSchemaFromJsonSchema(jsonSchema)

                // Ensure formData has default values from schema
                const formDataWithDefaults = editingNodeData.properties || {}

                // Apply defaults from schema if properties are missing
                if (jsonSchema.properties) {
                  for (const [key, prop] of Object.entries(
                    jsonSchema.properties
                  )) {
                    const schemaProp = prop as RJSFSchema
                    if (
                      formDataWithDefaults[key] === undefined &&
                      schemaProp.default !== undefined
                    ) {
                      formDataWithDefaults[key] = schemaProp.default
                    }
                  }
                }

                // Handlers for RJSF Form
                const handleFormChange = (e: IChangeEvent) => {
                  setEditingNodeData((prev) =>
                    prev ? { ...prev, properties: e.formData } : prev
                  )
                }

                const handleFormSubmit = ({ formData }: IChangeEvent) => {
                  if (!selectedNode) return

                  // Apply changes to the actual node
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === selectedNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              label: editingNodeData.label,
                              properties: formData
                            }
                          }
                        : node
                    )
                  )
                  setSelectedNode(null)
                }

                const handleFormError = (
                  errors: Array<{ message?: string; stack?: string }>
                ) => {
                  console.error("Form validation errors:", errors)
                  // Show toast with validation errors
                  const errorMessages = errors
                    .map((err) => err.message || err.stack || "Unknown error")
                    .join(", ")
                  toast.error(`Validation failed: ${errorMessages}`)
                }

                return (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Node Properties</h4>
                    <Form
                      ref={formRef}
                      schema={jsonSchema}
                      uiSchema={uiSchema}
                      formData={formDataWithDefaults}
                      validator={validator}
                      widgets={customWidgets}
                      fields={customFields}
                      templates={{ FieldTemplate }}
                      onChange={handleFormChange}
                      onSubmit={handleFormSubmit}
                      onError={handleFormError}
                      liveValidate={false}
                      showErrorList={false}
                    >
                      {/* Remove default submit button */}
                      <div />
                    </Form>
                  </div>
                )
              })()}

              {/* Botões de ação (mantidos) */}
              <div className="border-t pt-4 space-y-3">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => formRef.current?.submit()}
                >
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedNode(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    if (!selectedNode) return

                    setNodes((nds) =>
                      nds.filter((node) => node.id !== selectedNode.id)
                    )
                    setSelectedNode(null)
                  }}
                >
                  Delete Node
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Naming dialog for new workflows */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Workflow</DialogTitle>
            <DialogDescription>
              Please provide a name for your workflow before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={tempWorkflowName}
                onChange={(e) => setTempWorkflowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleNameDialogConfirm()
                  }
                }}
                placeholder="Enter workflow name"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNameDialogConfirm}
              disabled={!tempWorkflowName.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NodeProvider>
  )
}

export default function FlowBuilder() {
  return (
    <SidebarProvider>
      <div className="w-screen h-screen flex">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-sidebar">
          <ReactFlowProvider>
            <FlowContent />
          </ReactFlowProvider>
        </div>
      </div>
    </SidebarProvider>
  )
}