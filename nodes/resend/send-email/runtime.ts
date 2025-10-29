import type { ExtractProps, ExtractSecrets } from "node-base"
import type resendSendEmailNode from "./definition"

export default function execute(
  props: ExtractProps<typeof resendSendEmailNode>,
  secrets: ExtractSecrets<typeof resendSendEmailNode>
) {
  console.log("Resending email with the following properties:", props)
  console.log("Using API Key:", secrets.apiKey)

  return {
    success: true,
    message: `Email ${props.fromEmail} resent to ${props.toEmail}`
  }
}
