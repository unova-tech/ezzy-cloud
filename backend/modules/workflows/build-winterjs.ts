/**
 * Build WinterJS deployment package endpoint
 *
 * Creates a tar.gz archive containing all files needed to deploy a workflow to WinterJS/Kubernetes:
 * - _worker.js (compiled and bundled JavaScript)
 * - Dockerfile (template for WinterJS)
 * - .dockerignore (build context filter)
 * - README.md (workflow-specific quick start guide)
 * - example.env (environment variables template)
 * - DEPLOYMENT.md (comprehensive deployment guide)
 */

import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import type { Edge, Node } from "@xyflow/react"
import * as tar from "tar"
import { DeploymentReadmeGenerator } from "../../lib/deployment-readme-generator"
import { WorkflowCompiler } from "../../lib/workflow-compiler"

export interface BuildWinterJSRequest {
  workflow: {
    id: string
    name: string
    version: number
    nodes: Node[]
    edges: Edge[]
  }
}

export interface BuildWinterJSResult {
  success: boolean
  error?: string
  archiveBuffer?: Buffer
  metadata?: {
    workflowId: string
    workflowName: string
    version: number
    bundleSize: number
    archiveSize: number
    buildTimestamp: string
    environmentVariables: {
      workflowId: boolean
      secrets: string[]
    }
  }
}

export async function buildWinterJSDeployment(
  request: BuildWinterJSRequest
): Promise<BuildWinterJSResult> {
  const startTime = Date.now()
  let buildDir: string | null = null

  // ESM-safe directory resolution
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  try {
    const { workflow } = request

    console.log(`[BuildWinterJS] Starting build for workflow: ${workflow.id}`)

    // 1. Compile and bundle workflow
    console.log("[BuildWinterJS] Compiling workflow...")
    const compiler = new WorkflowCompiler()
    const compilationStart = Date.now()

    const result = await compiler.compileAndBundle(
      workflow.nodes,
      workflow.edges,
      { minify: true, sourcemap: false }
    )

    if (!result.success || !result.bundle) {
      console.error("[BuildWinterJS] Compilation failed:", result.error)

      // Check if this is a bundling error vs compilation error
      let error = result.error || "Compilation failed"

      if (result.success && !result.bundle && result.warnings) {
        // Compilation succeeded but bundle is missing - likely a bundling error
        const bundlingWarning = result.warnings.find(
          (w: string) =>
            w.startsWith("Bundling failed:") || w.startsWith("Bundling error:")
        )
        if (bundlingWarning) {
          error = bundlingWarning
        } else {
          error = "Bundling failed"
        }
      }

      return {
        success: false,
        error
      }
    }

    const compilationTime = Date.now() - compilationStart
    console.log(`[BuildWinterJS] Compilation completed in ${compilationTime}ms`)

    // 2. Extract metadata
    const metadata = compiler.getBuildMetadata(
      result,
      workflow.name,
      workflow.id
    )

    // 3. Create temporary build directory
    const tempDir = os.tmpdir()
    buildDir = path.join(tempDir, `workflow-build-${crypto.randomUUID()}`)
    fs.mkdirSync(buildDir, { recursive: true })
    console.log(`[BuildWinterJS] Created build directory: ${buildDir}`)

    // 4. Write bundle file
    const workerPath = path.join(buildDir, "_worker.js")
    fs.writeFileSync(workerPath, result.bundle, "utf-8")
    console.log("[BuildWinterJS] Wrote _worker.js")

    // 5. Copy Dockerfile template
    const dockerfileSrc = path.resolve(
      __dirname,
      "..",
      "..",
      "templates",
      "Dockerfile.winterjs"
    )
    const dockerfileDest = path.join(buildDir, "Dockerfile")

    if (!fs.existsSync(dockerfileSrc)) {
      throw new Error(`Dockerfile template not found at: ${dockerfileSrc}`)
    }

    fs.copyFileSync(dockerfileSrc, dockerfileDest)
    console.log("[BuildWinterJS] Copied Dockerfile")

    // 6. Generate .dockerignore
    const dockerignoreContent = `# Docker ignore file for WinterJS workflow builds
# This file should be in the repository root
# Build context is the repository root directory

# Ignore everything by default
*

# Allow only the workflow bundle
!_worker.js

# Optional: Allow documentation if needed in the image
# !README.md
# !backend/templates/README.md
`
    fs.writeFileSync(
      path.join(buildDir, ".dockerignore"),
      dockerignoreContent,
      "utf-8"
    )
    console.log("[BuildWinterJS] Generated .dockerignore")

    // 7. Generate dynamic README.md
    const readmeGenerator = new DeploymentReadmeGenerator()
    const readmeContent = readmeGenerator.generate({
      workflowName: workflow.name,
      workflowId: workflow.id,
      buildTimestamp: metadata.buildTimestamp,
      bundleSize: metadata.bundleSize,
      environmentVariables: metadata.environmentVariables,
      metadata: {
        nodeCount: metadata.nodeCount,
        edgeCount: metadata.edgeCount,
        hasLoops: metadata.hasLoops,
        maxDepth: metadata.maxDepth
      }
    })
    fs.writeFileSync(path.join(buildDir, "README.md"), readmeContent, "utf-8")
    console.log("[BuildWinterJS] Generated README.md")

    // 8. Generate example.env
    const exampleEnvSrc = path.resolve(
      __dirname,
      "..",
      "..",
      "templates",
      "example-workflow.env"
    )
    let exampleEnvContent = ""

    if (fs.existsSync(exampleEnvSrc)) {
      exampleEnvContent = fs.readFileSync(exampleEnvSrc, "utf-8")
    } else {
      // Fallback if template doesn't exist
      exampleEnvContent = `# Example environment variables for local workflow testing
# Copy this file to workflow.env and fill with your values
# Usage: docker run --env-file workflow.env my-workflow:latest

# Workflow Configuration
WORKFLOW_ID=${workflow.id}
NODE_ENV=development
PORT=8080
`
    }

    // Append detected secrets
    if (metadata.environmentVariables.secrets.length > 0) {
      exampleEnvContent +=
        "\n# Detected Secrets (replace with your actual values)\n"
      for (const secret of metadata.environmentVariables.secrets) {
        exampleEnvContent += `SECRET_${secret}=your_value_here\n`
      }
    }

    exampleEnvContent += `
# Notes:
# - All secrets must be prefixed with SECRET_
# - Variable names are case-sensitive
# - Do not commit this file with real secrets to version control
# - In production, use Kubernetes Secrets instead
`

    fs.writeFileSync(
      path.join(buildDir, "example.env"),
      exampleEnvContent,
      "utf-8"
    )
    console.log("[BuildWinterJS] Generated example.env")

    // 9. Copy comprehensive deployment guide
    const deploymentGuideSrc = path.resolve(
      __dirname,
      "..",
      "..",
      "templates",
      "README.md"
    )
    const deploymentGuideDest = path.join(buildDir, "DEPLOYMENT.md")

    if (fs.existsSync(deploymentGuideSrc)) {
      fs.copyFileSync(deploymentGuideSrc, deploymentGuideDest)
      console.log("[BuildWinterJS] Copied DEPLOYMENT.md")
    } else {
      console.warn("[BuildWinterJS] DEPLOYMENT.md template not found, skipping")
    }

    // 10. Create tar.gz archive
    console.log("[BuildWinterJS] Creating tar.gz archive...")
    const archivePath = path.join(buildDir, "deployment.tar.gz")

    const files = [
      "_worker.js",
      "Dockerfile",
      ".dockerignore",
      "README.md",
      "example.env"
    ]
    if (fs.existsSync(deploymentGuideDest)) {
      files.push("DEPLOYMENT.md")
    }

    await tar.c(
      {
        gzip: true,
        file: archivePath,
        cwd: buildDir,
        portable: true // Omit OS-specific metadata for reproducibility
      },
      files
    )

    console.log("[BuildWinterJS] Archive created")

    // 11. Read archive into memory
    const archiveBuffer = fs.readFileSync(archivePath)
    const archiveSize = archiveBuffer.length

    const totalTime = Date.now() - startTime
    console.log(`[BuildWinterJS] Build completed in ${totalTime}ms`)
    console.log(`[BuildWinterJS] Bundle size: ${metadata.bundleSize} bytes`)
    console.log(`[BuildWinterJS] Archive size: ${archiveSize} bytes`)

    return {
      success: true,
      archiveBuffer,
      metadata: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        version: workflow.version,
        bundleSize: metadata.bundleSize,
        archiveSize,
        buildTimestamp: metadata.buildTimestamp,
        environmentVariables: metadata.environmentVariables
      }
    }
  } catch (error) {
    console.error("[BuildWinterJS] Error during build:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    // Cleanup temporary directory
    if (buildDir && fs.existsSync(buildDir)) {
      try {
        fs.rmSync(buildDir, { recursive: true, force: true })
        console.log(`[BuildWinterJS] Cleaned up build directory: ${buildDir}`)
      } catch (cleanupError) {
        console.warn(
          `[BuildWinterJS] Failed to cleanup build directory: ${cleanupError}`
        )
        // Don't throw - cleanup failure shouldn't fail the request
      }
    }
  }
}
