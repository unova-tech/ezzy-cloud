import type { Edge, Node } from "@xyflow/react"
import { and, desc, eq } from "drizzle-orm"
import { Elysia, t } from "elysia"
import { authMacroPlugin } from "../../better-auth"
import db from "../../database"
import { workflowExecutions, workflows } from "../../database/schema"
import { WorkflowCompiler } from "../../lib/workflow-compiler"
import { buildWinterJSDeployment } from "./build-winterjs"

export const workflowsModule = new Elysia({ prefix: "/workflows" })
  .use(authMacroPlugin)
  // List all workflows for a user
  .get(
    "/",
    async ({ user }) => {
      const userWorkflows = await db
        .select()
        .from(workflows)
        .where(eq(workflows.userId, user.id))
        .orderBy(desc(workflows.updatedAt))

      return {
        success: true,
        workflows: userWorkflows
      }
    },
    {
      auth: true
    }
  )

  // Compile workflow without saving (for testing/preview)
  .post(
    "/compile",
    async ({ body }) => {
      const { nodes: workflowNodes, edges: workflowEdges } = body

      const compiler = new WorkflowCompiler()
      const result = await compiler.compile(
        workflowNodes as Node[],
        workflowEdges as Edge[]
      )

      return result
    },
    {
      body: t.Object({
        nodes: t.Array(t.Any()),
        edges: t.Array(t.Any())
      }),
      auth: true
    }
  )

  // Get a single workflow
  .get(
    "/:id",
    async ({ params, user }) => {
      const { id } = params

      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      return {
        success: true,
        workflow: workflow[0]
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Create a new workflow
  .post(
    "/",
    async ({ body, user }) => {
      const { name, description, nodes, edges } = body

      const newWorkflow = await db
        .insert(workflows)
        .values({
          userId: user.id,
          name,
          description,
          nodes,
          edges
        })
        .returning()

      return {
        success: true,
        workflow: newWorkflow[0]
      }
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
        nodes: t.Array(t.Any()),
        edges: t.Array(t.Any())
      }),
      auth: true
    }
  )

  // Update a workflow
  .put(
    "/:id",
    async ({ params, body, user }) => {
      const { id } = params
      const { name, description, nodes, edges } = body

      const updated = await db
        .update(workflows)
        .set({
          name,
          description,
          nodes,
          edges,
          updatedAt: new Date()
        })
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .returning()

      if (updated.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      return {
        success: true,
        workflow: updated[0]
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        nodes: t.Optional(t.Array(t.Any())),
        edges: t.Optional(t.Array(t.Any()))
      }),
      auth: true
    }
  )

  // Delete a workflow
  .delete(
    "/:id",
    async ({ params, user }) => {
      const { id } = params

      const deleted = await db
        .delete(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .returning()

      if (deleted.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      return {
        success: true,
        workflow: deleted[0]
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Clone a workflow
  .post(
    "/:id/clone",
    async ({ params, user }) => {
      const { id } = params

      // Query the source workflow and verify ownership
      const sourceWorkflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (sourceWorkflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      // Extract the source workflow data
      const source = sourceWorkflow[0]
      if (!source) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      // Create the cloned workflow name
      const clonedName = `${source.name} (Copy)`

      // Deep-copy nodes and edges to prevent unintended mutation
      const clonedNodes = JSON.parse(JSON.stringify(source.nodes))
      const clonedEdges = JSON.parse(JSON.stringify(source.edges))

      // Insert new workflow record
      const clonedWorkflow = await db
        .insert(workflows)
        .values({
          userId: user.id,
          name: clonedName,
          description: source.description,
          nodes: clonedNodes,
          edges: clonedEdges,
          compiledCode: null,
          isPublished: false
        })
        .returning()

      return {
        success: true,
        workflow: clonedWorkflow[0]
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Compile a workflow
  .post(
    "/:id/compile",
    async ({ params, user }) => {
      const { id } = params

      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const workflowData = workflow[0]
      if (!workflowData) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const compiler = new WorkflowCompiler()
      const result = await compiler.compile(
        workflowData.nodes as Node[],
        workflowData.edges as Edge[]
      )

      if (!result.success) {
        return result
      }

      // Save compiled code
      await db
        .update(workflows)
        .set({
          compiledCode: result.code,
          updatedAt: new Date()
        })
        .where(eq(workflows.id, id))

      return result
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Validate a workflow without compiling
  .post(
    "/:id/validate",
    async ({ params, user }) => {
      const { id } = params

      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const workflowData = workflow[0]
      if (!workflowData) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const compiler = new WorkflowCompiler()
      const result = await compiler.validate(
        workflowData.nodes as Node[],
        workflowData.edges as Edge[]
      )

      return result
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Publish a workflow
  .post(
    "/:id/publish",
    async ({ params, user }) => {
      const { id } = params

      // First compile the workflow
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const workflowData = workflow[0]
      if (!workflowData) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const compiler = new WorkflowCompiler()
      const result = await compiler.compile(
        workflowData.nodes as Node[],
        workflowData.edges as Edge[]
      )

      if (!result.success) {
        return {
          success: false,
          error: "Cannot publish workflow with compilation errors",
          compilationResult: result
        }
      }

      // Update workflow
      const updated = await db
        .update(workflows)
        .set({
          compiledCode: result.code,
          isPublished: true,
          updatedAt: new Date()
        })
        .where(eq(workflows.id, id))
        .returning()

      return {
        success: true,
        workflow: updated[0]
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Get workflow executions
  .get(
    "/:id/executions",
    async ({ params, user }) => {
      const { id } = params

      // Verify workflow ownership
      const workflow = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflow.length === 0) {
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, id))
        .orderBy(desc(workflowExecutions.startedAt))

      return {
        success: true,
        executions
      }
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )

  // Build WinterJS deployment package
  .post(
    "/:id/build-winterjs",
    async ({ params, user, set }) => {
      const { id } = params

      console.log(`[API] Build request for workflow: ${id}`)

      // 1. Fetch and validate workflow
      const workflowData = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, id), eq(workflows.userId, user.id)))
        .limit(1)

      if (workflowData.length === 0) {
        set.status = 404
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      const workflow = workflowData[0]
      if (!workflow) {
        set.status = 404
        return {
          success: false,
          error: "Workflow not found"
        }
      }

      // 2. Build deployment package
      const buildResult = await buildWinterJSDeployment({
        workflow: {
          id: workflow.id,
          name: workflow.name,
          version: workflow.version,
          nodes: workflow.nodes as Node[],
          edges: workflow.edges as Edge[]
        }
      })

      if (!buildResult.success || !buildResult.archiveBuffer) {
        set.status = 400
        return {
          success: false,
          error: buildResult.error || 'Build failed'
        }
      }

      // 3. Sanitize workflow name for filename
      const sanitizedName = workflow.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50)

      const timestamp = Date.now()
      const filename = `workflow-${sanitizedName}-${timestamp}.tar.gz`

      // 4. Set response headers
      set.headers['Content-Type'] = 'application/gzip'
      set.headers['Content-Disposition'] = `attachment; filename="${filename}"`
      set.headers['X-Workflow-Id'] = workflow.id
      set.headers['X-Workflow-Name'] = workflow.name
      set.headers['X-Workflow-Version'] = buildResult.metadata!.version.toString()
      set.headers['X-Bundle-Size'] = buildResult.metadata!.bundleSize.toString()
      set.headers['X-Archive-Size'] = buildResult.metadata!.archiveSize.toString()
      set.headers['X-Build-Timestamp'] = buildResult.metadata!.buildTimestamp
      set.headers['X-Environment-Variables'] = JSON.stringify(buildResult.metadata!.environmentVariables)

      console.log(`[API] Build completed successfully for workflow: ${id}`)
      console.log(`[API] Archive size: ${buildResult.metadata!.archiveSize} bytes`)

      // 5. Return archive buffer
      return buildResult.archiveBuffer
    },
    {
      params: t.Object({
        id: t.String()
      }),
      auth: true
    }
  )