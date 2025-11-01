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

  // Helper to check if a node type is a webhook-based trigger
  private isWebhookTrigger(nodeType: string): boolean {
    return nodeType === "trigger-webhook" ||
           nodeType.startsWith("trigger-") && nodeType !== "trigger-manual" && nodeType !== "trigger-cron"
  }

  // Map node names to package identifiers
  private getPackageName(nodeName: string): string {
    const packageMap: Record<string, string> = {
      "http-request": "http-request",
      code: "code",
      "send-email": "resend/send-email"
    }
    return packageMap[nodeName] || nodeName
  }

  generate(): GeneratedCode {
    this.project = new Project()
    this.sourceFile = this.project.createSourceFile("workflow.ts", "", {
      overwrite: true
    })

    this.addedNodeImports.clear()
    this.typeToAlias.clear()

    this.addRuntimeImports()
    this.generateWorkerExport()

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

  private generateWorkerExport(): void {
    this.sourceFile.addExportAssignment({
      isExportEquals: false,
      expression: (writer) => {
        writer.block(() => {
          writer.writeLine("async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response>")
          writer.block(() => {
            // Initialize IDs and context
            writer.writeLine("const workflowId = env.WORKFLOW_ID || crypto.randomUUID()")
            writer.writeLine("const executionId = crypto.randomUUID()")
            writer.writeLine("const logger = new Logger(workflowId, executionId)")
            writer.writeLine("const context = createContext(workflowId, executionId)")
            writer.blankLine()

            writer.write("try").block(() => {
              // Load secrets from env bindings
              writer.writeLine("// Load secrets from environment bindings")
              writer.writeLine("const secrets: Record<string, string> = {}")
              writer.writeLine("// Secret bindings are injected at deployment time")
              writer.writeLine("// Format: env.SECRET_<name> -> secrets[name]")
              writer.blankLine()

              // Publish execution start event
              writer.writeLine("// Publish execution start event")
              writer.write("if (env.EXECUTIONS_QUEUE)").block(() => {
                writer.writeLine("await env.EXECUTIONS_QUEUE.send({")
                writer.writeLine("  executionId,")
                writer.writeLine("  workflowId,")
                writer.writeLine("  status: 'started',")
                writer.writeLine("  timestamp: Date.now()")
                writer.writeLine("})")
              })
              writer.blankLine()

              // Generate request handling
              this.generateRequestHandler(writer)

              // Return result
              writer.blankLine()
              writer.writeLine("const result = context.variables.get('result')")
              writer.writeLine("const logs = logger.getLogs()")
              writer.blankLine()

              // Publish execution success event
              writer.writeLine("// Publish execution success event")
              writer.write("if (env.EXECUTIONS_QUEUE)").block(() => {
                writer.writeLine("await env.EXECUTIONS_QUEUE.send({")
                writer.writeLine("  executionId,")
                writer.writeLine("  workflowId,")
                writer.writeLine("  status: 'completed',")
                writer.writeLine("  output: result,")
                writer.writeLine("  logs,")
                writer.writeLine("  timestamp: Date.now()")
                writer.writeLine("})")
              })
              writer.blankLine()

              writer.writeLine("return createJsonResponse({ success: true, result, logs }, 200)")
            })

            writer.write("catch (error)").block(() => {
              writer.writeLine("logger.error('Workflow execution failed', error)")
              writer.writeLine("const errorResponse = handleError(error instanceof Error ? error : new Error(String(error)))")
              writer.writeLine("const logs = logger.getLogs()")
              writer.blankLine()

              // Publish execution error event
              writer.writeLine("// Publish execution error event")
              writer.write("if (env.EXECUTIONS_QUEUE)").block(() => {
                writer.writeLine("await env.EXECUTIONS_QUEUE.send({")
                writer.writeLine("  executionId,")
                writer.writeLine("  workflowId,")
                writer.writeLine("  status: 'failed',")
                writer.writeLine("  error: errorResponse,")
                writer.writeLine("  logs,")
                writer.writeLine("  timestamp: Date.now()")
                writer.writeLine("})")
              })
              writer.blankLine()

              writer.writeLine("return createJsonResponse({ success: false, error: errorResponse, logs }, 500)")
            })
          })
        })
      }
    })
  }

  private generateRequestHandler(writer: CodeBlockWriter): void {
    const entryNode = this.analyzed.nodes.find(n => n.id === this.analyzed.entryPoint)
    if (!entryNode) {
      throw new Error("Entry point node not found")
    }

    const triggerType = entryNode.type

    if (triggerType === "trigger-manual") {
      this.generateManualTriggerHandler(entryNode, writer)
    } else if (this.isWebhookTrigger(triggerType)) {
      this.generateWebhookHandler(entryNode, writer)
    } else if (triggerType === "trigger-cron") {
      this.generateCronHandler(entryNode, writer)
    } else {
      throw new Error(`Unsupported trigger type: ${triggerType}`)
    }
  }

  private generateManualTriggerHandler(_triggerNode: AnalyzedNode, writer: CodeBlockWriter): void {
    writer.writeLine("// Manual trigger handler")
    writer.writeLine('// Requires authentication (frontend bearer token)')
    writer.blankLine()

    // Auth validation
    writer.writeLine('const authHeader = request.headers.get("Authorization")')
    writer.write('if (!authHeader || !authHeader.startsWith("Bearer "))').block(() => {
      writer.writeLine('return createJsonResponse({ error: "Unauthorized" }, 401)')
    })
    writer.writeLine("// TODO: Verify bearer token with your auth system")
    writer.blankLine()

    // Parse input
    writer.writeLine("// Parse manual trigger input")
    writer.writeLine("let input: any = {}")
    writer.write("try").block(() => {
      writer.writeLine("input = await request.json()")
    })
    writer.write("catch").block(() => {
      writer.writeLine("// No input provided, use empty object")
    })
    writer.blankLine()

    // Set context variables
    writer.writeLine("// Set context variables")
    writer.writeLine("context.variables.set('input', input)")
    writer.writeLine("context.variables.set('triggeredAt', new Date().toISOString())")
    writer.writeLine("// triggeredBy would be extracted from auth token in production")
    writer.blankLine()

    // Continue to workflow execution
    writer.writeLine("// Workflow execution flow")
    this.generateExecutionFlow(writer)
  }

  private generateWebhookHandler(triggerNode: AnalyzedNode, writer: CodeBlockWriter): void {
    const props = (triggerNode.data.properties || {}) as Record<string, unknown>
    const allowedMethods = (props.methods as string[]) || ["POST"]
    const authMode = (props.authMode as string) || "public"
    const verifySignature = (props.verifySignature as boolean) || false
    const secretKeyRef = (props.secretKeyRef as string) || ""

    writer.writeLine("// Webhook handler")
    writer.writeLine("const url = new URL(request.url)")
    writer.blankLine()

    // Method validation
    writer.writeLine("// Validate HTTP method")
    writer.writeLine(`const allowedMethods = ${JSON.stringify(allowedMethods)}`)
    writer.write("if (!allowedMethods.includes(request.method))").block(() => {
      writer.writeLine('return createJsonResponse({ error: "Method not allowed" }, 405)')
    })
    writer.blankLine()

    // Auth mode handling
    if (authMode === "frontend") {
      writer.writeLine("// Frontend authentication mode")
      writer.writeLine('const authHeader = request.headers.get("Authorization")')
      writer.write('if (!authHeader || !authHeader.startsWith("Bearer "))').block(() => {
        writer.writeLine('return createJsonResponse({ error: "Unauthorized" }, 401)')
      })
      writer.writeLine("// TODO: Verify bearer token with your auth system")
      writer.blankLine()
    }

    // Signature verification for public webhooks
    if (verifySignature && authMode === "public" && secretKeyRef) {
      writer.writeLine("// Verify HMAC signature")
      writer.writeLine(`const secretKey = secrets["${secretKeyRef}"]`)
      writer.write("if (!secretKey)").block(() => {
        writer.writeLine('return createJsonResponse({ error: "Secret key not configured" }, 500)')
      })
      writer.writeLine('const signature = request.headers.get("X-Signature")')
      writer.write("if (!signature)").block(() => {
        writer.writeLine('return createJsonResponse({ error: "Missing signature" }, 401)')
      })
      writer.writeLine("const rawBody = await request.clone().arrayBuffer()")
      writer.writeLine("const encoder = new TextEncoder()")
      writer.writeLine("const key = await crypto.subtle.importKey(")
      writer.writeLine('  "raw",')
      writer.writeLine("  encoder.encode(secretKey),")
      writer.writeLine('  { name: "HMAC", hash: "SHA-256" },')
      writer.writeLine("  false,")
      writer.writeLine('  ["sign"]')
      writer.writeLine(")")
      writer.writeLine("const expectedSignature = await crypto.subtle.sign(")
      writer.writeLine('  "HMAC",')
      writer.writeLine("  key,")
      writer.writeLine("  rawBody")
      writer.writeLine(")")
      writer.writeLine("const expectedHex = Array.from(new Uint8Array(expectedSignature))")
      writer.writeLine('  .map(b => b.toString(16).padStart(2, "0"))')
      writer.writeLine('  .join("")')
      writer.write("if (signature !== expectedHex)").block(() => {
        writer.writeLine('return createJsonResponse({ error: "Invalid signature" }, 401)')
      })
      writer.blankLine()
    }

    // Parse request based on content type and method
    writer.writeLine("// Parse request")
    writer.writeLine('const contentType = request.headers.get("Content-Type") || ""')
    writer.writeLine("let input: any")
    writer.writeLine("const headers: Record<string, string> = {}")
    writer.writeLine("const query: Record<string, string> = {}")
    writer.blankLine()

    writer.writeLine("// Extract headers")
    writer.writeLine("request.headers.forEach((value, key) => { headers[key] = value })")
    writer.blankLine()

    writer.writeLine("// Extract query parameters")
    writer.writeLine("url.searchParams.forEach((value, key) => { query[key] = value })")
    writer.blankLine()

    writer.write("if (request.method === 'GET')").block(() => {
      writer.writeLine("input = query")
    })
    writer.write("else if (contentType.includes('application/json'))").block(() => {
      writer.writeLine("input = await request.json()")
    })
    writer.write("else if (contentType.includes('application/x-www-form-urlencoded'))").block(() => {
      writer.writeLine("const formData = await request.formData()")
      writer.writeLine("input = {}")
      writer.writeLine("formData.forEach((value, key) => { input[key] = value })")
    })
    writer.write("else if (contentType.includes('text/'))").block(() => {
      writer.writeLine("input = await request.text()")
    })
    writer.write("else").block(() => {
      writer.writeLine("input = await request.arrayBuffer()")
    })
    writer.blankLine()

    writer.writeLine("// Set context variables")
    writer.writeLine("context.variables.set('input', input)")
    writer.writeLine("context.variables.set('body', input)")
    writer.writeLine("context.variables.set('headers', headers)")
    writer.writeLine("context.variables.set('query', query)")
    writer.writeLine("context.variables.set('method', request.method)")
    writer.blankLine()

    // Continue to workflow execution
    writer.writeLine("// Workflow execution flow")
    this.generateExecutionFlow(writer)
  }

  private generateCronHandler(triggerNode: AnalyzedNode, writer: CodeBlockWriter): void {
    const props = (triggerNode.data.properties || {}) as Record<string, unknown>
    const predicate = (props.predicate as string) || ""

    writer.writeLine("// Cron trigger handler")
    writer.writeLine("const url = new URL(request.url)")
    writer.blankLine()

    // Internal cron endpoint validation
    writer.write('if (url.pathname !== "/__cron" || request.method !== "POST")').block(() => {
      writer.writeLine('return createJsonResponse({ error: "Not found" }, 404)')
    })
    writer.blankLine()

    // Parse input if provided
    writer.writeLine("// Parse cron input")
    writer.writeLine("let input: any = {}")
    writer.write("try").block(() => {
      writer.writeLine("input = await request.json()")
    })
    writer.write("catch").block(() => {
      writer.writeLine("// No input provided, use empty object")
    })
    writer.writeLine("context.variables.set('input', input)")
    writer.blankLine()

    // Evaluate predicate if defined
    if (predicate) {
      writer.writeLine("// Evaluate predicate")
      writer.writeLine(`const shouldRun = evaluateExpression(\`${predicate}\`, context)`)
      writer.write("if (!shouldRun)").block(() => {
        writer.writeLine('logger.info("Cron predicate returned false, skipping execution")')
        writer.writeLine('return new Response(null, { status: 204 })')
      })
      writer.blankLine()
    }

    // Continue to workflow execution
    writer.writeLine("// Workflow execution flow")
    this.generateExecutionFlow(writer)
  }

  private generateExecutionFlow(writer: CodeBlockWriter): void {
    const entryNode = this.analyzed.nodes.find(n => n.id === this.analyzed.entryPoint)
    if (!entryNode) {
      throw new Error("Entry point node not found")
    }

    // Find first non-trigger node
    const nextEdge = this.analyzed.edges.find(e => e.source === entryNode.id)
    if (nextEdge) {
      this.generateNodeExecution(nextEdge.target, new Set(), writer)
    }
  }

  private generateNodeExecution(nodeId: string, visited: Set<string>, writer: CodeBlockWriter): void {
    if (visited.has(nodeId)) {
      return
    }
    visited.add(nodeId)

    const node = this.analyzed.nodes.find(n => n.id === nodeId)
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

  private generateStructuralNode(node: AnalyzedNode, visited: Set<string>, writer: CodeBlockWriter): void {
    const kind = node.type

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
      default: {
        writer.writeLine(`// Unsupported structural node type: ${kind}`)
        const nextEdge = this.analyzed.edges.find(e => e.source === node.id)
        if (nextEdge) {
          this.generateNodeExecution(nextEdge.target, visited, writer)
        }
      }
    }
  }

  private generateIfNode(node: AnalyzedNode, visited: Set<string>, writer: CodeBlockWriter): void {
    const props = (node.data.properties || {}) as Record<string, unknown>
    const condition = props.condition || "false"

    writer.writeLine(`const condition_${this.sanitizeId(node.id)} = evaluateExpression(\`${condition}\`, context)`)
    writer.write(`if (condition_${this.sanitizeId(node.id)})`).block(() => {
      const trueBranch = this.analyzed.edges.find(e => e.source === node.id && e.sourceHandle === "true")
      if (trueBranch) {
        this.generateNodeExecution(trueBranch.target, visited, writer)
      }
    })
    writer.write("else").block(() => {
      const falseBranch = this.analyzed.edges.find(e => e.source === node.id && e.sourceHandle === "false")
      if (falseBranch) {
        this.generateNodeExecution(falseBranch.target, visited, writer)
      }
    })
  }

  private generateSwitchNode(node: AnalyzedNode, visited: Set<string>, writer: CodeBlockWriter): void {
    const props = (node.data.properties || {}) as Record<string, unknown>
    const expression = props.expression || "''"
    const cases = (props.cases || []) as Array<{ value: string }>

    writer.writeLine(`const switchValue_${this.sanitizeId(node.id)} = evaluateExpression(\`${expression}\`, context)`)
    writer.write(`switch (switchValue_${this.sanitizeId(node.id)})`).block(() => {
      for (const caseItem of cases) {
        writer.writeLine(`case ${JSON.stringify(caseItem.value)}:`)
        writer.indent(() => {
          const caseBranch = this.analyzed.edges.find(e => e.source === node.id && e.sourceHandle === caseItem.value)
          if (caseBranch) {
            this.generateNodeExecution(caseBranch.target, visited, writer)
          }
          writer.writeLine("break")
        })
      }

      writer.writeLine("default:")
      writer.indent(() => {
        const defaultBranch = this.analyzed.edges.find(e => e.source === node.id && e.sourceHandle === "default")
        if (defaultBranch) {
          this.generateNodeExecution(defaultBranch.target, visited, writer)
        }
      })
    })
  }

  private generateForNode(node: AnalyzedNode, visited: Set<string>, writer: CodeBlockWriter): void {
    const props = (node.data.properties || {}) as Record<string, unknown>
    const iterator = props.iterator || "[]"
    const itemVariable = props.itemVariable || "item"
    const batchSize = props.batchSize || 1

    writer.writeLine(`const items_${this.sanitizeId(node.id)} = evaluateExpression(\`${iterator}\`, context)`)
    writer.write(`for (let i = 0; i < items_${this.sanitizeId(node.id)}.length; i += ${batchSize})`).block(() => {
      writer.writeLine(`const batch = items_${this.sanitizeId(node.id)}.slice(i, i + ${batchSize})`)
      writer.writeLine(`context.variables.set('${itemVariable}', batch.length === 1 ? batch[0] : batch)`)
      writer.writeLine(`context.variables.set('${itemVariable}Index', i)`)

      const bodyBranch = this.analyzed.edges.find(e => e.source === node.id && e.sourceHandle === "body")
      if (bodyBranch) {
        this.generateNodeExecution(bodyBranch.target, new Set(visited), writer)
      }
    })

    const doneBranch = this.analyzed.edges.find(e => e.source === node.id && e.sourceHandle === "done")
    if (doneBranch) {
      this.generateNodeExecution(doneBranch.target, visited, writer)
    }
  }

  private generateMergeNode(node: AnalyzedNode, visited: Set<string>, writer: CodeBlockWriter): void {
    const nextEdge = this.analyzed.edges.find(e => e.source === node.id)
    if (nextEdge) {
      this.generateNodeExecution(nextEdge.target, visited, writer)
    }
  }

  private generateExecutableNode(node: AnalyzedNode, visited: Set<string>, writer: CodeBlockWriter): void {
    const nodeData: Record<string, unknown> = node.data
    const properties = nodeData.properties || {}
    const nodeName = node.type
    const packageName = this.getPackageName(nodeName)

    let runtimeImportName = this.typeToAlias.get(nodeName)
    if (!runtimeImportName) {
      const baseAlias = this.sanitizeId(nodeName) + "Runtime"
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

    const moduleSpecifier = `nodes-${packageName}/runtime`
    if (!this.addedNodeImports.has(moduleSpecifier)) {
      this.sourceFile.addImportDeclaration({
        moduleSpecifier,
        defaultImport: runtimeImportName
      })
      this.addedNodeImports.add(moduleSpecifier)
    }

    writer.writeLine(`const props_${this.sanitizeId(node.id)} = ${JSON.stringify(properties, null, 2)}`)
    writer.writeLine(`// Evaluate expressions in props`)
    writer.write(`for (const key in props_${this.sanitizeId(node.id)})`).block(() => {
      writer.writeLine(`const value = props_${this.sanitizeId(node.id)}[key]`)
      writer.write(`if (typeof value === 'string' && value.includes('\${''))`).block(() => {
        writer.writeLine(`props_${this.sanitizeId(node.id)}[key] = evaluateExpression(value, context)`)
      })
    })

    writer.writeLine(`const result_${this.sanitizeId(node.id)} = await ${runtimeImportName}(props_${this.sanitizeId(node.id)}, secrets)`)
    writer.writeLine(`context.stepResults.set('${node.id}', result_${this.sanitizeId(node.id)})`)
    writer.writeLine(`logger.info('Node ${node.id} completed', result_${this.sanitizeId(node.id)})`)

    const nextEdge = this.analyzed.edges.find(e => e.source === node.id)
    if (nextEdge) {
      this.generateNodeExecution(nextEdge.target, visited, writer)
    }
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, "_")
  }
}