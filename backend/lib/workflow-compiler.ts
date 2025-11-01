import type { Edge, Node } from "@xyflow/react"
import { CodeGenerator } from "./code-generator"
import { GraphAnalyzer } from "./graph-analyzer"

export interface CompilationResult {
  success: boolean
  code?: string
  error?: string
  warnings?: string[]
  metadata?: {
    nodeCount: number
    edgeCount: number
    hasLoops: boolean
    maxDepth: number
  }
}

export class WorkflowCompiler {
  async compile(nodes: Node[], edges: Edge[]): Promise<CompilationResult> {
    const warnings: string[] = []

    try {
      // Validate input
      if (nodes.length === 0) {
        return {
          success: false,
          error: "Workflow must contain at least one node"
        }
      }

      // Analyze graph structure
      const analyzer = new GraphAnalyzer(nodes, edges)
      let analyzed: ReturnType<GraphAnalyzer["analyze"]>

      try {
        analyzed = analyzer.analyze()
      } catch (error) {
        return {
          success: false,
          error: `Graph analysis failed: ${error instanceof Error ? error.message : String(error)}`
        }
      }

      // Validate entry point
      if (!analyzed.entryPoint) {
        return {
          success: false,
          error: "Workflow must have a trigger node"
        }
      }

      // Check for disconnected nodes
      const connectedNodes = new Set<string>()
      const visited = new Set<string>()
      const queue = [analyzed.entryPoint]

      while (queue.length > 0) {
        const current = queue.shift()!
        if (visited.has(current)) continue
        visited.add(current)
        connectedNodes.add(current)

        const successors = edges
          .filter((e) => e.source === current)
          .map((e) => e.target)
        queue.push(...successors)
      }

      const disconnectedNodes = nodes.filter((n) => !connectedNodes.has(n.id))
      if (disconnectedNodes.length > 0) {
        warnings.push(
          `Found ${disconnectedNodes.length} disconnected node(s): ${disconnectedNodes.map((n) => n.id).join(", ")}`
        )
      }

      // Check for loops
      if (analyzed.hasLoops) {
        warnings.push(
          "Workflow contains loops - make sure loop conditions are properly defined"
        )
      }

      // Validate node configurations
      for (const node of analyzed.nodes) {
        const nodeData: any = node.data
        const nodeTypeData = nodeData?.nodeTypeData

        if (!nodeTypeData) {
          warnings.push(`Node ${node.id} is missing type definition`)
          continue
        }

        // Validate properties against schema if available
        // Note: Schema validation is skipped when nodes come from API (JSON serialization)
        // as Zod schemas lose their methods. Frontend validation should catch these issues.
        if (
          nodeTypeData.properties &&
          nodeData.properties &&
          typeof nodeTypeData.properties.safeParse === "function"
        ) {
          const validation = nodeTypeData.properties.safeParse(
            nodeData.properties
          )
          if (!validation.success) {
            warnings.push(
              `Node ${node.id} has invalid configuration: ${validation.error.message}`
            )
          }
        }
      }

      // Generate code
      const generator = new CodeGenerator(analyzed)
      let generated: ReturnType<CodeGenerator["generate"]>

      try {
        generated = generator.generate()
      } catch (error) {
        return {
          success: false,
          error: `Code generation failed: ${error instanceof Error ? error.message : String(error)}`
        }
      }

      // Combine imports and code
      const finalCode = [...generated.imports, "", generated.code].join("\n")

      return {
        success: true,
        code: finalCode,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          hasLoops: analyzed.hasLoops,
          maxDepth: analyzed.maxDepth
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Compilation failed: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  // Validate workflow without generating code
  async validate(nodes: Node[], edges: Edge[]): Promise<CompilationResult> {
    const result = await this.compile(nodes, edges)
    return {
      ...result,
      code: undefined // Don't return code for validation-only
    }
  }
}
