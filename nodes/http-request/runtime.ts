/**
 * HTTP Request Node Runtime - WinterCG-compatible
 * 
 * Uses only Web standard APIs:
 * - fetch() - Web Fetch API
 * - AbortController - Web standard for request cancellation
 * - setTimeout/clearTimeout - Timer APIs
 * - Headers - Web standard
 * 
 * Compatible with Cloudflare Workers, WinterJS, Deno, Node.js 18+
 */

import type { ExtractProps, ExtractSecrets } from "node-base"
import type HttpRequestNode from "./definition"

type Props = ExtractProps<typeof HttpRequestNode>
type Secrets = ExtractSecrets<typeof HttpRequestNode>

export default async function execute(props: Props, secrets: Secrets) {
  const startTime = Date.now()

  try {
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      props.timeout || 30000
    )

    // Build headers object
    const headers: Record<string, string> = {}
    if (props.headers) {
      for (const header of props.headers) {
        headers[header.key] = header.value
      }
    }

    // Make the HTTP request
    const response = await fetch(props.url, {
      method: props.method,
      headers,
      body: props.method !== "GET" && props.body ? props.body : undefined,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    // Parse response headers
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    // Read response body
    const body = await response.text()

    const responseTime = Date.now() - startTime

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body,
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${props.timeout}ms`)
      }
      throw new Error(`HTTP request failed: ${error.message}`)
    }

    throw new Error("HTTP request failed with unknown error")
  }
}