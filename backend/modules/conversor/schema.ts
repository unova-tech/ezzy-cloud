import { z } from "zod"

type BaseStep = {
  type: string
  name: string
}

type ExecuteStep = BaseStep & {
  type: "execute"
  handler: string
  params: { key: string; value?: unknown }[]
}

type IfStep = BaseStep & {
  type: "if"
  condition: string
  thenSteps: Step[]
  elseSteps?: Step[] | null
}

type SwitchStep = BaseStep & {
  type: "switch"
  expression: string
  cases: {
    caseValue: string
    steps: Step[]
  }[]
  defaultSteps?: Step[] | null
}

type ForStep = BaseStep & {
  type: "for"
  iterator: string
  batchSize?: number | null
  bodySteps: Step[]
}

type DoWhileStep = BaseStep & {
  type: "do-while"
  condition: string
  bodySteps: Step[]
}

type ParallelStep = BaseStep & {
  type: "parallel"
  branches: Step[][]
}

type BaseWaitForStep = BaseStep & {
  type: "wait-for"
  waitFor: string
}

type WaitForTimeStep = BaseWaitForStep & {
  waitFor: "time"
  delay: number
}

type WaitForEventStep = BaseWaitForStep & {
  waitFor: "event"
  event: string
  timeout?: number | null
}

type WaitForStep = WaitForTimeStep | WaitForEventStep

type Step =
  | ExecuteStep
  | IfStep
  | SwitchStep
  | ForStep
  | DoWhileStep
  | ParallelStep
  | WaitForStep

const baseStepSchema = z.object({
  name: z.string().min(1).max(100).describe("Name of the step")
})

const executeStepSchema: z.ZodType<ExecuteStep> = baseStepSchema.extend({
  type: z
    .literal("execute")
    .describe("Step type: execute a handler with parameters"),
  handler: z
    .string()
    .min(1)
    .max(100)
    .describe("Name of the handler to execute"),
  params: z
    .array(
      z.object({
        key: z.string().describe("Parameter name"),
        value: z.any().describe("Parameter value")
      })
    )
    .describe("Parameters to pass to the handler")
})

const ifStepSchema: z.ZodType<IfStep> = baseStepSchema.extend({
  type: z.literal("if").describe("Step type: conditional branching"),
  condition: z.string().min(1).describe("Condition expression to evaluate"),
  thenSteps: z
    .array(z.lazy(() => stepSchema))
    .describe("Steps to execute if condition is true"),
  elseSteps: z
    .array(z.lazy(() => stepSchema))
    .optional()
    .nullable()
    .describe("Steps to execute if condition is false (optional)")
})

const switchStepSchema: z.ZodType<SwitchStep> = baseStepSchema.extend({
  type: z.literal("switch").describe("Step type: switch-case branching"),
  expression: z
    .string()
    .min(1)
    .describe("Expression to evaluate for switch cases"),
  cases: z
    .array(
      z.object({
        caseValue: z
          .string()
          .describe("Case value to match against the expression"),
        steps: z
          .array(z.lazy(() => stepSchema))
          .describe("Steps to execute for this case")
      })
    )
    .describe("List of cases with their corresponding steps"),
  defaultSteps: z
    .array(z.lazy(() => stepSchema))
    .optional()
    .nullable()
    .describe("Steps to execute if no case matches (optional)")
})

const forStepSchema: z.ZodType<ForStep> = baseStepSchema.extend({
  type: z.literal("for").describe("Step type: loop iteration"),
  iterator: z
    .string()
    .min(1)
    .describe("Iterator expression (e.g., array or range to loop over)"),
  batchSize: z
    .number()
    .min(1)
    .optional()
    .nullable()
    .describe("Number of items to process per batch (optional)"),
  bodySteps: z
    .array(z.lazy(() => stepSchema))
    .describe("Steps to execute for each iteration")
})

const doWhileStepSchema: z.ZodType<DoWhileStep> = baseStepSchema.extend({
  type: z.literal("do-while").describe("Step type: do-while loop"),
  condition: z
    .string()
    .min(1)
    .describe("Condition expression to evaluate after each iteration"),
  bodySteps: z
    .array(z.lazy(() => stepSchema))
    .describe("Steps to execute in each iteration")
})

const parallelStepSchema: z.ZodType<ParallelStep> = baseStepSchema.extend({
  type: z.literal("parallel").describe("Step type: parallel execution"),
  branches: z
    .array(z.array(z.lazy(() => stepSchema)))
    .describe("Multiple branches of steps to execute in parallel")
})

const waitForBaseSchema = baseStepSchema.extend({
  type: z
    .literal("wait-for")
    .describe("Step type: wait for a condition or time"),
  waitFor: z.string().describe("Type of wait: 'time' or 'event'")
})

const waitForStepSchema: z.ZodType<WaitForStep> = z.union([
  waitForBaseSchema.extend({
    waitFor: z.literal("time").describe("Wait for a specified amount of time"),
    delay: z.number().min(0).describe("Delay in milliseconds to wait")
  }),
  waitForBaseSchema.extend({
    waitFor: z.literal("event").describe("Wait for a specific event to occur"),
    event: z.string().min(1).describe("Name of the event to wait for"),
    timeout: z
      .number()
      .min(0)
      .optional()
      .nullable()
      .describe("Timeout in milliseconds before giving up (optional)")
  })
])

const stepSchema: z.ZodType<Step> = z.union([
  executeStepSchema,
  ifStepSchema,
  switchStepSchema,
  forStepSchema,
  doWhileStepSchema,
  parallelStepSchema,
  waitForStepSchema
])

const triggerSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Unique name identifier for the trigger"),
  event: z
    .string()
    .min(1)
    .max(100)
    .describe("Event name that starts the workflow"),
  config: z
    .array(
      z.object({
        key: z.string().describe("Configuration parameter name"),
        value: z.any().describe("Configuration parameter value")
      })
    )
    .describe("Configuration parameters for the trigger")
})

const workflowSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .describe("Unique name identifier for the workflow"),
  triggers: z
    .array(triggerSchema)
    .describe("List of triggers that can start this workflow"),
  steps: z
    .array(stepSchema)
    .describe("Ordered list of steps to execute in the workflow"),
  envs: z
    .array(z.string().min(1).max(100))
    .describe("Environment variable names required by the workflow")
})

export const workflowsSchema = z
  .object({
    workflows: z
      .array(workflowSchema)
      .describe("Collection of workflow definitions")
  })
  .describe("Collection of workflow definitions")
