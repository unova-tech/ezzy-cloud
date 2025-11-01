import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Edge, Node } from "@xyflow/react"
import localHttpClient from "@/lib/localHttpClient"

// Query Key Factory
export const workflowKeys = {
  all: () => ["workflows"] as const,
  list: () => [...workflowKeys.all(), "list"] as const,
  details: () => [...workflowKeys.all(), "detail"] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const
}

// Error handling helper - extracts error message from Eden error response
function extractEdenError(error: unknown, defaultMessage: string): string {
  // Check for error.value shape (discriminated union from Eden)
  if (error && typeof error === "object" && "value" in error) {
    const value = (error as { value: unknown }).value
    // Try to extract from common error shapes
    if (value && typeof value === "object") {
      if ("error" in value && typeof value.error === "string") {
        return value.error
      }
      if ("message" in value && typeof value.message === "string") {
        return value.message
      }
    }
  }
  return defaultMessage
}

// Response handler - ensures data is present and typed correctly
function handleEdenResponse<T>(
  response: { data?: T | null; error?: unknown },
  defaultMessage: string
): T {
  const { data, error } = response

  if (error) {
    const errorMessage = extractEdenError(error, defaultMessage)
    throw new Error(errorMessage)
  }

  if (!data) {
    throw new Error(defaultMessage)
  }

  if (typeof data === "object" && "success" in data && !data.success) {
    const errorMessage = (data as { error?: string }).error || defaultMessage
    throw new Error(errorMessage)
  }

  return data
}

// Workflow type matching backend schema
type WorkflowData = {
  id: string
  userId: string
  name: string
  description: string | null
  nodes: Node[]
  edges: Edge[]
  compiledCode: string | null
  isPublished: boolean
  version: number
  createdAt: Date
  updatedAt: Date
}

// Hook: useWorkflows - Query to list all workflows
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.list(),
    queryFn: async () => {
      const response = await localHttpClient.workflows.get()
      const data = handleEdenResponse<{
        success: boolean
        workflows: WorkflowData[]
      }>(response, "Failed to fetch workflows")
      return data.workflows
    }
  })
}

// Hook: useWorkflow - Query to fetch a specific workflow
export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: async () => {
      const response = await localHttpClient.workflows({ id }).get()
      const data = handleEdenResponse(
        response as {
          data?:
            | { success: true; workflow: WorkflowData }
            | { success: false; error: string }
            | null
          error?: unknown
        },
        "Failed to load workflow"
      )

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.workflow
    },
    enabled: !!id && id !== "new"
  })
}

// Discriminated union for save workflow parameters
type SaveWorkflowCreate = {
  name: string
  description?: string
  nodes: Node[]
  edges: Edge[]
}

type SaveWorkflowUpdate = {
  id: string
  name?: string
  description?: string
  nodes?: Node[]
  edges?: Edge[]
}

type SaveWorkflowParams = SaveWorkflowCreate | SaveWorkflowUpdate

// Context type for optimistic updates
type SaveWorkflowContext = {
  previousList?: WorkflowData[]
  previousDetail?: WorkflowData
}

// Hook: useSaveWorkflow - Mutation to create or update a workflow with optimistic updates
export function useSaveWorkflow() {
  const queryClient = useQueryClient()

  return useMutation<
    WorkflowData,
    Error,
    SaveWorkflowParams,
    SaveWorkflowContext
  >({
    mutationFn: async (params: SaveWorkflowParams) => {
      // Branch based on discriminated union
      if ("id" in params) {
        // Update existing workflow - construct payload with only present fields
        const payloadUpdate: {
          name?: string
          description?: string
          nodes?: Node[]
          edges?: Edge[]
        } = {}

        if (params.name !== undefined) payloadUpdate.name = params.name
        if (params.description !== undefined)
          payloadUpdate.description = params.description
        if (params.nodes !== undefined) payloadUpdate.nodes = params.nodes
        if (params.edges !== undefined) payloadUpdate.edges = params.edges

        const response = await localHttpClient
          .workflows({ id: params.id })
          .put(payloadUpdate)
        const data = handleEdenResponse(
          response as {
            data?:
              | { success: true; workflow: WorkflowData }
              | { success: false; error: string }
              | null
            error?: unknown
          },
          "Failed to update workflow"
        )

        if (!data.success) {
          throw new Error(data.error)
        }

        return data.workflow
      } else {
        // Create new workflow - all fields are required
        const payloadCreate: {
          name: string
          description?: string
          nodes: Node[]
          edges: Edge[]
        } = {
          name: params.name,
          nodes: params.nodes,
          edges: params.edges
        }

        if (params.description !== undefined) {
          payloadCreate.description = params.description
        }

        const response = await localHttpClient.workflows.post(payloadCreate)
        const data = handleEdenResponse<{
          success: boolean
          workflow: WorkflowData
        }>(response, "Failed to create workflow")
        return data.workflow
      }
    },
    onMutate: async (params: SaveWorkflowParams) => {
      // Cancel outgoing queries for workflows
      await queryClient.cancelQueries({ queryKey: workflowKeys.list() })

      // Cancel detail query if updating
      if ("id" in params) {
        await queryClient.cancelQueries({
          queryKey: workflowKeys.detail(params.id)
        })
      }

      // Snapshot previous values
      const previousList = queryClient.getQueryData<WorkflowData[]>(
        workflowKeys.list()
      )
      const previousDetail =
        "id" in params
          ? queryClient.getQueryData<WorkflowData>(
              workflowKeys.detail(params.id)
            )
          : undefined

      // Optimistically update list cache
      if ("id" in params) {
        // Update existing workflow in list
        queryClient.setQueryData<WorkflowData[]>(
          workflowKeys.list(),
          (old: WorkflowData[] | undefined) => {
            if (!old) return old
            return old.map((workflow: WorkflowData) =>
              workflow.id === params.id ? { ...workflow, ...params } : workflow
            )
          }
        )

        // Optimistically update detail cache
        queryClient.setQueryData<WorkflowData>(
          workflowKeys.detail(params.id),
          (old: WorkflowData | undefined) => {
            if (!old) return old
            return { ...old, ...params }
          }
        )
      } else {
        // Create new workflow with temporary ID
        const tempId = `temp-${Date.now()}`
        const optimisticWorkflow: WorkflowData = {
          id: tempId,
          userId: "temp-user",
          name: params.name,
          description: params.description || null,
          nodes: params.nodes,
          edges: params.edges,
          compiledCode: null,
          isPublished: false,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        queryClient.setQueryData<WorkflowData[]>(
          workflowKeys.list(),
          (old: WorkflowData[] | undefined) => {
            if (!old) return [optimisticWorkflow]
            return [...old, optimisticWorkflow]
          }
        )
      }

      // Return context with snapshots
      return { previousList, previousDetail }
    },
    onError: (
      _error: Error,
      params: SaveWorkflowParams,
      context: SaveWorkflowContext | undefined
    ) => {
      // Restore previous cache on error
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(workflowKeys.list(), context.previousList)
      }

      if (context?.previousDetail !== undefined && "id" in params) {
        queryClient.setQueryData(
          workflowKeys.detail(params.id),
          context.previousDetail
        )
      }
    },
    onSuccess: () => {
      // Invalidate all workflows cache hierarchy to fetch server truth
      queryClient.invalidateQueries({ queryKey: workflowKeys.all() })
    }
  })
}

// Hook: useCompileWorkflow - Mutation to compile a workflow
export function useCompileWorkflow() {
  return useMutation({
    mutationFn: async (params: { nodes: Node[]; edges: Edge[] }) => {
      const response = await localHttpClient.workflows.compile.post(params)

      // Only throw on transport errors, return full result including success: false
      if (response.error) {
        const errorMessage = extractEdenError(
          response.error,
          "Failed to compile workflow"
        )
        throw new Error(errorMessage)
      }

      // Return full compilation result (success, code, warnings, metadata, error)
      return response.data
    }
    // No cache invalidation needed as this is a read-only operation
  })
}

// Delete workflow parameters and context types
type DeleteWorkflowParams = {
  id: string
}

type DeleteWorkflowContext = {
  previousList?: WorkflowData[]
  previousDetail?: WorkflowData
}

// Hook: useDeleteWorkflow - Mutation to delete a workflow with optimistic updates
export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation<
    WorkflowData,
    Error,
    DeleteWorkflowParams,
    DeleteWorkflowContext
  >({
    mutationFn: async (params: DeleteWorkflowParams) => {
      const response = await localHttpClient
        .workflows({ id: params.id })
        .delete()
      const data = handleEdenResponse(
        response as {
          data?:
            | { success: true; workflow: WorkflowData }
            | { success: false; error: string }
            | null
          error?: unknown
        },
        "Failed to delete workflow"
      )

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.workflow
    },
    onMutate: async (params: DeleteWorkflowParams) => {
      // Cancel outgoing queries for both list and detail
      await queryClient.cancelQueries({ queryKey: workflowKeys.list() })
      await queryClient.cancelQueries({
        queryKey: workflowKeys.detail(params.id)
      })

      // Snapshot previous values from cache
      const previousList = queryClient.getQueryData<WorkflowData[]>(
        workflowKeys.list()
      )
      const previousDetail = queryClient.getQueryData<WorkflowData>(
        workflowKeys.detail(params.id)
      )

      // Optimistically remove the workflow from list cache
      queryClient.setQueryData<WorkflowData[]>(
        workflowKeys.list(),
        (old: WorkflowData[] | undefined) => {
          if (!old) return old
          return old.filter((w: WorkflowData) => w.id !== params.id)
        }
      )

      // Return context object with snapshots
      return { previousList, previousDetail }
    },
    onError: (
      _error: Error,
      _params: DeleteWorkflowParams,
      context: DeleteWorkflowContext | undefined
    ) => {
      // Restore previous cache on error
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(workflowKeys.list(), context.previousList)
      }

      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(
          workflowKeys.detail(_params.id),
          context.previousDetail
        )
      }
    },
    onSuccess: () => {
      // Invalidate all workflows cache hierarchy to fetch server truth
      queryClient.invalidateQueries({ queryKey: workflowKeys.all() })
    }
  })
}

// Clone workflow parameters and context types
type CloneWorkflowParams = {
  id: string
}

type CloneWorkflowContext = {
  previousList?: WorkflowData[]
  tempId?: string
}

// Hook: useCloneWorkflow - Mutation to clone a workflow with optimistic updates
export function useCloneWorkflow() {
  const queryClient = useQueryClient()

  return useMutation<
    WorkflowData,
    Error,
    CloneWorkflowParams,
    CloneWorkflowContext
  >({
    mutationFn: async (params: CloneWorkflowParams) => {
      const response = await localHttpClient
        .workflows({ id: params.id })
        .clone.post()
      const data = handleEdenResponse(
        response as {
          data?:
            | { success: true; workflow: WorkflowData }
            | { success: false; error: string }
            | null
          error?: unknown
        },
        "Failed to clone workflow"
      )

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.workflow
    },
    onMutate: async (params: CloneWorkflowParams) => {
      // Cancel outgoing queries for list
      await queryClient.cancelQueries({ queryKey: workflowKeys.list() })

      // Snapshot previous list value from cache
      const previousList = queryClient.getQueryData<WorkflowData[]>(
        workflowKeys.list()
      )

      // Generate temporary ID
      const tempId = `temp-clone-${Date.now()}`

      // Fetch the source workflow from detail cache
      let sourceWorkflow = queryClient.getQueryData<WorkflowData>(
        workflowKeys.detail(params.id)
      )

      // If source workflow is not in detail cache, try to find it in list cache
      if (!sourceWorkflow && previousList) {
        sourceWorkflow = previousList.find((w) => w.id === params.id)
      }

      // Build optimistic cloned workflow
      let optimisticWorkflow: WorkflowData

      if (sourceWorkflow) {
        // Source found - create full optimistic clone
        optimisticWorkflow = {
          id: tempId,
          userId: sourceWorkflow.userId,
          name: `${sourceWorkflow.name} (Copy)`,
          description: sourceWorkflow.description,
          nodes: sourceWorkflow.nodes,
          edges: sourceWorkflow.edges,
          compiledCode: null,
          isPublished: false,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } else {
        // Source not found in cache - create minimal optimistic workflow
        optimisticWorkflow = {
          id: tempId,
          userId: "temp-user",
          name: "Workflow (Copy)",
          description: null,
          nodes: [],
          edges: [],
          compiledCode: null,
          isPublished: false,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }

      // Add optimistic workflow to list cache (prepend to show at top)
      queryClient.setQueryData<WorkflowData[]>(
        workflowKeys.list(),
        (old: WorkflowData[] | undefined) => {
          return [optimisticWorkflow, ...(old || [])]
        }
      )

      // Return context object with snapshots
      return { previousList, tempId }
    },
    onError: (
      _error: Error,
      _params: CloneWorkflowParams,
      context: CloneWorkflowContext | undefined
    ) => {
      // Restore previous cache on error
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(workflowKeys.list(), context.previousList)
      }
    },
    onSuccess: () => {
      // Invalidate all workflows cache hierarchy to fetch server truth
      queryClient.invalidateQueries({ queryKey: workflowKeys.all() })
    }
  })
}
