import IfNode from "./if"
import SwitchNode from "./switch"
import ForNode from "./for"
import MergeNode from "./merge"
import TriggerManualNode from "./trigger-manual"

export const coreNodes = {
  nodes: [IfNode, SwitchNode, ForNode, MergeNode, TriggerManualNode]
}

export { IfNode, SwitchNode, ForNode, MergeNode, TriggerManualNode }
