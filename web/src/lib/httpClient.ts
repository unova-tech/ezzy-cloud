import { edenFetch } from "@elysiajs/eden"
import { headers } from "next/headers"
import type { App } from "../../../backend"

export async function getHttpClient() {
  const requestHeaders = await headers()

  const host = requestHeaders.get("x-forwarded-host") ?? "localhost:3000"
  const protocol = host.includes("localhost") ? "http" : "https"

  const httpClient = edenFetch<App>(`${protocol}://${host}`, {
    headers: requestHeaders
  })

  return httpClient
}
