import type { Edge, Node } from "@xyflow/react"

export interface AnalyzedNode {
  id: string
  type: string // semantic node type from nodeTypeData.name
  componentType: string // ReactFlow component type (e.g., 'base')
  nodeKind: string // nodeTypeData.nodeType (e.g., 'trigger', 'action', 'structural')
  data: Record<string, unknown>
  isStructural: boolean
  category: "core" | "default-lib" | "external-lib"
  inputs: string[]
  outputs: string[]
}

export interface AnalyzedGraph {
  nodes: AnalyzedNode[]
  edges: Edge[]
  entryPoint: string
  hasLoops: boolean
  maxDepth: number
}

export class GraphAnalyzer {
  private nodes: Map<string, Node>
  private edges: Edge[]
  private analyzed: Map<string, AnalyzedNode>

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]))
    this.edges = edges
    this.analyzed = new Map()
  }

  analyze(): AnalyzedGraph {
    // Find entry point (trigger node)
    const entryPoint = this.findEntryPoint()
    if (!entryPoint) {
      throw new Error("No trigger node found in workflow")
    }

    // Detect cycles
    const hasLoops = this.detectCycles()

    // Calculate max depth
    const maxDepth = this.calculateMaxDepth(entryPoint)

    // Analyze each node
    for (const node of this.nodes.values()) {
      this.analyzeNode(node)
    }

    return {
      nodes: Array.from(this.analyzed.values()),
      edges: this.edges,
      entryPoint,
      hasLoops,
      maxDepth
    }
  }

  private findEntryPoint(): string | null {
    for (const node of this.nodes.values()) {
      if (node.data?.nodeTypeData?.nodeType === "trigger") {
        return node.id
      }
    }
    return null
  }

  private detectCycles(): boolean {
    const visited = new Set<string>()
    const recStack = new Set<string>()

    const hasCycle = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId)
        recStack.add(nodeId)

        const neighbors = this.getSuccessors(nodeId)
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) {
            return true
          }
          if (recStack.has(neighbor)) {
            return true
          }
        }
      }
      recStack.delete(nodeId)
      return false
    }

    for (const nodeId of this.nodes.keys()) {
      if (hasCycle(nodeId)) {
        return true
      }
    }
    return false
  }

  private calculateMaxDepth(startId: string): number {
    const depths = new Map<string, number>()
    depths.set(startId, 0)

    const queue: string[] = [startId]
    let maxDepth = 0

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentDepth = depths.get(current)!

      maxDepth = Math.max(maxDepth, currentDepth)

      const successors = this.getSuccessors(current)
      for (const successor of successors) {
        if (
          !depths.has(successor) ||
          depths.get(successor)! < currentDepth + 1
        ) {
          depths.set(successor, currentDepth + 1)
          queue.push(successor)
        }
      }
    }

    return maxDepth
  }

  private analyzeNode(node: Node): AnalyzedNode {
    if (this.analyzed.has(node.id)) {
      return this.analyzed.get(node.id)!
    }

    const nodeTypeData = node.data?.nodeTypeData || {}
    const isStructural = nodeTypeData.isStructural === true
    const category = nodeTypeData.category || "external-lib"

    const inputs = this.getPredecessors(node.id)
    const outputs = this.getSuccessors(node.id)

    const analyzed: AnalyzedNode = {
      id: node.id,
      type: nodeTypeData.name || "unknown", // semantic type from nodeTypeData
      componentType: node.type || "base", // ReactFlow component type
      nodeKind: nodeTypeData.nodeType || "unknown", // trigger/action/structural
      data: node.data || {},
      isStructural,
      category,
      inputs,
      outputs
    }

    this.analyzed.set(node.id, analyzed)
    return analyzed
  }

  private getSuccessors(nodeId: string): string[] {
    return this.edges.filter((e) => e.source === nodeId).map((e) => e.target)
  }

  private getPredecessors(nodeId: string): string[] {
    return this.edges.filter((e) => e.target === nodeId).map((e) => e.source)
  }

  // Get execution order using topological sort
  getExecutionOrder(): string[] {
    const inDegree = new Map<string, number>()
    const order: string[] = []

    // Initialize in-degrees
    for (const nodeId of this.nodes.keys()) {
      inDegree.set(nodeId, 0)
    }

    // Calculate in-degrees
    for (const edge of this.edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }

    // Find nodes with no incoming edges
    const queue: string[] = []
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId)
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const current = queue.shift()!
      order.push(current)

      const successors = this.getSuccessors(current)
      for (const successor of successors) {
        const newDegree = (inDegree.get(successor) || 0) - 1
        inDegree.set(successor, newDegree)
        if (newDegree === 0) {
          queue.push(successor)
        }
      }
    }

    if (order.length !== this.nodes.size) {
      throw new Error("Graph contains cycles, cannot determine execution order")
    }

    return order
  }

  // Get control flow structure
  getControlFlowStructure(): Record<string, unknown> {
    const structure: Record<string, unknown> = {}

    for (const node of this.analyzed.values()) {
      if (node.isStructural) {
        const nodeData = this.nodes.get(node.id)?.data || {}
        const customOutputs = nodeData.nodeTypeData?.customOutputs || []

        structure[node.id] = {
          type: node.type,
          outputs: customOutputs.map((o: any) => ({
            id: o.id,
            label: o.label,
            targets: this.edges
              .filter((e) => e.source === node.id && e.sourceHandle === o.id)
              .map((e) => e.target)
          }))
        }
      }
    }

    return structure
  }
}
