import IfNode from "./if"
import SwitchNode from "./switch"
import ForNode from "./for"
import MergeNode from "./merge"
import TriggerWebhookNode from "./trigger-webhook"
import TriggerManualNode from "./trigger-manual"
import HttpRequestNode from "./http-request"
import CodeNode from "./code"

const CoreNodes = [
  IfNode,
  SwitchNode,
  ForNode,
  MergeNode,
  TriggerWebhookNode,
  TriggerManualNode,
  HttpRequestNode,
  CodeNode
]

export default CoreNodes

export {
  IfNode,
  SwitchNode,
  ForNode,
  MergeNode,
  TriggerWebhookNode,
  TriggerManualNode,
  HttpRequestNode,
  CodeNode
}