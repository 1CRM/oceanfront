/**
 * Position in 2D space
 */
export interface Position {
  x: number
  y: number
}

/**
 * Size dimensions
 */
export interface Size {
  w: number
  h: number
}

/**
 * Rectangle for groups
 */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Node data structure for titles, descriptions, and icons
 */
export interface NodeData {
  icon?: string
  title?: string
  description?: string
}

/**
 * Connection port reference
 */
export interface Port {
  entityId: string // Can refer to either a node or a group
}

/**
 * A workflow node (step/tile)
 */
export interface WorkflowNode {
  id: string
  kind: string // consumer-defined type (e.g., 'condition', 'action', 'trigger')
  position: Position
  size?: Size
  data?: unknown // consumer-owned data
}

/**
 * An edge connecting two nodes
 */
export interface WorkflowEdge {
  id: string
  from: Port
  to: Port
}

/**
 * A group (container) for nodes and other groups
 */
export interface WorkflowGroup {
  id: string
  kind: string // Type of group (e.g., 'group', 'swimlane', 'phase')
  title?: string
  position: Position
  size: Size
  containedIds: string[] // Contains both node IDs and group IDs
  data?: unknown // Consumer-owned data
}

/**
 * Complete workflow graph
 */
export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  groups: WorkflowGroup[]
}

/**
 * Event payload when adding a step
 */
export interface AddStepEvent {
  afterNodeId?: string
  inGroupId?: string
}

/**
 * Event payload when connecting nodes
 */
export interface ConnectEvent {
  fromNodeId: string
  toNodeId: string
}

/**
 * Labels for internationalization support
 */
export interface WorkflowCanvasLabels {
  // Panel headers
  nodeDetailsHeader: string
  groupDetailsHeader: string

  // Field labels
  idLabel: string
  typeLabel: string
  titleLabel: string
  descriptionLabel: string
  containedItemsLabel: string
  nestingDepthLabel: string
  sizeLabel: string

  // Buttons
  deleteNodeButton: string
  deleteGroupButton: string
  configureButton: string

  // Placeholders
  groupTitlePlaceholder: string

  // Dynamic text formatters
  itemCount: (count: number) => string
  nestingDepth: (depth: number) => string
}
