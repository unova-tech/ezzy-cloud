"use client"
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
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { DevTools } from "@/components/devtools"
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
import { Textarea } from "@/components/ui/textarea"
import { coreNodes as coreNodesLib } from "@/lib/core-nodes"
import { getIconComponent, type IconDefinition } from "@/lib/icon-registry"
import BaseEdge from "./base-edge"
import BaseNode from "./base-node"
import { NodeProvider } from "./node-context"
import AppSidebar from "./sidebar"
import { TopBar } from "./TopBar"

import "@xyflow/react/dist/style.css"
import "./style.css"

// Combine core nodes and default lib nodes
const { nodes: coreNodes } = coreNodesLib
const { nodes: defaultNodes } = defaultNodesLib
const allNodes = [...coreNodes, ...defaultNodes]

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

// Tipo para JSON Schema
type JSONSchema = {
  type?: string
  title?: string
  description?: string
  default?: unknown
  properties?: Record<string, JSONSchema>
}

// Tipo para dados do node
type NodeData = {
  nodeTypeData?: INode
  label?: string
  properties?: Record<string, unknown>
}

// Componente helper para renderizar campos dinamicamente
function DynamicFormField({
  name,
  schema,
  value,
  onChange,
  onSubmit
}: {
  name: string
  schema: z.ZodTypeAny
  value: unknown
  onChange: (value: unknown) => void
  onSubmit?: () => void
}) {
  const jsonSchema = z.toJSONSchema(schema) as JSONSchema

  // Extrai metadados personalizados do schema
  const metadata = schema.meta?.() as { field?: string } | undefined
  const fieldType = metadata?.field || "text"

  // Verifica se o campo é obrigatório
  const isOptional = schema.safeParse(undefined).success
  const isRequired = !isOptional

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {jsonSchema.title || name}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
        {jsonSchema.description && (
          <span className="text-xs text-muted-foreground ml-2">
            {jsonSchema.description}
          </span>
        )}
      </Label>
      {fieldType === "textarea" ? (
        <Textarea
          id={name}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl+Enter ou Cmd+Enter submete o formulário
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onSubmit) {
              e.preventDefault()
              onSubmit()
            }
          }}
          placeholder={(jsonSchema.default as string) || ""}
          rows={5}
          required={isRequired}
        />
      ) : (
        <Input
          id={name}
          type={
            jsonSchema.type === "number"
              ? "number"
              : jsonSchema.type === "boolean"
                ? "checkbox"
                : "text"
          }
          value={(value as string) || ""}
          onChange={(e) => {
            const val =
              jsonSchema.type === "number"
                ? Number(e.target.value)
                : jsonSchema.type === "boolean"
                  ? e.target.checked
                  : e.target.value
            onChange(val)
          }}
          placeholder={(jsonSchema.default as string) || ""}
          required={isRequired}
        />
      )}
    </div>
  )
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

// Utility function to sanitize nodes by removing UI-only fields
function sanitizeNodes(nodes: Node[]): Node[] {
  // IconDefinitions são serializáveis (objetos com library e name)
  // Não precisamos fazer conversão especial
  return nodes
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
  const [isSaving, setIsSaving] = useState(false)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
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
    const loadWorkflow = async () => {
      if (workflowId !== "new") {
        try {
          const response = await fetch(`/api/workflows/${workflowId}`)
          const result = await response.json()

          if (result.success && result.workflow) {
            const sanitizedNodes = sanitizeNodes(result.workflow.nodes || [])
            const sanitizedEdges = sanitizeEdges(result.workflow.edges || [])
            const loadedName = result.workflow.name || "Untitled Workflow"

            setWorkflowName(loadedName)
            setNodes(sanitizedNodes)
            setEdges(sanitizedEdges)
            setLastSavedState({
              nodes: sanitizedNodes,
              edges: sanitizedEdges,
              name: loadedName
            })
            setLoadError(false)
          } else {
            toast.error("Error", {
              description: "Failed to load workflow"
            })
            setLoadError(true)
          }
        } catch (error) {
          toast.error("Error", {
            description:
              error instanceof Error ? error.message : "Failed to load workflow"
          })
          setLoadError(true)
        } finally {
          setIsLoading(false)
        }
      } else {
        setLastSavedState({
          nodes: [],
          edges: [],
          name: "Untitled Workflow"
        })
        setLoadError(false)
        setIsLoading(false)
      }
    }

    loadWorkflow()
  }, [workflowId, setNodes, setEdges])

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
    if (selectedNode) {
      setEditingNodeData({
        label:
          selectedNode.data.label ||
          selectedNode.data.nodeTypeData?.title ||
          "",
        properties: selectedNode.data.properties || {}
      })
    } else {
      setEditingNodeData(null)
    }
  }, [selectedNode])

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: "base" }, eds)),
    [setEdges]
  )

  // Shared save logic to avoid duplication
  const saveWorkflow = async (name: string) => {
    setIsSaving(true)
    try {
      const isNewWorkflow = workflowId === "new"
      const url = isNewWorkflow
        ? "/api/workflows"
        : `/api/workflows/${workflowId}`
      const method = isNewWorkflow ? "POST" : "PUT"

      // Sanitize data before saving
      const sanitizedNodes = sanitizeNodes(nodes)
      const sanitizedEdges = sanitizeEdges(edges)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nodes: sanitizedNodes,
          edges: sanitizedEdges
        })
      })

      const result = await response.json()

      if (result.success) {
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

        // If this was a new workflow, navigate to the workflow's URL
        if (isNewWorkflow && result.workflow?.id) {
          router.push(`/workflows/${result.workflow.id}`)
        }
      } else {
        throw new Error(result.error || "Failed to save workflow")
      }
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to save workflow"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveWorkflow = async () => {
    // Guard against saving after load failure
    if (workflowId !== "new" && (loadError || lastSavedState === null)) {
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
    setIsCompiling(true)
    try {
      // Compila localmente sem precisar salvar
      // Para isso, precisamos de uma rota que aceite nodes e edges diretamente
      const response = await fetch("/api/workflows/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes,
          edges
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Workflow compiled", {
          description: "Your workflow has been compiled successfully."
        })
        console.log("Compiled code:", result.code)
      } else {
        toast.error("Compilation failed", {
          description: result.error || "Failed to compile workflow"
        })
      }
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to compile workflow"
      })
    } finally {
      setIsCompiling(false)
    }
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

      const newNode: Node<NodeData> = {
        id: `node-${Date.now()}`,
        type: "base",
        position: nodePosition,
        data: {
          nodeTypeData: nodeDefinition
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

  if (isLoading) {
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
        isSaving={isSaving}
        isCompiling={isCompiling}
        loadError={loadError}
      />

      {/* React Flow Canvas */}
      <div className="flex-1 min-h-0 border-2 border-border rounded-tl-4xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          onNodeClick={(_, node) => setSelectedNode(node as Node<NodeData>)}
          connectionLineType={ConnectionLineType.SmoothStep}
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
          <div className="mt-6 space-y-6 px-4 max-h-[calc(100vh-200px)] overflow-y-auto">
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
        <SheetContent className="w-[400px] sm:w-[540px] px-4">
          <SheetHeader>
            <SheetTitle>Edit Node Properties</SheetTitle>
            <SheetDescription>
              {selectedNode?.data?.nodeTypeData?.title || "Configure your node"}
            </SheetDescription>
          </SheetHeader>
          {selectedNode?.data?.nodeTypeData && editingNodeData && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                // Aplica as mudanças ao node real
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === selectedNode.id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            label: editingNodeData.label,
                            properties: editingNodeData.properties
                          }
                        }
                      : node
                  )
                )
                setSelectedNode(null)
              }}
              className="mt-6 space-y-4 px-1"
            >
              {(() => {
                // Função para submeter o formulário
                const handleSubmit = () => {
                  // Aplica as mudanças ao node real
                  setNodes((nds) =>
                    nds.map((node) =>
                      node.id === selectedNode.id
                        ? {
                            ...node,
                            data: {
                              ...node.data,
                              label: editingNodeData.label,
                              properties: editingNodeData.properties
                            }
                          }
                        : node
                    )
                  )
                  setSelectedNode(null)
                }

                return (
                  <>
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

                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3">Node Properties</h4>
                      {(() => {
                        const nodeType = selectedNode.data.nodeTypeData as INode
                        const propertiesSchema = nodeType.properties

                        const jsonSchema = z.toJSONSchema(
                          propertiesSchema
                        ) as JSONSchema

                        if (
                          jsonSchema.type === "object" &&
                          jsonSchema.properties
                        ) {
                          return (
                            <div className="space-y-3">
                              {Object.entries(jsonSchema.properties).map(
                                ([key]) => {
                                  const fieldSchema =
                                    (
                                      propertiesSchema as z.ZodObject<z.ZodRawShape>
                                    ).shape?.[key] || z.string()

                                  return (
                                    <DynamicFormField
                                      key={key}
                                      name={key}
                                      schema={fieldSchema as z.ZodTypeAny}
                                      value={editingNodeData.properties[key]}
                                      onChange={(value) => {
                                        setEditingNodeData({
                                          ...editingNodeData,
                                          properties: {
                                            ...editingNodeData.properties,
                                            [key]: value
                                          }
                                        })
                                      }}
                                      onSubmit={handleSubmit}
                                    />
                                  )
                                }
                              )}
                            </div>
                          )
                        }

                        return (
                          <p className="text-sm text-muted-foreground">
                            No properties configured
                          </p>
                        )
                      })()}
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <Button type="submit" className="w-full">
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
                          setNodes((nds) =>
                            nds.filter((node) => node.id !== selectedNode.id)
                          )
                          setSelectedNode(null)
                        }}
                      >
                        Delete Node
                      </Button>
                    </div>
                  </>
                )
              })()}
            </form>
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
              disabled={!tempWorkflowName.trim() || isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
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
