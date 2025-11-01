import { useCallback, useState } from "react"

interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = useCallback((props: ToastProps) => {
    // Simple console-based toast for now
    // TODO: Implement proper toast UI component
    const prefix = props.variant === "destructive" ? "❌" : "✓"
    console.log(`${prefix} ${props.title}`, props.description || "")

    setToasts((prev) => [...prev, props])

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 3000)
  }, [])

  return { toast, toasts }
}
