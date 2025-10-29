"use client"

import React, { createContext, useContext, type ReactNode } from "react"
import type { INode } from "node-base"

type NodeContextType = {
  onAddNodeFromHandle: (sourceNodeId: string, sourceHandleId: string, position: { x: number; y: number }) => void
  setShowNodePalette: (show: boolean) => void
}

const NodeContext = createContext<NodeContextType | null>(null)

export function NodeProvider({ children, value }: { children: ReactNode; value: NodeContextType }) {
  return <NodeContext.Provider value={value}>{children}</NodeContext.Provider>
}

export function useNodeContext() {
  const context = useContext(NodeContext)
  if (!context) {
    throw new Error("useNodeContext must be used within NodeProvider")
  }
  return context
}
