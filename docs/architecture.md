# Ezzy Cloud Architecture

## Overview

Ezzy Cloud is a visual workflow automation platform that compiles visual flow diagrams into executable JavaScript code deployed as Cloudflare Workers.

## System Components

### 1. Frontend (Next.js)

Located in `/web`, the frontend provides:
- **Visual Editor**: ReactFlow-based workflow designer
- **Node Palette**: Organized by category (Core, Default Library, External Library)
- **Node Configuration**: Dynamic forms generated from Zod schemas
- **Real-time Validation**: Visual feedback for invalid node configurations
- **Workflow Management**: Save, compile, and publish workflows

### 2. Backend (Elysia)

Located in `/backend`, provides API endpoints:

#### Workflow APIs (`/api/workflows`)
- `GET /` - List user workflows
- `GET /:id` - Get specific workflow
- `POST /` - Create new workflow
- `PUT /:id` - Update workflow
- `DELETE /:id` - Delete workflow
- `POST /:id/compile` - Compile workflow to JavaScript
- `POST /:id/validate` - Validate workflow without compiling
- `POST /:id/publish` - Compile and mark as published
- `GET /:id/executions` - Get execution history

#### Secrets APIs (`/api/workflows/:workflowId/secrets`)
- `GET /` - List secret keys (values encrypted)
- `POST /` - Create/update secret
- `DELETE /:secretId` - Delete secret
- `GET /decrypted` - Get decrypted secrets (internal use)

### 3. Node System

Three-tier architecture for extensibility:

#### Core Nodes (`web/src/lib/core-nodes/`)
- **Purpose**: Define workflow structure and control flow
- **Characteristics**: 
  - `isStructural: true`
  - `category: "core"`
  - No runtime execution code
  - Custom input/output handles for branching
- **Examples**: If, Switch, For, Merge, Trigger

#### Default Library (`nodes/*/`)
- **Purpose**: Built-in executable actions
- **Characteristics**:
  - `category: "default-lib"`
  - Include runtime execution handlers
  - Standard npm package structure
- **Examples**: HTTP Request, Code execution

#### External Library (Community)
- **Purpose**: Community-contributed integrations
- **Characteristics**:
  - `category: "external-lib"`
  - Installable via npm/package manager
  - Same interface as default lib

### 4. Compilation Pipeline

#### GraphAnalyzer (`backend/lib/graph-analyzer.ts`)
Analyzes ReactFlow graph structure:
- Validates entry point (trigger node)
- Detects cycles and loops
- Calculates execution depth
- Identifies structural nodes
- Performs topological sort for execution order

#### CodeGenerator (`backend/lib/code-generator.ts`)
Generates JavaScript from analyzed graph:
- Imports required node runtimes
- Creates Cloudflare Worker handler
- Translates structural nodes to control flow (if/switch/for)
- Generates execution code for action nodes
- Handles context and variable scoping

#### WorkflowCompiler (`backend/lib/workflow-compiler.ts`)
Orchestrates compilation process:
- Validates workflow structure
- Runs GraphAnalyzer
- Runs CodeGenerator
- Returns compiled code or error messages
- Provides compilation warnings

### 5. Runtime Package (`runtime/`)

Shared utilities for compiled Workers:

#### Context Management
```typescript
interface Context {
  variables: Map<string, unknown>
  stepResults: Map<string, unknown>
}
```
- Variable scoping across workflow steps
- Access to previous step results
- Expression evaluation with controlled scope

#### Logger
```typescript
class Logger {
  info(message: string, data?: any): void
  error(message: string, error?: any): void
  debug(message: string, data?: any): void
  warn(message: string, data?: any): void
  getLogs(): LogEntry[]
}
```
- Structured logging
- Execution tracing
- Debug information capture

### 6. Database Schema (Drizzle ORM)

#### workflows
- Stores workflow definitions (nodes, edges)
- Tracks compilation status (compiledCode)
- Versioning and publish state

#### workflowSecrets
- Encrypted secret values (AES-256-GCM)
- Per-workflow secret management
- Automatic cascading delete

#### workflowExecutions
- Execution history
- Input/output capture
- Error tracking
- Log storage

### 7. Security

#### SecretsManager (`backend/lib/secrets-manager.ts`)
- AES-256-GCM encryption
- Per-secret salt and IV
- Master key from environment variable
- Secure secret storage and retrieval

## Data Flow

### Workflow Creation
1. User drags nodes onto canvas
2. Connects nodes via handles
3. Configures node properties via dynamic forms
4. Real-time validation with Zod schemas
5. Saves workflow to database

### Compilation
1. User clicks "Compile" button
2. Frontend sends workflow to `/api/workflows/:id/compile`
3. GraphAnalyzer validates structure
4. CodeGenerator produces JavaScript
5. Compiled code stored in database
6. User can download or deploy to Cloudflare Workers

### Execution
1. HTTP request triggers Cloudflare Worker
2. Worker parses input JSON
3. Loads secrets from environment
4. Executes nodes in dependency order
5. Structural nodes control flow (if/for/switch)
6. Action nodes perform operations
7. Context maintains state across steps
8. Returns result with logs

## Node Interface

All nodes implement `INode`:

```typescript
interface INode {
  name: string
  title: string
  description: string
  icon: LucideIcon
  nodeType: "trigger" | "action"
  properties: z.ZodObject<any>
  result: z.ZodObject<any>
  customOutputs?: Array<{ id: string; label: string; type?: "control" | "data" }>
  customInputs?: Array<{ id: string; label: string; type?: "control" | "data" }>
  category?: "core" | "default-lib" | "external-lib"
  isStructural?: boolean
}
```

## Extension Points

### Creating Custom Nodes

#### 1. Create Node Package
```
nodes/my-node/
├── definition.ts     # Node metadata and schema
├── runtime.ts        # Execution handler (optional for structural)
├── package.json      # npm package definition
└── index.ts          # Exports
```

#### 2. Define Node
```typescript
// definition.ts
import { z } from "zod"
import { SiMyService } from "@icons-pack/react-simple-icons"

const MyNode: INode = {
  name: "my-node",
  title: "My Custom Node",
  description: "Does something amazing",
  icon: SiMyService,
  nodeType: "action",
  category: "default-lib",
  properties: z.object({
    apiKey: z.string().meta({ field: "password" }),
    endpoint: z.string().url()
  }),
  result: z.object({
    success: z.boolean(),
    data: z.any()
  })
}
```

#### 3. Implement Runtime (for executable nodes)
```typescript
// runtime.ts
export default async function execute(props: Props, secrets: Secrets) {
  // Perform action
  const result = await fetch(props.endpoint, {
    headers: { Authorization: `Bearer ${props.apiKey}` }
  })
  
  return {
    success: true,
    data: await result.json()
  }
}
```

#### 4. Register Node
Add to aggregator package or create new external package.

## Deployment

### Cloudflare Workers
Compiled workflows are designed for Cloudflare Workers:
- Lightweight runtime
- Global edge distribution
- Automatic scaling
- Environment variable secrets

### Database Migrations
```bash
cd backend
bun drizzle-kit generate
bun drizzle-kit migrate
```

## Development

### Prerequisites
- Bun (package manager)
- PostgreSQL
- Node.js 20+

### Setup
```bash
bun install
bun run dev
```

### Environment Variables
```
# Database
DATABASE_URL=postgresql://...

# Secrets encryption
SECRETS_MASTER_KEY=<64-char-hex-string>

# API keys (example)
RESEND_API_KEY=...
```

## Future Enhancements

### Planned Features
- [ ] Visual debugging with step-through execution
- [ ] Workflow templates marketplace
- [ ] Real-time collaboration
- [ ] Version control and rollback
- [ ] A/B testing for workflows
- [ ] Analytics and monitoring
- [ ] Webhook triggers
- [ ] Scheduled executions
- [ ] Error handling nodes (try/catch)
- [ ] Parallel execution branches

### Performance Optimizations
- [ ] Workflow caching
- [ ] Incremental compilation
- [ ] Code splitting for large workflows
- [ ] Edge caching for static results

## Testing

### Unit Tests
- GraphAnalyzer validation logic
- CodeGenerator output verification
- Node schema validation

### Integration Tests
- End-to-end workflow compilation
- API endpoint testing
- Database operations

### Example Test
```typescript
describe("WorkflowCompiler", () => {
  it("compiles simple workflow", async () => {
    const nodes = [/* ... */]
    const edges = [/* ... */]
    
    const compiler = new WorkflowCompiler()
    const result = await compiler.compile(nodes, edges)
    
    expect(result.success).toBe(true)
    expect(result.code).toContain("export default")
  })
})
```

## Troubleshooting

### Common Issues

#### Compilation Errors
- Check for disconnected nodes
- Verify all required properties are set
- Ensure trigger node exists
- Validate node schemas

#### Runtime Errors
- Check secret values are set
- Verify API endpoints are accessible
- Review execution logs
- Check context variable names

#### Performance Issues
- Monitor execution time per node
- Optimize HTTP request batching
- Review loop iterations
- Check for cycles in workflow

## Contributing

See individual packages for specific contribution guidelines:
- Frontend: `/web/README.md`
- Backend: `/backend/README.md`
- Nodes: `/nodes/README.md`
- Runtime: `/runtime/README.md`
