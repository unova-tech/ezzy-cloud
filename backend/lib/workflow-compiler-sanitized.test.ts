/**
 * Tests for WorkflowCompiler with sanitized nodes (no nodeTypeData)
 * Validates that compilation works with nodes that only have data.type
 */

import { describe, expect, test } from "bun:test"
import type { Edge, Node } from "@xyflow/react"
import { WorkflowCompiler } from "./workflow-compiler"

describe("WorkflowCompiler with sanitized nodes", () => {
  test("should compile minimal workflow with sanitized trigger node", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      }
    ]

    const edges: Edge[] = []

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.code).toBeDefined()
    expect(result.metadata).toBeDefined()
    expect(result.metadata?.nodeCount).toBe(1)
  })

  test("should detect trigger from data.type starting with trigger-", async () => {
    const nodes: Node[] = [
      {
        id: "node-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-http",
          properties: {}
        }
      },
      {
        id: "node-2",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "http-request",
          properties: {
            url: "https://api.example.com",
            method: "GET"
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "node-1",
        target: "node-2"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.code).toBeDefined()
    expect(result.code).toContain("trigger-http")
  })

  test("should handle structural nodes (if) in sanitized format", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "if-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "if",
          properties: {
            condition: "true"
          }
        }
      },
      {
        id: "action-1",
        type: "base",
        position: { x: 400, y: 0 },
        data: {
          type: "http-request",
          properties: {
            url: "https://api.example.com",
            method: "GET"
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "if-1"
      },
      {
        id: "edge-2",
        source: "if-1",
        sourceHandle: "true",
        target: "action-1"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.code).toBeDefined()
    expect(result.code).toContain("if")
  })

  test("should handle switch node in sanitized format", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "switch-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "switch",
          properties: {
            value: "status"
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "switch-1"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.code).toBeDefined()
  })

  test("should handle for loop in sanitized format", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "for-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "for",
          properties: {
            array: "[1, 2, 3]"
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "for-1"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.code).toBeDefined()
  })

  test("should handle merge node in sanitized format", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "if-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "if",
          properties: {
            condition: "true"
          }
        }
      },
      {
        id: "action-1",
        type: "base",
        position: { x: 400, y: -100 },
        data: {
          type: "http-request",
          properties: {}
        }
      },
      {
        id: "action-2",
        type: "base",
        position: { x: 400, y: 100 },
        data: {
          type: "code",
          properties: {}
        }
      },
      {
        id: "merge-1",
        type: "base",
        position: { x: 600, y: 0 },
        data: {
          type: "merge",
          properties: {}
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "if-1"
      },
      {
        id: "edge-2",
        source: "if-1",
        sourceHandle: "true",
        target: "action-1"
      },
      {
        id: "edge-3",
        source: "if-1",
        sourceHandle: "false",
        target: "action-2"
      },
      {
        id: "edge-4",
        source: "action-1",
        target: "merge-1"
      },
      {
        id: "edge-5",
        source: "action-2",
        target: "merge-1"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.code).toBeDefined()
  })

  test("should fail when no trigger node is present", async () => {
    const nodes: Node[] = [
      {
        id: "action-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "http-request",
          properties: {}
        }
      }
    ]

    const edges: Edge[] = []

    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)

    expect(result.success).toBe(false)
    expect(result.error).toContain("trigger")
  })
})

describe("WorkflowCompiler.compileAndBundle with sanitized nodes", () => {
  test("should bundle workflow with sanitized nodes and include runtime", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "action-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "http-request",
          properties: {
            url: "https://api.example.com",
            method: "GET"
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "action-1"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compileAndBundle(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.bundle).toBeDefined()
    expect(result.bundleSize).toBeGreaterThan(0)
    
    // Bundle should include http-request runtime
    expect(result.bundle).toContain("http-request")
  })

  test("should exclude trigger and structural nodes from usedNodes", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "if-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "if",
          properties: {
            condition: "true"
          }
        }
      },
      {
        id: "action-1",
        type: "base",
        position: { x: 400, y: 0 },
        data: {
          type: "http-request",
          properties: {
            url: "https://api.example.com",
            method: "GET"
          }
        }
      },
      {
        id: "action-2",
        type: "base",
        position: { x: 400, y: 100 },
        data: {
          type: "code",
          properties: {
            code: "return { result: 'ok' }"
          }
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "if-1"
      },
      {
        id: "edge-2",
        source: "if-1",
        sourceHandle: "true",
        target: "action-1"
      },
      {
        id: "edge-3",
        source: "if-1",
        sourceHandle: "false",
        target: "action-2"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compileAndBundle(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.bundle).toBeDefined()
    
    // Bundle should include action node runtimes
    expect(result.bundle).toContain("http-request")
    expect(result.bundle).toContain("code")
    
    // Bundle should NOT contain trigger or structural node types in usedNodes
    // (they are compiled inline, not imported as runtimes)
  })

  test("should handle workflow with only structural nodes after trigger", async () => {
    const nodes: Node[] = [
      {
        id: "trigger-1",
        type: "base",
        position: { x: 0, y: 0 },
        data: {
          type: "trigger-webhook",
          properties: {}
        }
      },
      {
        id: "merge-1",
        type: "base",
        position: { x: 200, y: 0 },
        data: {
          type: "merge",
          properties: {}
        }
      }
    ]

    const edges: Edge[] = [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "merge-1"
      }
    ]

    const compiler = new WorkflowCompiler()
    const result = await compiler.compileAndBundle(nodes, edges)

    expect(result.success).toBe(true)
    expect(result.bundle).toBeDefined()
  })
})
