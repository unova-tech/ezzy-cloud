/**
 * API Client using Eden Treaty
 * 
 * Eden Treaty provides type-safe API calls to the Elysia backend.
 * Use this client in your React components and server actions.
 * 
 * Note: Do NOT use this in middleware.ts - use native fetch instead
 * due to Edge Runtime limitations.
 * 
 * @example
 * ```tsx
 * import { api } from '@/lib/api-client'
 * 
 * // In a client component or server action
 * const response = await api.workflows.index.get()
 * if (response.data) {
 *   console.log(response.data)
 * }
 * ```
 */

import { treaty } from '@elysiajs/eden'
import type { App } from 'backend'

const BETTER_AUTH_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'

/**
 * Type-safe API client using Eden Treaty
 * Provides full TypeScript autocomplete and type checking for all API endpoints
 */
export const api = treaty<App>(BETTER_AUTH_URL, {
  fetch: {
    credentials: 'include', // Include cookies in requests
  }
})

/**
 * Alternative: Direct fetch wrapper with proper typing
 * Use when Eden Treaty has issues or for simple requests
 */
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${BETTER_AUTH_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
