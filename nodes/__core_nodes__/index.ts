import nodesResend from "nodes-resend"

export default {
  secrets: [
    ...(nodesResend.secrets || [])
  ],
  nodes: [...nodesResend.nodes]
}