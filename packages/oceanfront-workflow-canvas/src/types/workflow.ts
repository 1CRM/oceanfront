export type WorkflowCanvasMode = 'view' | 'edit'

export type Position = {
  x: number
  y: number
}

export type Size = {
  w: number
  h: number
}

export type Rect = Position & Size

export type WorkflowNode = {
  id: string
  kind: string
  title?: string
  placeholder?: string
  panelTitle?: string
  labelRight?: string
}

export type WorkflowGroup = {
  id: string
  kind: string
  children: string[]
  label?: string
  labelRight?: string
  readonly?: boolean
}

export type WorkflowGraph = {
  nodes: WorkflowNode[]
  groups: WorkflowGroup[]
}

export type WorkflowKind = {
  addNodeText: string
  addGroupText?: string
  maxGroupDepth?: number
}

export type WorkflowKinds = Record<string, WorkflowKind>

export type WorkflowEntity = WorkflowNode | WorkflowGroup

export type EntityType = 'node' | 'group'
