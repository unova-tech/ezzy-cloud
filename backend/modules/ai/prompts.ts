/**
 * AI Prompts for Workflow Generation and Editing
 */

import type { INode } from "../../../nodes/__base__"

export interface NodeLibrary {
  name: string
  description: string
  properties: string
  category: "core" | "default-lib" | "external-lib"
}

/**
 * Generate node library documentation for LLM context
 */
export function generateNodeLibraryContext(nodes: INode[]): string {
  const nodeDescriptions = nodes.map(node => {
    return `
### ${node.title} (${node.name})
**Category**: ${node.category || "external-lib"}
**Type**: ${node.nodeType}
**Description**: ${node.description}
**Is Structural**: ${node.isStructural ? "Yes - defines control flow" : "No - executes actions"}

**Properties Schema**:
${JSON.stringify(node.properties._def, null, 2)}

**Custom Outputs**: ${node.customOutputs ? JSON.stringify(node.customOutputs) : "Standard single output"}
**Custom Inputs**: ${node.customInputs ? JSON.stringify(node.customInputs) : "Standard single input"}
`
  }).join("\n")

  return `# Available Nodes Library

You have access to the following nodes to build workflows:

${nodeDescriptions}

## Important Guidelines:
1. **Trigger nodes** must be the entry point (nodeType: "trigger")
2. **Structural nodes** (isStructural: true) define control flow (if, switch, for, merge)
3. **Action nodes** perform actual operations (HTTP requests, code execution, etc.)
4. Each node must have a unique ID (use format: "node-{type}-{index}")
5. Edges connect nodes: { source: "node-id", target: "node-id", sourceHandle?: "handle-id", targetHandle?: "handle-id" }
6. For structural nodes with customOutputs, use sourceHandle to specify which branch
`
}

/**
 * System prompt for workflow generation
 */
export const SYSTEM_PROMPT = `You are an expert workflow automation assistant for Ezzy Cloud platform.

Your role is to help users create, edit, and understand workflow automations by:
1. Understanding their natural language requirements
2. Designing optimal workflow structures
3. Selecting appropriate nodes from the available library
4. Generating valid workflow JSON with nodes and edges
5. Explaining workflow logic clearly

## Workflow JSON Format:
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "node-type-name",
      "position": { "x": number, "y": number },
      "data": {
        "nodeTypeData": { /* node definition */ },
        "properties": { /* user-configured values */ }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-unique-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "sourceHandle": "optional-handle-id",
      "targetHandle": "optional-handle-id"
    }
  ]
}

## Node Positioning:
- Start trigger node at (100, 100)
- Space nodes horizontally by 300px
- Space nodes vertically by 150px
- For structural nodes (if/switch), position branches vertically

## Best Practices:
- Always start with a trigger node
- Use structural nodes (if, switch, for) for logic
- Use action nodes (http-request, code) for operations
- Keep workflows simple and readable
- Add descriptive node IDs
- Validate property values match schemas

When generating workflows, respond with valid JSON only. When explaining, be clear and concise.`

/**
 * Prompt for generating a new workflow from description
 */
export function generateWorkflowPrompt(
  description: string,
  nodeLibrary: string
): string {
  return `${nodeLibrary}

## User Request:
"${description}"

## Task:
Generate a complete workflow that fulfills this requirement. Return ONLY valid JSON with "nodes" and "edges" arrays.

Remember:
1. Include a trigger node as entry point
2. Use appropriate structural nodes for logic
3. Use action nodes for operations
4. Set realistic property values
5. Position nodes for good visual layout
6. Include all required properties based on schemas

Return the workflow JSON now:`
}

/**
 * Prompt for editing an existing workflow
 */
export function editWorkflowPrompt(
  currentWorkflow: { nodes: any[]; edges: any[] },
  editInstruction: string,
  nodeLibrary: string
): string {
  return `${nodeLibrary}

## Current Workflow:
${JSON.stringify(currentWorkflow, null, 2)}

## Edit Instruction:
"${editInstruction}"

## Task:
Modify the workflow according to the instruction. Return ONLY the complete updated workflow JSON with "nodes" and "edges" arrays.

Preserve existing node IDs and positions where possible. Only change what's necessary for the edit.

Return the updated workflow JSON now:`
}

/**
 * Prompt for explaining a workflow
 */
export function explainWorkflowPrompt(
  workflow: { nodes: any[]; edges: any[] }
): string {
  return `Explain this workflow in clear, user-friendly language:

${JSON.stringify(workflow, null, 2)}

Provide:
1. High-level overview (1-2 sentences)
2. Step-by-step breakdown of the flow
3. Key decision points (if/switch nodes)
4. Expected outputs

Keep it concise and non-technical.`
}

/**
 * Prompt for suggesting improvements
 */
export function suggestImprovementsPrompt(
  workflow: { nodes: any[]; edges: any[] },
  nodeLibrary: string
): string {
  return `${nodeLibrary}

## Current Workflow:
${JSON.stringify(workflow, null, 2)}

## Task:
Analyze this workflow and suggest improvements. Consider:
1. Error handling (missing try-catch patterns)
2. Performance optimizations (parallel execution)
3. Best practices (proper node usage)
4. Missing validations
5. Security concerns

Provide 3-5 specific, actionable suggestions with:
- What to improve
- Why it matters
- How to implement it

Be concise and practical.`
}
