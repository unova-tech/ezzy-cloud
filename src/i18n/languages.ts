const languages = ["en", "es", "pt-br"] as const

export const defaultLanguage = "pt-br"
export const supportedLanguages = languages
export type SupportedLanguages = (typeof supportedLanguages)[number]
