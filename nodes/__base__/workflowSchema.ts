import { z } from "zod"

const triggerSchema = z.object({
  id: z.uuid().describe("Unique identifier for the trigger"),
  triggerName: z.string().describe("Name of the trigger")
})

const workflowSchema = z.object({
  id: z.uuid().describe("Unique identifier for the workflow"),
  name: z.string().describe("Name of the workflow"),
  description: z.string().optional().describe("Description of the workflow")
})
