import { cookies, headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { type SupportedLanguages, supportedLanguages } from "./languages"

export default getRequestConfig(async () => {
  const store = await cookies()
  let locale = store.get("locale")?.value

  if (!locale || !supportedLanguages.includes(locale as SupportedLanguages)) {
    const headersList = await headers()

    locale = headersList
      .get("accept-language")
      ?.split(",")[0]
      ?.split("-")[0]
      ?.toLowerCase()

    if (!locale || !supportedLanguages.includes(locale as SupportedLanguages)) {
      locale = "pt-br"
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})
