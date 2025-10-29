import type { ExtractProps, ExtractSecrets } from "node-base"
import type CodeNode from "./definition"

type Props = ExtractProps<typeof CodeNode>
type Secrets = ExtractSecrets<typeof CodeNode>

export default async function execute(props: Props, secrets: Secrets, context: Record<string, any> = {}) {
  const logs: string[] = []
  
  try {
    // Create a custom console object that captures logs
    const customConsole = {
      log: (...args: any[]) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '))
      },
      error: (...args: any[]) => {
        logs.push(`ERROR: ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`)
      },
      warn: (...args: any[]) => {
        logs.push(`WARN: ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`)
      },
      info: (...args: any[]) => {
        logs.push(`INFO: ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`)
      }
    }
    
    // Build the context with input variables
    const executionContext: Record<string, any> = {
      console: customConsole,
      ...context
    }
    
    // Add input variables to context if specified
    if (props.inputVariables) {
      for (const varName of props.inputVariables) {
        if (context[varName] !== undefined) {
          executionContext[varName] = context[varName]
        }
      }
    }
    
    // Create an async function from the code
    const paramNames = Object.keys(executionContext)
    const paramValues = Object.values(executionContext)
    
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
    const fn = new AsyncFunction(...paramNames, props.code)
    
    // Execute the code
    const output = await fn(...paramValues)
    
    return {
      output,
      logs
    }
  } catch (error) {
    if (error instanceof Error) {
      logs.push(`ERROR: ${error.message}`)
      throw new Error(`Code execution failed: ${error.message}`)
    }
    throw new Error("Code execution failed with unknown error")
  }
}
