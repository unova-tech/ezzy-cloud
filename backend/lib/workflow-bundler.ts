import * as esbuild from "esbuild"
import * as fs from "node:fs"
import * as path from "node:path"
import { getPackagePath } from "./package-map"

export interface BundleOptions {
  workflowId: string
  generatedCode: string // Código TypeScript gerado pelo CodeGenerator
  usedNodes: string[] // Lista de node types usados (ex: ['http-request', 'code'])
  minify?: boolean // Default: true
  sourcemap?: boolean // Default: false
}

export interface BundleResult {
  success: boolean
  bundleCode?: string // JavaScript bundle final
  bundleSize?: number // Tamanho em bytes
  error?: string
  warnings?: string[]
  environmentVariables?: {
    workflowId: boolean // Se usa WORKFLOW_ID
    secrets: string[] // Lista de secrets usados
  }
}

export class WorkflowBundler {
  private projectRoot: string

  /**
   * Creates a new WorkflowBundler instance.
   * 
   * @param projectRoot - Optional absolute path to the workspace root.
   *                      If not provided, will attempt to auto-detect by traversing up from current directory.
   *                      Pass explicitly in non-standard environments (tests, Docker, etc.).
   */
  constructor(projectRoot?: string) {
    // Detect project root or use provided path
    this.projectRoot = projectRoot || this.detectProjectRoot()
  }

  private detectProjectRoot(): string {
    // Navigate up from current file to find workspace root
    let currentDir = __dirname
    while (currentDir !== "/") {
      const packageJsonPath = path.join(currentDir, "package.json")
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
        if (packageJson.workspaces) {
          return currentDir
        }
      }
      currentDir = path.dirname(currentDir)
    }
    
    // Safer fallback to current working directory
    const cwd = process.cwd()
    console.warn(
      `[WorkflowBundler] Could not detect workspace root, falling back to process.cwd(): ${cwd}`
    )
    console.warn(
      "[WorkflowBundler] Consider passing projectRoot explicitly to the constructor"
    )
    return cwd
  }

  async bundle(options: BundleOptions): Promise<BundleResult> {
    const startTime = Date.now()

    // Validate inputs
    if (!options.generatedCode || options.generatedCode.trim().length === 0) {
      return {
        success: false,
        error: "Generated code is empty"
      }
    }

    if (!options.workflowId || options.workflowId.trim().length === 0) {
      return {
        success: false,
        error: "Workflow ID is required"
      }
    }

    // Validate node runtimes exist
    const validation = await this.validateNodeRuntimes(options.usedNodes)
    if (!validation.valid) {
      return {
        success: false,
        error: `Missing node runtimes: ${validation.missing.join(", ")}`
      }
    }

    // Create temporary file with generated code
    const tempFilePath = path.join("/tmp", `workflow-${options.workflowId}.ts`)

    try {
      // Write generated code to temp file
      fs.writeFileSync(tempFilePath, options.generatedCode, "utf-8")

      console.log(`[WorkflowBundler] Starting bundle for workflow ${options.workflowId}`)

      // Configure esbuild
      // Note: platform is set to 'browser' to avoid Node.js-specific polyfills.
      // This is correct for WinterJS/Cloudflare Workers which use Web APIs.
      // The generated code uses 'env' parameter (Cloudflare Workers pattern) not process.env,
      // so no process.env shim is needed. If future nodes require process.env access,
      // consider adding an inject option with an env-shim.ts file.
      const result = await esbuild.build({
        entryPoints: [tempFilePath],
        bundle: true,
        format: "esm",
        target: "es2022",
        platform: "browser", // Correct for WinterJS - uses Web APIs, not Node.js APIs
        minify: options.minify ?? true,
        sourcemap: options.sourcemap ?? false,
        write: false,
        treeShaking: true,
        external: [],
        plugins: [this.createWorkspaceResolverPlugin()],
        logLevel: "warning"
      })

      // Process result
      if (result.outputFiles.length === 0) {
        return {
          success: false,
          error: "esbuild produced no output"
        }
      }

      let bundleCode = result.outputFiles[0].text
      const bundleSize = result.outputFiles[0].contents.length

      // Analyze environment variables
      const envVars = this.analyzeEnvironmentVariables(bundleCode)

      // Generate and prepend comment
      const comment = this.generateBundleComment(envVars)
      bundleCode = comment + "\n" + bundleCode

      // Validate bundle format
      const formatWarnings = this.validateBundleFormat(bundleCode, envVars)

      // Collect warnings
      const warnings: string[] = [
        ...result.warnings.map(w => w.text),
        ...formatWarnings
      ]

      const bundleTime = Date.now() - startTime
      console.log(
        `[WorkflowBundler] Bundle completed in ${bundleTime}ms, size: ${bundleSize} bytes`
      )

      if (warnings.length > 0) {
        console.warn(`[WorkflowBundler] Warnings:`, warnings)
      }

      return {
        success: true,
        bundleCode,
        bundleSize: bundleCode.length,
        warnings: warnings.length > 0 ? warnings : undefined,
        environmentVariables: envVars
      }
    } catch (error) {
      console.error(`[WorkflowBundler] Error:`, error)
      return {
        success: false,
        error:
          error instanceof Error
            ? `Bundling failed: ${error.message}`
            : "Bundling failed with unknown error"
      }
    } finally {
      // Cleanup temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath)
        }
      } catch (cleanupError) {
        console.warn(`[WorkflowBundler] Failed to cleanup temp file:`, cleanupError)
      }
    }
  }

  private async validateNodeRuntimes(
    usedNodes: string[]
  ): Promise<{ valid: boolean; missing: string[] }> {
    // Filter out core nodes and triggers that don't have runtimes
    const coreNodes = ["if", "switch", "for", "merge"]
    const nodesToValidate = usedNodes.filter(
      (n) => !n.startsWith("trigger-") && !coreNodes.includes(n)
    )

    const missing: string[] = []

    for (const nodeType of nodesToValidate) {
      // Use shared package mapping logic
      const packagePath = getPackagePath(nodeType)
      const runtimePath = path.join(
        this.projectRoot,
        "nodes",
        packagePath,
        "runtime.ts"
      )

      if (!fs.existsSync(runtimePath)) {
        missing.push(`${nodeType} (expected at ${runtimePath})`)
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }

  private createWorkspaceResolverPlugin(): esbuild.Plugin {
    const projectRoot = this.projectRoot

    return {
      name: "workspace-resolver",
      setup(build) {
        // Resolve workflow-runtime
        build.onResolve({ filter: /^workflow-runtime$/ }, (args) => {
          const resolvedPath = path.join(projectRoot, "runtime", "index.ts")
          if (!fs.existsSync(resolvedPath)) {
            return { errors: [{ text: `workflow-runtime not found at ${resolvedPath}` }] }
          }
          return { path: resolvedPath, namespace: "file" }
        })

        // Resolve workflow-runtime/logger
        build.onResolve({ filter: /^workflow-runtime\/logger$/ }, (args) => {
          const resolvedPath = path.join(projectRoot, "runtime", "logger.ts")
          if (!fs.existsSync(resolvedPath)) {
            return {
              errors: [{ text: `workflow-runtime/logger not found at ${resolvedPath}` }]
            }
          }
          return { path: resolvedPath, namespace: "file" }
        })

        // Resolve nodes-*/runtime
        build.onResolve({ filter: /^nodes-.+\/runtime$/ }, (args) => {
          // Extract everything between nodes- and /runtime (including slashes for nested paths)
          // nodes-http-request/runtime -> http-request
          // nodes-resend-send-email/runtime -> resend-send-email -> resend/send-email (via getPackagePath)
          const match = args.path.match(/^nodes-(.+)\/runtime$/)
          if (!match) return undefined

          const nodeName = match[1]

          // Use shared package mapping logic
          const packagePath = getPackagePath(nodeName)
          const resolvedPath = path.join(projectRoot, "nodes", packagePath, "runtime.ts")

          if (!fs.existsSync(resolvedPath)) {
            return {
              errors: [{ text: `Node runtime not found: ${nodeName} at ${resolvedPath}` }]
            }
          }

          return { path: resolvedPath, namespace: "file" }
        })

        // Resolve node-base
        build.onResolve({ filter: /^node-base$/ }, (args) => {
          const resolvedPath = path.join(projectRoot, "nodes", "__base__", "index.ts")
          if (!fs.existsSync(resolvedPath)) {
            return { errors: [{ text: `node-base not found at ${resolvedPath}` }] }
          }
          return { path: resolvedPath, namespace: "file" }
        })
      }
    }
  }

  private analyzeEnvironmentVariables(code: string): {
    workflowId: boolean
    secrets: string[]
  } {
    // Detect WORKFLOW_ID usage
    const usesWorkflowId = code.includes("env.WORKFLOW_ID")

    // Extract secrets with regex
    const secretRegex = /env\.SECRET_([a-zA-Z0-9_]+)/g
    const secrets: Set<string> = new Set()
    let match: RegExpExecArray | null

    while ((match = secretRegex.exec(code)) !== null) {
      secrets.add(match[1])
    }

    return {
      workflowId: usesWorkflowId,
      secrets: Array.from(secrets)
    }
  }

  private generateBundleComment(envVars: {
    workflowId: boolean
    secrets: string[]
  }): string {
    const lines = [
      "/**",
      " * Workflow Bundle for WinterJS",
      " * ",
      " * Environment variables expected:"
    ]

    if (envVars.workflowId) {
      lines.push(" * - WORKFLOW_ID: Unique workflow identifier")
    }

    if (envVars.secrets.length > 0) {
      lines.push(" * - Secrets: " + envVars.secrets.map((s) => `SECRET_${s}`).join(", "))
    }

    if (!envVars.workflowId && envVars.secrets.length === 0) {
      lines.push(" * - None required")
    }

    lines.push(" * ", " * Deploy: Copy this file to WinterJS container as _worker.js", " */")

    return lines.join("\n")
  }

  private validateBundleFormat(
    bundleCode: string,
    envVars: { workflowId: boolean; secrets: string[] }
  ): string[] {
    const warnings: string[] = []

    // Check for Cloudflare Workers format
    if (!bundleCode.includes("export default")) {
      warnings.push("Bundle may not be compatible with WinterJS (missing 'export default')")
    }

    if (!bundleCode.includes("async fetch")) {
      warnings.push(
        "Bundle may not be compatible with WinterJS (missing 'async fetch' handler)"
      )
    }

    // Check if env parameter is preserved when needed
    const needsEnv = envVars.workflowId || envVars.secrets.length > 0
    if (needsEnv && !bundleCode.includes("env")) {
      warnings.push(
        "Bundle uses environment variables but 'env' parameter may have been removed by tree-shaking"
      )
    }

    return warnings
  }
}