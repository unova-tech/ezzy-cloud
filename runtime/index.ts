export type StepResult = {
  success: boolean
  output?: any
  error?: string
}

export type Context = {
  variables: Map<string, any>
  stepResults: Map<string, StepResult>
  metadata: {
    workflowId: string
    executionId: string
    startTime: number
  }
}

export type WorkflowError = {
  code: string
  message: string
  step?: string
  details?: any
}

/**
 * Create a new execution context
 */
export function createContext(workflowId: string, executionId: string): Context {
  return {
    variables: new Map(),
    stepResults: new Map(),
    metadata: {
      workflowId,
      executionId,
      startTime: Date.now()
    }
  }
}

/**
 * Evaluate a JavaScript expression with context
 */
export function evaluateExpression(expr: string, context: Context): any {
  try {
    // Build context object from variables
    const contextObj: Record<string, any> = {}
    context.variables.forEach((value, key) => {
      contextObj[key] = value
    })
    
    // Also add step results
    const results: Record<string, any> = {}
    context.stepResults.forEach((result, key) => {
      results[key] = result.output
    })
    
    // Create function with context as parameters
    const paramNames = [...Object.keys(contextObj), 'results']
    const paramValues = [...Object.values(contextObj), results]
    
    const fn = new Function(...paramNames, `return (${expr})`)
    return fn(...paramValues)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Expression evaluation failed: ${error.message}`)
    }
    throw new Error('Expression evaluation failed')
  }
}

/**
 * Handle and format errors
 */
export function handleError(error: Error, step?: string): WorkflowError {
  return {
    code: 'EXECUTION_ERROR',
    message: error.message,
    step,
    details: error.stack
  }
}

/**
 * Create a JSON response
 */
export function createJsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
