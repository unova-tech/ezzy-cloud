import { Link, Text } from "@react-email/components"
import { createTranslator } from "next-intl"
import type { SupportedLanguages } from "@/i18n/languages"
import { getMessages } from "./getMessages"
import EmailLayout from "./layout"

const WelcomeEmail: React.FC<{
  formLink: string
  referralCode: string
  locale: SupportedLanguages
}> = ({ formLink, referralCode, locale }) => {
  const messages = getMessages(locale)
  const t = createTranslator({ locale, messages, namespace: "WelcomeEmail" })

  return (
    <EmailLayout title={t("title")} preview={t("preview")} locale={locale}>
      <h1>{t("title")}</h1>
      <Text>{t("welcome")}</Text>
      <Text>
        {t("help-us-1")} <strong>{t("help-us-2")}</strong>! {t("help-us-3")}
      </Text>
      <Link
        href={formLink}
        className="bg-blue-500 p-3 text-white rounded font-bold"
      >
        {t("form-button")}
      </Link>
      <Text className="mt-8">
        <strong>{t("earn-more-credits")}</strong>{" "}
        {t("earn-more-credits-explain")}
      </Text>
      <Text className="text-blue-500 font-bold">
        https://ezzycloud.unova.tech/?ref={referralCode}
      </Text>
      <Text className="text-sm text-gray-500">
        {t("earn-more-credits-observation")}
      </Text>
      <Text>{t("footer-1")}</Text>
      <Text>{t("footer-2")}</Text>
      <Text className="text-bold">{t("footer-3")}</Text>
    </EmailLayout>
  )
}

WelcomeEmail.displayName = "WelcomeEmail"
// @ts-expect-error
WelcomeEmail.defaultProps = {
  locale: "pt-br",
  formLink: "https://ezzycloud.com",
  referralCode: "ABC123XYZ"
}

export default WelcomeEmail
