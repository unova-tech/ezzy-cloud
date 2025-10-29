# Node Development Guide

## Overview

Nodes are the building blocks of Ezzy Cloud workflows. This guide explains how to create custom nodes for the platform.

## Node Types

### 1. Structural Nodes (Core)
Define workflow control flow without runtime execution:
- **Purpose**: Branching, looping, merging
- **Location**: `web/src/lib/core-nodes/`
- **Category**: `"core"`
- **Flag**: `isStructural: true`
- **No Runtime**: No execution handler needed

### 2. Action Nodes (Default/External Library)
Perform actual operations:
- **Purpose**: API calls, data transformation, integrations
- **Location**: `nodes/` (default) or external packages
- **Category**: `"default-lib"` or `"external-lib"`
- **Has Runtime**: Requires execution handler

## Node Structure

### Package Layout
```
nodes/my-integration/
├── definition.ts      # Node metadata, schema, UI config
├── runtime.ts         # Execution handler (action nodes only)
├── package.json       # npm package definition
├── README.md          # Documentation
└── index.ts           # Exports
```

### Package.json
```json
{
  "name": "nodes-my-integration",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": "./index.ts",
    "./runtime": "./runtime.ts"
  },
  "dependencies": {
    "node-base": "workspace:*",
    "zod": "^4.1.12"
  }
}
```

## Creating a Node

### Step 1: Define the Node

```typescript
// definition.ts
import { z } from "zod"
import type { INode } from "node-base"
import { SiGithub } from "@icons-pack/react-simple-icons"

// Define property types
const Props = z.object({
  owner: z.string()
    .min(1)
    .meta({ 
      field: "text",
      title: "Repository Owner",
      description: "GitHub username or organization"
    }),
  repo: z.string()
    .min(1)
    .meta({
      field: "text",
      title: "Repository Name"
    }),
  branch: z.string()
    .default("main")
    .optional()
    .meta({
      field: "text",
      title: "Branch",
      description: "Default: main"
    })
})

export type Props = z.infer<typeof Props>

// Define result types
const Result = z.object({
  stars: z.number(),
  forks: z.number(),
  issues: z.number(),
  updatedAt: z.string()
})

export type Result = z.infer<typeof Result>

// Define the node
export const GitHubRepoNode: INode = {
  name: "github-repo-info",
  title: "GitHub Repository Info",
  description: "Fetch information about a GitHub repository",
  icon: SiGithub,
  nodeType: "action",
  category: "external-lib",
  properties: Props,
  result: Result
}
```

### Step 2: Implement Runtime (Action Nodes Only)

```typescript
// runtime.ts
import type { Props, Result } from "./definition"

type Secrets = Record<string, string>

export default async function execute(
  props: Props,
  secrets: Secrets
): Promise<Result> {
  const { owner, repo, branch = "main" } = props
  
  // Use secrets for authentication
  const token = secrets.GITHUB_TOKEN
  
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        "Authorization": token ? `Bearer ${token}` : undefined,
        "User-Agent": "Ezzy-Cloud"
      }
    }
  )
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  return {
    stars: data.stargazers_count,
    forks: data.forks_count,
    issues: data.open_issues_count,
    updatedAt: data.updated_at
  }
}
```

### Step 3: Export Node

```typescript
// index.ts
import { GitHubRepoNode } from "./definition"

export default {
  secrets: [
    {
      key: "GITHUB_TOKEN",
      description: "GitHub Personal Access Token (optional)",
      required: false
    }
  ],
  nodes: [GitHubRepoNode]
}
```

### Step 4: Add Documentation

```markdown
<!-- README.md -->
# GitHub Repository Info Node

Fetches information about a GitHub repository.

## Properties

- **Repository Owner** (required): GitHub username or organization name
- **Repository Name** (required): Name of the repository
- **Branch** (optional): Branch to query (default: main)

## Secrets

- **GITHUB_TOKEN** (optional): GitHub Personal Access Token for higher rate limits

## Result

Returns:
- `stars`: Number of stars
- `forks`: Number of forks
- `issues`: Number of open issues
- `updatedAt`: Last update timestamp

## Example

Input:
```json
{
  "owner": "facebook",
  "repo": "react"
}
```

Output:
```json
{
  "stars": 220000,
  "forks": 45000,
  "issues": 1234,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```
```

## Zod Schema Best Practices

### Field Types

Use `.meta()` to specify UI field type:

```typescript
// Text input (default)
z.string().meta({ field: "text" })

// Textarea (multiline)
z.string().meta({ field: "textarea" })

// Password input
z.string().meta({ field: "password" })

// Number input
z.number()

// Boolean checkbox
z.boolean()

// Select dropdown
z.enum(["option1", "option2", "option3"])

// Array of strings
z.array(z.string())

// Object with nested properties
z.object({
  nested: z.string()
})
```

### UI Metadata

```typescript
z.string().meta({
  field: "text",
  title: "Display Label",
  description: "Help text shown below the field"
})
```

### Validation

```typescript
// Required field (default)
z.string()

// Optional field
z.string().optional()

// With default value
z.string().default("default value")

// With validation
z.string()
  .min(3, "Must be at least 3 characters")
  .max(100, "Must be less than 100 characters")
  .email("Must be a valid email")
  .url("Must be a valid URL")

// Custom validation
z.string().refine(
  (val) => val.startsWith("https://"),
  "Must be an HTTPS URL"
)
```

### Complex Types

```typescript
// Dynamic array of cases (for Switch node)
z.object({
  cases: z.array(
    z.object({
      value: z.string(),
      label: z.string().optional()
    })
  )
})

// Conditional fields
z.object({
  type: z.enum(["simple", "advanced"]),
  simpleValue: z.string().optional(),
  advancedConfig: z.object({
    // ... complex config
  }).optional()
})
```

## Creating Structural Nodes

Structural nodes define control flow without execution code.

### Example: Parallel Execution Node

```typescript
// web/src/lib/core-nodes/parallel.ts
import { GitBranch } from "lucide-react"
import { z } from "zod"
import type { INode } from "node-base"

const Props = z.object({
  branches: z.number()
    .min(2)
    .max(10)
    .default(2)
    .meta({
      title: "Number of Branches",
      description: "How many parallel branches to execute"
    })
})

const Result = z.object({}) // No result for structural nodes

export const ParallelNode: INode = {
  name: "parallel",
  title: "Parallel",
  description: "Execute multiple branches in parallel",
  icon: GitBranch,
  nodeType: "action",
  category: "core",
  isStructural: true,
  properties: Props,
  result: Result,
  customOutputs: [
    { id: "branch-1", label: "Branch 1", type: "control" },
    { id: "branch-2", label: "Branch 2", type: "control" }
  ],
  customInputs: [
    { id: "input", label: "Input", type: "control" }
  ]
}
```

### Custom Handles

```typescript
// Dynamic outputs based on configuration
customOutputs: Array<{
  id: string        // Unique handle ID
  label: string     // Display label
  type?: "control" | "data"  // Handle type (default: "data")
}>

// Multiple inputs for merge operations
customInputs: Array<{
  id: string
  label: string
  type?: "control" | "data"
}>
```

## Icons

### Using Simple Icons
```typescript
import { SiGithub, SiSlack, SiStripe } from "@icons-pack/react-simple-icons"
```

Browse available icons: https://simpleicons.org/

### Using Lucide Icons
```typescript
import { Mail, Database, Code, Globe } from "lucide-react"
```

Browse available icons: https://lucide.dev/icons/

## Secrets Management

### Defining Required Secrets

```typescript
// index.ts
export default {
  secrets: [
    {
      key: "API_KEY",
      description: "Your API key from the service",
      required: true
    },
    {
      key: "API_SECRET",
      description: "Your API secret (optional for basic tier)",
      required: false
    }
  ],
  nodes: [MyNode]
}
```

### Using Secrets in Runtime

```typescript
export default async function execute(props: Props, secrets: Secrets) {
  const apiKey = secrets.API_KEY
  
  if (!apiKey) {
    throw new Error("API_KEY secret is required")
  }
  
  // Use the secret
  const response = await fetch(props.url, {
    headers: {
      "Authorization": `Bearer ${apiKey}`
    }
  })
  
  return { /* ... */ }
}
```

## Error Handling

### In Runtime Code

```typescript
export default async function execute(props: Props, secrets: Secrets) {
  try {
    const response = await fetch(props.url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    // Errors are automatically caught and logged by the runtime
    throw new Error(`Failed to fetch data: ${error.message}`)
  }
}
```

### Validation Errors

Zod automatically validates properties. Invalid values prevent compilation:

```typescript
const Props = z.object({
  timeout: z.number()
    .min(0, "Timeout must be positive")
    .max(300000, "Timeout must be less than 5 minutes")
})
```

## Testing Your Node

### Unit Test Example

```typescript
// runtime.test.ts
import { describe, it, expect } from "bun:test"
import execute from "./runtime"

describe("GitHubRepoNode", () => {
  it("fetches repository information", async () => {
    const props = {
      owner: "facebook",
      repo: "react"
    }
    
    const result = await execute(props, {})
    
    expect(result.stars).toBeGreaterThan(0)
    expect(result.forks).toBeGreaterThan(0)
    expect(typeof result.updatedAt).toBe("string")
  })
  
  it("throws error for invalid repository", async () => {
    const props = {
      owner: "invalid-owner-12345",
      repo: "invalid-repo-67890"
    }
    
    await expect(execute(props, {})).rejects.toThrow()
  })
})
```

### Integration Test

```typescript
// Test in actual workflow compilation
import { WorkflowCompiler } from "backend/lib/workflow-compiler"

const nodes = [
  {
    id: "trigger-1",
    type: "trigger-manual",
    data: { /* ... */ }
  },
  {
    id: "github-1",
    type: "github-repo-info",
    data: {
      properties: {
        owner: "facebook",
        repo: "react"
      }
    }
  }
]

const edges = [
  { source: "trigger-1", target: "github-1" }
]

const compiler = new WorkflowCompiler()
const result = await compiler.compile(nodes, edges)

expect(result.success).toBe(true)
expect(result.code).toContain("github-repo-info")
```

## Publishing

### As Default Library Node
1. Add to `nodes/` directory
2. Add to `nodes/__core_nodes__/package.json` dependencies
3. Import in `nodes/__core_nodes__/index.ts`

### As External Library
1. Publish to npm: `npm publish`
2. Users install: `bun add nodes-my-integration`
3. Import in their workspace

## Examples

### Simple HTTP Request
See: `nodes/http-request/`

### Code Execution
See: `nodes/code/`

### Control Flow (If)
See: `web/src/lib/core-nodes/if.ts`

### Iteration (For)
See: `web/src/lib/core-nodes/for.ts`

## Common Patterns

### Retry Logic

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error("Max retries exceeded")
}
```

### Batch Processing

```typescript
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }
  
  return results
}
```

### Timeout Handling

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    return await promise
  } finally {
    clearTimeout(timeout)
  }
}
```

## Troubleshooting

### "Node not appearing in palette"
- Check `category` is set correctly
- Verify export in `index.ts`
- Ensure package is listed in dependencies

### "Compilation fails"
- Verify runtime export is default function
- Check Zod schema is valid
- Ensure all required props are defined

### "Runtime errors"
- Add console.log (captured in logs)
- Check secret values are set
- Verify API endpoints are accessible

## Best Practices

1. **Always validate inputs** - Use Zod's built-in validators
2. **Provide helpful descriptions** - Users should understand what each field does
3. **Handle errors gracefully** - Throw descriptive error messages
4. **Document secrets** - Explain where to get API keys
5. **Test thoroughly** - Unit test both success and failure cases
6. **Keep nodes focused** - One node, one responsibility
7. **Use TypeScript** - Get type safety and better DX
8. **Version carefully** - Breaking changes need major version bumps

## Resources

- [Zod Documentation](https://zod.dev/)
- [Simple Icons](https://simpleicons.org/)
- [Lucide Icons](https://lucide.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
