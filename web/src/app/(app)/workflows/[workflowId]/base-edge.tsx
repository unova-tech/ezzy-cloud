import type { Edge, EdgeProps } from "@xyflow/react"
import { useReactFlow } from "@xyflow/react"
import { Plus, Trash2 } from "lucide-react"
import { memo, useCallback } from "react"
import { ButtonEdge } from "@/components/button-edge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CustomEdge = memo((props: EdgeProps<Edge<{ isHovered: boolean }>>) => {
  const { id, source, target, data } = props
  const isHovered = data?.isHovered
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow()

  const onAddNode = useCallback(() => {
    const newNodeId = `node-${Date.now()}`

    const newNode = {
      id: newNodeId,
      type: "base",
      position: { x: 0, y: 0 },
      data: { label: "New Node" }
    }

    const currentEdges = getEdges()
    const updatedEdges = [
      ...currentEdges.filter((edge) => edge.id !== id),
      {
        id: `${source}-${newNodeId}`,
        source: source,
        sourceHandle: "source-1",
        target: newNodeId,
        targetHandle: "target-1",
        type: "base"
      },
      {
        id: `${newNodeId}-${target}`,
        source: newNodeId,
        sourceHandle: "source-1",
        target: target,
        targetHandle: "target-1",
        type: "base"
      }
    ]

    const currentNodes = getNodes()
    const updatedNodes = [...currentNodes, newNode]

    setNodes(updatedNodes)
    setEdges(updatedEdges)
  }, [id, source, target, getNodes, getEdges, setNodes, setEdges])

  const onRemoveEdge = useCallback(() => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }, [id, setEdges])

  return (
    <ButtonEdge
      {...props}
      style={{ filter: isHovered ? "brightness(2)" : "none" }}
    >
      <div className={cn("flex gap-1", { hidden: !isHovered })}>
        <Button
          onClick={onAddNode}
          size="icon"
          variant="secondary"
          className="rounded-full h-5 w-5"
        >
          <Plus />
        </Button>
        <Button
          onClick={onRemoveEdge}
          size="icon"
          variant="destructive"
          className="rounded-full h-5 w-5"
        >
          <Trash2 />
        </Button>
      </div>
    </ButtonEdge>
  )
})

export default CustomEdge
