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

declare module "*.md" {
  const content: string
  export default content
}
