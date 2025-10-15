import messagesEn from "../../messages/en.json"
import messagesEs from "../../messages/es.json"
import messagesPtBr from "../../messages/pt-br.json"

const messages = {
  "pt-br": messagesPtBr,
  en: messagesEn,
  es: messagesEs
} as const

export function getMessages(locale: keyof typeof messages) {
  return (messages[locale] || messages["pt-br"]) as typeof messagesPtBr
}
