import { treaty } from "@elysiajs/eden"
import type { App } from "@/backend"

const { api: httpClient } = treaty<App>(window.location.origin)

export default httpClient
