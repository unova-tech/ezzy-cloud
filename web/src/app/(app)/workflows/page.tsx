"use client"

import { Copy, MoreVertical, PlayIcon, PlusIcon, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useCloneWorkflow, useDeleteWorkflow, useWorkflows } from "@/hooks/use-workflows"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const { data: workflows, isLoading, error } = useWorkflows()
  
  // State for delete confirmation dialog
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null)
  
  // Initialize mutation hooks
  const deleteWorkflow = useDeleteWorkflow()
  const cloneWorkflow = useCloneWorkflow()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <Link href="/workflows/new">
          <Button size="lg">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          Failed to load workflows. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static list
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows && workflows.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/workflows/${workflow.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{workflow.name}</CardTitle>
                  {workflow.isPublished && (
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                      Published
                    </span>
                  )}
                </div>
                <CardDescription>
                  {workflow.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Workflow actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        cloneWorkflow.mutate(
                          { id: workflow.id },
                          {
                            onSuccess: () => {
                              toast.success("Workflow cloned successfully")
                            },
                            onError: (error) => {
                              toast.error(error.message || "Failed to clone workflow")
                            }
                          }
                        )
                      }}
                      disabled={cloneWorkflow.isPending}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Clone
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteWorkflowId(workflow.id)
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                    {workflow.isPublished && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            toast.info("Run functionality coming soon")
                          }}
                        >
                          <PlayIcon className="mr-2 h-4 w-4" />
                          Run
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              You haven't created any workflows yet.
            </p>
            <Link href="/workflows/new">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Your First Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteWorkflowId !== null} onOpenChange={(open) => !open && setDeleteWorkflowId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteWorkflowId(null)}
              disabled={deleteWorkflow.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteWorkflowId) return
                deleteWorkflow.mutate(
                  { id: deleteWorkflowId },
                  {
                    onSuccess: () => {
                      toast.success("Workflow deleted successfully")
                      setDeleteWorkflowId(null)
                    },
                    onError: (error) => {
                      toast.error(error.message || "Failed to delete workflow")
                    }
                  }
                )
              }}
              disabled={deleteWorkflow.isPending}
            >
              {deleteWorkflow.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}