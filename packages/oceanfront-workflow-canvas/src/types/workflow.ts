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
 * Field type definitions for node configuration
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'toggle'

/**
 * Field definition structure for node types
 */
export interface NodeFieldDefinition {
  name: string // Internal field name (e.g., 'emailAddress')
  type: FieldType // Input type
  label: string // Display label
  required?: boolean // Is field required
  placeholder?: string // Placeholder text
  items?: Array<{ value: string; text: string }> // For select fields
  showInTile?: boolean // Display in node tile (not just config panel)
}

/**
 * Type definition structure (passed via props)
 */
export interface NodeTypeDefinition {
  type: string // Type identifier (e.g., 'trigger', 'action')
  label: string // Display name (e.g., 'Trigger')
  icon?: string // Default icon for this type
  fields: NodeFieldDefinition[] // Fields for this type
  cssClass?: string // Custom CSS class (defaults to `workflow-canvas-node--type-${type}`)
}

/**
 * Type configuration map (keyed by type identifier)
 */
export interface NodeTypeConfig {
  [typeId: string]: NodeTypeDefinition
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
  locked?: boolean // if true, prevents deletion
  readonly?: boolean // if true, prevents editing (hides menu and config panel)
}

/**
 * An edge connecting two nodes
 */
export interface WorkflowEdge {
  id: string
  from: Port
  to: Port
  locked?: boolean // if true, prevents disconnection/deletion
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
  locked?: boolean // if true, prevents deletion
  readonly?: boolean // if true, prevents editing (hides config panel)
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
  typeLabel: string
  titleLabel: string
  descriptionLabel: string

  // Buttons
  deleteNodeButton: string
  deleteGroupButton: string
  configureButton: string

  // Placeholders
  groupTitlePlaceholder: string
  selectNodeTypePlaceholder: string

  // Boolean values
  yes: string
  no: string

  // Dynamic text formatters
  itemCount: (count: number) => string
  nestingDepth: (depth: number) => string
}
