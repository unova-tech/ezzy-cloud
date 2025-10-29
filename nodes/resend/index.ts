import ResendAPIKeySecret from "./apikey-secret"
import ResendSendEmailNode from "./send-email/definition"

export default {
  secrets: [ResendAPIKeySecret],
  nodes: [ResendSendEmailNode]
}
