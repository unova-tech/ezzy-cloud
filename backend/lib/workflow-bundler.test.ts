import { describe, expect, test } from "bun:test"
import type { Edge, Node } from "@xyflow/react"
import { CodeGenerator } from "./code-generator"
import { GraphAnalyzer } from "./graph-analyzer"
import { WorkflowBundler } from "./workflow-bundler"

// Helper function to create a simple workflow
function createSimpleWorkflow(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: "trigger-1",
      type: "trigger-manual",
      position: { x: 0, y: 0 },
      data: {
        label: "Manual Trigger",
        properties: {},
        _metadata: {
          propertiesSchema: { type: "object", properties: {} },
          resultSchema: { type: "object", properties: {} }
        }
      }
    },
    {
      id: "http-1",
      type: "http-request",
      position: { x: 200, y: 0 },
      data: {
        label: "HTTP Request",
        properties: {
          method: "GET",
          url: "https://api.example.com/data",
          headers: [],
          timeout: 30000
        },
        _metadata: {
          propertiesSchema: { type: "object", properties: {} },
          resultSchema: { type: "object", properties: {} }
        }
      }
    }
  ]

  const edges: Edge[] = [
    {
      id: "e1-2",
      source: "trigger-1",
      target: "http-1"
    }
  ]

  return { nodes, edges }
}

// Helper function to generate code for a workflow
function generateCodeForWorkflow(nodes: Node[], edges: Edge[]): string {
  const analyzer = new GraphAnalyzer(nodes, edges)
  const analyzed = analyzer.analyze()
  const generator = new CodeGenerator(analyzed)
  const generated = generator.generate()
  return [...generated.imports, "", generated.code].join("\n")
}

describe("WorkflowBundler - Basic Bundling", () => {
  test("should bundle simple workflow with http-request node", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-1",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    expect(result.bundleCode).toContain("export default")
    expect(result.bundleCode).toContain("async fetch")
    expect(result.bundleSize).toBeGreaterThan(0)
  })

  test("should bundle workflow with code node", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "trigger-manual",
        position: { x: 0, y: 0 },
        data: {
          label: "Manual Trigger",
          properties: {},
          _metadata: {
            propertiesSchema: { type: "object", properties: {} },
            resultSchema: { type: "object", properties: {} }
          }
        }
      },
      {
        id: "code-1",
        type: "code",
        position: { x: 200, y: 0 },
        data: {
          label: "Code",
          properties: {
            code: "return { result: 'Hello' }",
            inputVariables: []
          },
          _metadata: {
            propertiesSchema: { type: "object", properties: {} },
            resultSchema: { type: "object", properties: {} }
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "e1-2",
        source: "trigger-1",
        target: "code-1"
      }
    ]

    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-2",
      generatedCode,
      usedNodes: ["code"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    // AsyncFunction should be preserved
    expect(result.bundleCode).toContain("async")
  })

  test("should bundle workflow with multiple nodes", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "trigger-manual",
        position: { x: 0, y: 0 },
        data: {
          label: "Manual Trigger",
          properties: {},
          _metadata: {
            propertiesSchema: { type: "object", properties: {} },
            resultSchema: { type: "object", properties: {} }
          }
        }
      },
      {
        id: "http-1",
        type: "http-request",
        position: { x: 200, y: 0 },
        data: {
          label: "HTTP Request",
          properties: {
            method: "GET",
            url: "https://api.example.com/data",
            headers: [],
            timeout: 30000
          },
          _metadata: {
            propertiesSchema: { type: "object", properties: {} },
            resultSchema: { type: "object", properties: {} }
          }
        }
      },
      {
        id: "code-1",
        type: "code",
        position: { x: 400, y: 0 },
        data: {
          label: "Code",
          properties: {
            code: "return { processed: true }",
            inputVariables: []
          },
          _metadata: {
            propertiesSchema: { type: "object", properties: {} },
            resultSchema: { type: "object", properties: {} }
          }
        }
      }
    ]

    const edges: Edge[] = [
      { id: "e1-2", source: "trigger-1", target: "http-1" },
      { id: "e2-3", source: "http-1", target: "code-1" }
    ]

    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-3",
      generatedCode,
      usedNodes: ["http-request", "code"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
  })
})

describe("WorkflowBundler - Workspace Resolution", () => {
  test("should resolve workflow-runtime imports", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-4",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    // Should contain inlined runtime functions
    expect(result.bundleCode).toContain("createContext")
    // Should not contain import statements (everything inlined)
    expect(result.bundleCode).not.toContain('import')
    expect(result.bundleCode).not.toContain('from "workflow-runtime"')
  })

  test("should resolve workflow-runtime/logger imports", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-5",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    // Logger class should be inlined
    expect(result.bundleCode).toContain("Logger")
  })

  test("should resolve node runtime imports", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-6",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    // HTTP request runtime code should be included
    expect(result.bundleCode).toContain("fetch")
  })
})

describe("WorkflowBundler - Error Handling", () => {
  test("should fail with missing node runtime", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-7",
      generatedCode,
      usedNodes: ["nonexistent-node"],
      minify: false
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain("Missing node runtimes")
    expect(result.error).toContain("nonexistent-node")
  })

  test("should fail with invalid TypeScript code", async () => {
    const invalidCode = "this is not valid typescript {{"

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-8",
      generatedCode: invalidCode,
      usedNodes: [],
      minify: false
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  test("should handle empty code gracefully", async () => {
    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-9",
      generatedCode: "",
      usedNodes: [],
      minify: false
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe("Generated code is empty")
  })
})

describe("WorkflowBundler - Environment Variables", () => {
  test("should detect WORKFLOW_ID usage", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-10",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.environmentVariables).toBeDefined()
    expect(result.environmentVariables?.workflowId).toBe(true)
  })

  test("should add bundle comment with env vars", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-11",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    // Should start with comment
    expect(result.bundleCode).toMatch(/^\/\*\*/)
    expect(result.bundleCode).toContain("Workflow Bundle for WinterJS")
    expect(result.bundleCode).toContain("Environment variables expected")
  })
})

describe("WorkflowBundler - Minification", () => {
  test("should minify bundle when minify=true", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()

    const minifiedResult = await bundler.bundle({
      workflowId: "test-workflow-12",
      generatedCode,
      usedNodes: ["http-request"],
      minify: true
    })

    const unminifiedResult = await bundler.bundle({
      workflowId: "test-workflow-13",
      generatedCode,
      usedNodes: ["http-request"],
      minify: false
    })

    expect(minifiedResult.success).toBe(true)
    expect(unminifiedResult.success).toBe(true)

    // Minified version should be smaller
    expect(minifiedResult.bundleSize!).toBeLessThan(unminifiedResult.bundleSize!)
  })

  test("should preserve functionality after minification", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-14",
      generatedCode,
      usedNodes: ["http-request"],
      minify: true
    })

    expect(result.success).toBe(true)
    expect(result.bundleCode).toBeDefined()
    // Essential structure should still be present
    expect(result.bundleCode).toContain("export default")
    expect(result.bundleCode).toContain("async fetch")
  })
})

describe("WorkflowBundler - Performance", () => {
  test("should bundle in reasonable time", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const startTime = Date.now()

    const result = await bundler.bundle({
      workflowId: "test-workflow-15",
      generatedCode,
      usedNodes: ["http-request"],
      minify: true
    })

    const duration = Date.now() - startTime

    expect(result.success).toBe(true)
    // Should complete in less than 5 seconds
    expect(duration).toBeLessThan(5000)
  })

  test("should generate reasonable bundle size", async () => {
    const { nodes, edges } = createSimpleWorkflow()
    const generatedCode = generateCodeForWorkflow(nodes, edges)

    const bundler = new WorkflowBundler()
    const result = await bundler.bundle({
      workflowId: "test-workflow-16",
      generatedCode,
      usedNodes: ["http-request"],
      minify: true
    })

    expect(result.success).toBe(true)
    expect(result.bundleSize).toBeDefined()
    // Simple workflow should have bundle < 500KB
    expect(result.bundleSize!).toBeLessThan(500 * 1024)
  })
})
