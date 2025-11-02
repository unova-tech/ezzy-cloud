import type { Edge, Node } from "@xyflow/react"
import { CodeGenerator } from "./code-generator"
import { GraphAnalyzer } from "./graph-analyzer"
import { WorkflowBundler } from "./workflow-bundler"

export interface CompilationResult {
  success: boolean
  code?: string
  bundle?: string // JavaScript bundle para WinterJS
  bundleSize?: number // Tamanho do bundle em bytes
  error?: string
  warnings?: string[]
  metadata?: {
    nodeCount: number
    edgeCount: number
    hasLoops: boolean
    maxDepth: number
    bundleTime?: number // Tempo de bundling em ms
  }
  environmentVariables?: {
    workflowId: boolean
    secrets: string[]
  }
}

export interface BuildMetadata {
  workflowId: string
  workflowName: string
  buildTimestamp: string  // ISO 8601 format
  bundleSize: number
  nodeCount: number
  edgeCount: number
  hasLoops: boolean
  maxDepth: number
  bundleTime?: number
  environmentVariables: {
    workflowId: boolean
    secrets: string[]
  }
  warnings?: string[]
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

  // Compile and bundle workflow for WinterJS deployment
  async compileAndBundle(
    nodes: Node[],
    edges: Edge[],
    options?: { minify?: boolean; sourcemap?: boolean }
  ): Promise<CompilationResult> {
    // First, compile the workflow
    const result = await this.compile(nodes, edges)

    // If compilation failed, return immediately
    if (!result.success || !result.code) {
      return result
    }

    try {
      // Extract used nodes (filter out triggers and structural nodes)
      const coreNodes = ["if", "switch", "for", "merge"]
      const usedNodes = [
        ...new Set(
          nodes
            .map(n => {
              const dataType = (n.data as any)?.type as string | undefined
              return dataType
            })
            .filter((type): type is string => {
              if (!type) return false
              if (type.startsWith('trigger-')) return false
              if (coreNodes.includes(type)) return false
              return true
            })
        )
      ]

      // Initialize bundler
      const bundler = new WorkflowBundler()

      // Measure bundling time
      const startTime = Date.now()

      // Execute bundling
      const bundleResult = await bundler.bundle({
        workflowId: crypto.randomUUID(),
        generatedCode: result.code,
        usedNodes,
        minify: options?.minify ?? true,
        sourcemap: options?.sourcemap ?? false
      })

      const bundleTime = Date.now() - startTime

      // Process bundle result
      if (!bundleResult.success) {
        // Bundling failed, add warning but still return compiled code
        const warnings = [...(result.warnings || []), `Bundling failed: ${bundleResult.error}`]
        return {
          ...result,
          warnings
        }
      }

      // Success - merge bundle with compilation result
      const allWarnings = [...(result.warnings || []), ...(bundleResult.warnings || [])]

      return {
        ...result,
        bundle: bundleResult.bundleCode,
        bundleSize: bundleResult.bundleSize,
        environmentVariables: bundleResult.environmentVariables,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
        metadata: {
          ...result.metadata!,
          bundleTime
        }
      }
    } catch (error) {
      // Bundling error, add warning but still return compiled code
      const warnings = [
        ...(result.warnings || []),
        `Bundling error: ${error instanceof Error ? error.message : String(error)}`
      ]
      return {
        ...result,
        warnings
      }
    }
  }

  /**
   * Extract build metadata from compilation result
   * Centralizes metadata extraction for deployment artifacts
   */
  getBuildMetadata(
    result: CompilationResult,
    workflowName: string,
    workflowId: string
  ): BuildMetadata {
    if (!result.success || !result.metadata) {
      throw new Error('Cannot extract metadata from failed compilation')
    }

    return {
      workflowId,
      workflowName,
      buildTimestamp: new Date().toISOString(),
      bundleSize: result.bundleSize || 0,
      nodeCount: result.metadata.nodeCount,
      edgeCount: result.metadata.edgeCount,
      hasLoops: result.metadata.hasLoops,
      maxDepth: result.metadata.maxDepth,
      bundleTime: result.metadata.bundleTime,
      environmentVariables: result.environmentVariables || {
        workflowId: false,
        secrets: []
      },
      warnings: result.warnings
    }
  }
}