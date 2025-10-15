import type messages from "../messages/pt-br.json"
import type { SupportedLanguages } from "./i18n/languages"

declare module "next-intl" {
  interface AppConfig {
    Locale: SupportedLanguages
    Messages: typeof messages
  }
}

interface Umami {
  track(payload: {
    website: string
    url?: string
    title?: string
    [key: string]: unknown
  }): void
  track(eventName: string, data: Record<string, unknown>): void
  identify(uniqueId: string): void
  identify(uniqueId: string, data: Record<string, unknown>): void
  identify(data: Record<string, unknown>): void
}

declare global {
  interface Window {
    umami: Umami
  }
}
