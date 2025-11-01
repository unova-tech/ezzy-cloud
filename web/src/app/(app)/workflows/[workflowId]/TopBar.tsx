import { Play, Plus, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TopBarProps {
  workflowName: string
  hasUnsavedChanges: boolean
  onSave: () => void
  onCompile: () => void
  onAddNode: () => void
  isSaving: boolean
  isCompiling: boolean
  loadError: boolean
}

export function TopBar({
  workflowName,
  hasUnsavedChanges,
  onSave,
  onCompile,
  onAddNode,
  isSaving,
  isCompiling,
  loadError
}: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-sidebar">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{workflowName}</h2>
        {hasUnsavedChanges && (
          <Badge variant="secondary">Unsaved changes</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          disabled={isSaving || loadError}
          variant="outline"
          data-testid="save-button"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button
          onClick={onCompile}
          disabled={isCompiling || loadError}
          variant="outline"
          data-testid="compile-button"
        >
          <Play className="w-4 h-4 mr-2" />
          {isCompiling ? "Compiling..." : "Compile"}
        </Button>
        <Button
          onClick={onAddNode}
          variant="outline"
          data-testid="add-node-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Node
        </Button>
      </div>
    </div>
  )
}
