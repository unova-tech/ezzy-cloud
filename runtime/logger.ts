type LogLevel = 'info' | 'error' | 'debug' | 'warn'

type LogEntry = {
  timestamp: number
  level: LogLevel
  message: string
  data?: any
  workflowId: string
  executionId: string
}

export class Logger {
  private logs: LogEntry[] = []
  private workflowId: string
  private executionId: string

  constructor(workflowId: string, executionId: string) {
    this.workflowId = workflowId
    this.executionId = executionId
  }

  info(message: string, data?: any): void {
    this.log('info', message, data)
    console.log(`[INFO] ${message}`, data || '')
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error
    this.log('error', message, errorData)
    console.error(`[ERROR] ${message}`, errorData || '')
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data)
    console.debug(`[DEBUG] ${message}`, data || '')
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data)
    console.warn(`[WARN] ${message}`, data || '')
  }

  private log(level: LogLevel, message: string, data?: any): void {
    this.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data,
      workflowId: this.workflowId,
      executionId: this.executionId
    })
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Placeholder for sending logs to external service
   */
  async flush(): Promise<void> {
    // TODO: Implement log shipping to external service
    // For now, just clear the logs
    this.logs = []
  }
}
