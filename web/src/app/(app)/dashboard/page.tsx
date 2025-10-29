"use client"

import { useQuery } from "@tanstack/react-query"
import { PlayIcon, PlusIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"

interface Workflow {
  id: string
  name: string
  description: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await fetch("/api/workflows", {
    credentials: "include"
  })
  if (!response.ok) {
    throw new Error("Failed to fetch workflows")
  }
  const data = await response.json()
  return data.workflows
}

export default function DashboardPage() {
  const { user } = useAuth()

  const {
    data: workflows,
    isLoading,
    error
  } = useQuery({
    queryKey: ["workflows"],
    queryFn: fetchWorkflows
  })

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
              className="hover:shadow-lg transition-shadow"
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
              <CardContent className="flex gap-2">
                <Link href={`/workflows/${workflow.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                {workflow.isPublished && (
                  <Button variant="default" size="icon" title="Run workflow">
                    <PlayIcon className="h-4 w-4" />
                  </Button>
                )}
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
    </div>
  )
}