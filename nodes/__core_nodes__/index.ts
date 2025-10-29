import nodesCode from "nodes-code"
import nodesHttpRequest from "nodes-http-request"
import nodesResend from "nodes-resend"

export default {
  secrets: [...(nodesHttpRequest.secrets || []), ...(nodesCode.secrets || []), ...(nodesResend.secrets || [])],
  nodes: [...nodesHttpRequest.nodes, ...nodesCode.nodes, ...nodesResend.nodes]
}