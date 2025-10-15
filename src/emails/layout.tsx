import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Link,
  Preview,
  pixelBasedPreset,
  Tailwind,
  Text
} from "@react-email/components"
import { createTranslator } from "next-intl"
import type { PropsWithChildren } from "react"
import type { SupportedLanguages } from "@/i18n/languages"
import { getMessages } from "./getMessages"

interface PropsWithPreview extends PropsWithChildren {
  title: string
  preview?: string
  locale: SupportedLanguages
}

const EmailLayout: React.FC<PropsWithPreview> = ({
  children,
  title,
  preview,
  locale
}) => {
  const messages = getMessages(locale)
  const t = createTranslator({ locale, messages, namespace: "EmailLayout" })

  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset]
      }}
    >
      <Html lang="pt-br">
        <Head>
          <title>{title}</title>
          {preview && <Preview>{preview}</Preview>}
          <Font
            fontFamily="Roboto"
            fallbackFontFamily="Verdana"
            webFont={{
              url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
              format: "woff2"
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        </Head>
        <Body className="bg-gray-100 font-sans my-0 mx-auto text-base text-black p-4">
          <Text className="text-center text-sm text-gray-500 mb-4">
            {t("title")}
          </Text>
          <Container className="bg-white p-8 rounded shadow-md max-w-lg mx-auto">
            {children}
            <Text className="text-xs text-gray-500 mt-4">
              {t("observation")}{" "}
              <Link href="mailto:ezzycloud@unova.tech">
                ezzycloud@unova.tech
              </Link>
            </Text>
          </Container>
          <Text className="text-center text-sm text-gray-500 mt-4">
            © {new Date().getFullYear()} Ezzy Cloud. {t("copyright")}
          </Text>
        </Body>
      </Html>
    </Tailwind>
  )
}

export default EmailLayout
