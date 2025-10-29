import type { CodeBlockWriter } from "ts-morph"
import { Project } from "ts-morph"
import type { AnalyzedGraph, AnalyzedNode } from "./graph-analyzer"

export interface GeneratedCode {
  code: string
  imports: string[]
  exports: string[]
}

export class CodeGenerator {
  private analyzed: AnalyzedGraph
  private project!: Project
  private sourceFile!: ReturnType<Project["createSourceFile"]>
  private addedNodeImports: Set<string> = new Set()
  private typeToAlias: Map<string, string> = new Map()

  constructor(analyzedGraph: AnalyzedGraph) {
    this.analyzed = analyzedGraph
  }

  // Map node names to package identifiers
  private getPackageName(nodeName: string): string {
    // Map semantic node names to their package names
    // Format: nodes-<package-name>/runtime
    const packageMap: Record<string, string> = {
      "http-request": "http-request",
      code: "code",
      "send-email": "resend/send-email"
      // Add more mappings as needed
    }

    return packageMap[nodeName] || nodeName
  }

  generate(): GeneratedCode {
    // Initialize ts-morph project and source file
    this.project = new Project()
    this.sourceFile = this.project.createSourceFile("workflow.ts", "", {
      overwrite: true
    })

    // Reset tracking state for new generation
    this.addedNodeImports.clear()
    this.typeToAlias.clear()

    // Add runtime imports
    this.addRuntimeImports()

    // Generate main handler
    this.generateHandler()

    return {
      code: this.sourceFile.getFullText(),
      imports: [],
      exports: ["default"]
    }
  }

  private addRuntimeImports(): void {
    this.sourceFile.addImportDeclaration({
      moduleSpecifier: "workflow-runtime",
      namedImports: [
        "createContext",
        "evaluateExpression",
        "handleError",
        "createJsonResponse"
      ]
    })

    this.sourceFile.addImportDeclaration({
      moduleSpecifier: "workflow-runtime/logger",
      namedImports: ["Logger"]
    })
  }

  private generateHandler(): void {
    this.sourceFile.addExportAssignment({
      isExportEquals: false,
      expression: (writer) => {
        writer.block(() => {
          writer.writeLine(
            "async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response>"
          )
          writer.block(() => {
            // Initialize context and logger with proper IDs
            writer.writeLine(
              "const workflowId = env.WORKFLOW_ID || crypto.randomUUID()"
            )
            writer.writeLine("const executionId = crypto.randomUUID()")
            writer.writeLine(
              "const logger = new Logger(workflowId, executionId)"
            )
            writer.writeLine(
              "const context = createContext(workflowId, executionId)"
            )
            writer.blankLine()

            writer.write("try").block(() => {
              // Parse input
              writer.writeLine("const input = await request.json()")
              writer.writeLine("context.variables.set('input', input)")
              writer.blankLine()

              // Get secrets from env
              writer.writeLine("// Load secrets from environment")
              writer.write("const secrets =").block()
              writer.blankLine()

              // Generate execution flow
              this.generateExecutionFlow(writer)

              // Return result
              writer.blankLine()
              writer.writeLine("const result = context.variables.get('result')")
              writer.writeLine("const logs = logger.getLogs()")
              writer.writeLine(
                "return createJsonResponse({ success: true, result, logs }, 200)"
              )
            })

            writer.write("catch (error)").block(() => {
              writer.writeLine(
                "logger.error('Workflow execution failed', error)"
              )
              writer.writeLine(
                "const errorResponse = handleError(error instanceof Error ? error : new Error(String(error)))"
              )
              writer.writeLine("const logs = logger.getLogs()")
              writer.writeLine(
                "return createJsonResponse({ success: false, error: errorResponse, logs }, 500)"
              )
            })
          })
        })
      }
    })
  }

  private generateExecutionFlow(writer: CodeBlockWriter): void {
    const entryNode = this.analyzed.nodes.find(
      (n) => n.id === this.analyzed.entryPoint
    )
    if (!entryNode) {
      throw new Error("Entry point node not found")
    }

    writer.writeLine("// Workflow execution flow")
    this.generateNodeExecution(entryNode.id, new Set(), writer)
  }

  private generateNodeExecution(
    nodeId: string,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    if (visited.has(nodeId)) {
      return // Avoid infinite loops
    }
    visited.add(nodeId)

    const node = this.analyzed.nodes.find((n) => n.id === nodeId)
    if (!node) {
      return
    }

    writer.blankLine()
    writer.writeLine(`// Execute node: ${nodeId}`)
    writer.writeLine(`logger.info('Executing node ${nodeId}')`)

    if (node.isStructural) {
      this.generateStructuralNode(node, visited, writer)
    } else {
      this.generateExecutableNode(node, visited, writer)
    }
  }

  private generateStructuralNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    // Use semantic node type from nodeTypeData.name
    const kind = node.type // This is now nodeTypeData.name from Comment 2 fix

    switch (kind) {
      case "if":
        this.generateIfNode(node, visited, writer)
        break
      case "switch":
        this.generateSwitchNode(node, visited, writer)
        break
      case "for":
        this.generateForNode(node, visited, writer)
        break
      case "merge":
        this.generateMergeNode(node, visited, writer)
        break
      case "trigger-manual":
        this.generateTriggerNode(node, visited, writer)
        break
      default: {
        writer.writeLine(`// Unsupported structural node type: ${kind}`)
        // Continue to next node to avoid halting flow (Comment 10)
        const nextEdge = this.analyzed.edges.find((e) => e.source === node.id)
        if (nextEdge) {
          this.generateNodeExecution(nextEdge.target, visited, writer)
        }
      }
    }
  }

  // Comment 4: Add trigger node handling
  private generateTriggerNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    writer.writeLine(`// Trigger node: ${node.id}`)
    writer.writeLine(`// Input already set in context`)

    // Continue to successor node
    const nextEdge = this.analyzed.edges.find((e) => e.source === node.id)
    if (nextEdge) {
      this.generateNodeExecution(nextEdge.target, visited, writer)
    }
  }

  private generateIfNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    const props = (node.data.properties || {}) as Record<string, unknown>
    const condition = props.condition || "false"

    writer.writeLine(
      `const condition_${this.sanitizeId(node.id)} = evaluateExpression(\`${condition}\`, context)`
    )
    writer.write(`if (condition_${this.sanitizeId(node.id)})`).block(() => {
      // Find true branch
      const trueBranch = this.analyzed.edges.find(
        (e) => e.source === node.id && e.sourceHandle === "true"
      )
      if (trueBranch) {
        this.generateNodeExecution(trueBranch.target, visited, writer)
      }
    })

    writer.write("else").block(() => {
      // Find false branch
      const falseBranch = this.analyzed.edges.find(
        (e) => e.source === node.id && e.sourceHandle === "false"
      )
      if (falseBranch) {
        this.generateNodeExecution(falseBranch.target, visited, writer)
      }
    })
  }

  private generateSwitchNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    const props = (node.data.properties || {}) as Record<string, unknown>
    const expression = props.expression || "''"
    const cases = (props.cases || []) as Array<{ value: string }>

    writer.writeLine(
      `const switchValue_${this.sanitizeId(node.id)} = evaluateExpression(\`${expression}\`, context)`
    )
    writer.write(`switch (switchValue_${this.sanitizeId(node.id)})`).block(() => {
      for (const caseItem of cases) {
        writer.writeLine(`case ${JSON.stringify(caseItem.value)}:`)
        writer.indent(() => {
          const caseBranch = this.analyzed.edges.find(
            (e) => e.source === node.id && e.sourceHandle === caseItem.value
          )
          if (caseBranch) {
            this.generateNodeExecution(caseBranch.target, visited, writer)
          }

          writer.writeLine("break")
        })
      }

      // Default case
      writer.writeLine("default:")
      writer.indent(() => {
        const defaultBranch = this.analyzed.edges.find(
          (e) => e.source === node.id && e.sourceHandle === "default"
        )
        if (defaultBranch) {
          this.generateNodeExecution(defaultBranch.target, visited, writer)
        }
      })
    })
  }

  private generateForNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    const props = (node.data.properties || {}) as Record<string, unknown>
    const iterator = props.iterator || "[]"
    const itemVariable = props.itemVariable || "item"
    const batchSize = props.batchSize || 1

    writer.writeLine(
      `const items_${this.sanitizeId(node.id)} = evaluateExpression(\`${iterator}\`, context)`
    )
    writer
      .write(
        `for (let i = 0; i < items_${this.sanitizeId(node.id)}.length; i += ${batchSize})`
      )
      .block(() => {
        writer.writeLine(
          `const batch = items_${this.sanitizeId(node.id)}.slice(i, i + ${batchSize})`
        )
        writer.writeLine(
          `context.variables.set('${itemVariable}', batch.length === 1 ? batch[0] : batch)`
        )
        writer.writeLine(`context.variables.set('${itemVariable}Index', i)`)

        // Find body branch
        const bodyBranch = this.analyzed.edges.find(
          (e) => e.source === node.id && e.sourceHandle === "body"
        )
        if (bodyBranch) {
          this.generateNodeExecution(bodyBranch.target, new Set(visited), writer)
        }
      })

    // Find done branch
    const doneBranch = this.analyzed.edges.find(
      (e) => e.source === node.id && e.sourceHandle === "done"
    )
    if (doneBranch) {
      this.generateNodeExecution(doneBranch.target, visited, writer)
    }
  }

  private generateMergeNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    // Merge nodes are implicit in the execution flow
    // Just continue to the next node
    const nextEdge = this.analyzed.edges.find((e) => e.source === node.id)
    if (nextEdge) {
      this.generateNodeExecution(nextEdge.target, visited, writer)
    }
  }

  private generateExecutableNode(
    node: AnalyzedNode,
    visited: Set<string>,
    writer: CodeBlockWriter
  ): void {
    const nodeData: Record<string, unknown> = node.data
    const properties = nodeData.properties || {}

    // Use semantic node type and map to package name
    const nodeName = node.type // This is now nodeTypeData.name
    const packageName = this.getPackageName(nodeName)
    
    // Get or create stable alias for this node type
    let runtimeImportName = this.typeToAlias.get(nodeName)
    if (!runtimeImportName) {
      // Compute base alias
      const baseAlias = this.sanitizeId(nodeName) + "Runtime"
      
      // Check for collisions and append suffix if needed
      let candidate = baseAlias
      let suffix = 1
      const existingAliases = new Set(this.typeToAlias.values())
      while (existingAliases.has(candidate)) {
        candidate = `${baseAlias}${suffix}`
        suffix++
      }
      
      runtimeImportName = candidate
      this.typeToAlias.set(nodeName, runtimeImportName)
    }

    // Add node-specific import with de-duplication
    const moduleSpecifier = `nodes-${packageName}/runtime`
    if (!this.addedNodeImports.has(moduleSpecifier)) {
      this.sourceFile.addImportDeclaration({
        moduleSpecifier,
        defaultImport: runtimeImportName
      })
      this.addedNodeImports.add(moduleSpecifier)
    }

    // Prepare props
    writer.writeLine(
      `const props_${this.sanitizeId(node.id)} = ${JSON.stringify(properties, null, 2)}`
    )

    // Evaluate expressions in props (simplified - real implementation would be more sophisticated)
    writer.writeLine(`// Evaluate expressions in props`)
    writer
      .write(`for (const key in props_${this.sanitizeId(node.id)})`)
      .block(() => {
        writer.writeLine(`const value = props_${this.sanitizeId(node.id)}[key]`)
        writer
          .write(`if (typeof value === 'string' && value.includes('\${''))`)
          .block(() => {
            writer.writeLine(
              `props_${this.sanitizeId(node.id)}[key] = evaluateExpression(value, context)`
            )
          })
      })

    // Execute node
    writer.writeLine(
      `const result_${this.sanitizeId(node.id)} = await ${runtimeImportName}(props_${this.sanitizeId(node.id)}, secrets)`
    )
    writer.writeLine(
      `context.stepResults.set('${node.id}', result_${this.sanitizeId(node.id)})`
    )
    writer.writeLine(
      `logger.info('Node ${node.id} completed', result_${this.sanitizeId(node.id)})`
    )

    // Continue to next node
    const nextEdge = this.analyzed.edges.find((e) => e.source === node.id)
    if (nextEdge) {
      this.generateNodeExecution(nextEdge.target, visited, writer)
    }
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, "_")
  }
}
