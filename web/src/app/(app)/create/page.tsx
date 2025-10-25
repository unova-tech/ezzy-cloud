"use client"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  type DefaultEdgeOptions,
  type Edge,
  type FitViewOptions,
  MiniMap,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
  Panel,
  ReactFlow
} from "@xyflow/react"
import { useCallback, useState } from "react"
import "@xyflow/react/dist/style.css"

const initialNodes: Node[] = [
  { id: "1", data: { label: "Node 1" }, position: { x: 5, y: 5 } },
  { id: "2", data: { label: "Node 2" }, position: { x: 5, y: 100 } }
]

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2" }]

const fitViewOptions: FitViewOptions = {
  padding: 0.2
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true
}

const onNodeDrag: OnNodeDrag = (_, node) => {
  console.log("drag event", node.data)
}

export default function FlowBuilder() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialEdges)

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  return (
    <div className="w-screen h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDrag={onNodeDrag}
        fitView
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <MiniMap />
        <Controls />
        <Panel position="center-left">center-left</Panel>
      </ReactFlow>
    </div>
  )
}
