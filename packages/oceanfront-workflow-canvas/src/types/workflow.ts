/**
 * Canvas mode - controls interactivity and display
 */
export type WorkflowCanvasMode = 'view' | 'edit'

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
 * Field definition structure for node types
 */
export interface NodeFieldDefinition {
  name: string // Internal field name (e.g., 'emailAddress')
  type: string // Input type
  label?: string // Field label
  items?: Array<{ value: string; text: string }> // For select fields
  visible?: boolean // If false, field will not be rendered
  [key: string]: any
}

/**
 * Per-node type definition overrides
 * Allows individual nodes to override any property from their NodeTypeDefinition
 *
 * @example
 * node.definition = {
 *   icon: 'custom-icon',
 *   title: 'Custom Title',
 *   configPanelTitle: 'Detailed Title for Panel',
 *   tileTitle: 'Short Title',
 *   placeholder: 'Custom placeholder',
 *   fields: [...]
 * }
 */
export interface NodeDefinitionOverride {
  icon?: string
  title?: string
  configPanelTitle?: string
  tileTitle?: string
  label?: string
  labelRight?: string
  placeholder?: string
  fields?: NodeFieldDefinition[]
  cssClass?: string
}

/**
 * Type definition structure (passed via props)
 */
export interface NodeTypeDefinition {
  type: string // Type identifier (e.g., 'trigger', 'action')
  title: string // Display name (e.g., 'Trigger') - used as fallback for both panel and tile
  configPanelTitle?: string // Title shown in config panel header (falls back to tileTitle, then title)
  tileTitle?: string // Title shown in tile display (falls back to configPanelTitle, then title)
  icon?: string // Default icon for this type
  placeholder?: string // Placeholder text to display in tile
  fields: NodeFieldDefinition[] // Fields for this type
  cssClass?: string // Custom CSS class (defaults to `workflow-canvas-node--type-${type}`)
  lockParent?: boolean // If true, nodes of this type are locked to parent by default
  hideAddNode?: boolean // If true, hides "+ node" button in hover menu
  hideAddGroup?: boolean // If true, hides "+ group" button in hover menu
  addNodeButtonText?: string // Custom text for "+ node" button in hover menu (defaults to "+ node")
  addGroupButtonText?: string // Custom text for "+ group" button in hover menu (defaults to "+ group")
}

/**
 * Type configuration map (keyed by type identifier)
 */
export interface NodeTypeConfig {
  [typeId: string]: NodeTypeDefinition
}

/**
 * Field definition structure for group types
 */
export interface GroupTypeFieldDefinition {
  name: string // Internal field name (e.g., 'description')
  type: string // Input type
  label?: string // Field label
  items?: Array<{ value: string; text: string }> // For select fields
  visible?: boolean // If false, field will not be rendered
  [key: string]: any
}

/**
 * Configuration for nested groups
 * Defines default properties for groups created within a parent group
 */
export interface NestedGroupConfig {
  label?: string // Default label for nested groups
  placeholder?: string // Placeholder text for nested groups
  fields?: GroupTypeFieldDefinition[] // Field definitions for nested groups
}

/**
 * Per-group type definition overrides
 * Allows individual groups to override any property from their GroupTypeDefinition
 *
 * @example
 * group.definition = {
 *   label: 'Custom Group Label',
 *   fields: [...],
 *   showTypeField: false,
 *   showTitleField: false
 * }
 */
export interface GroupDefinitionOverride {
  label?: string
  labelRight?: string
  fields?: GroupTypeFieldDefinition[]
  placeholder?: string
  showTypeField?: boolean // Override type-level setting for type field visibility
  showTitleField?: boolean // Override type-level setting for title field visibility
}

/**
 * Type definition structure for groups (passed via props)
 */
export interface GroupTypeDefinition {
  type: string // Type identifier (e.g., 'group', 'phase')
  label: string // Display name (e.g., 'Standard Group')
  fields: GroupTypeFieldDefinition[] // Fields for this type
  nested?: NestedGroupConfig // Configuration for nested groups
  showTypeField?: boolean // Control visibility of type field in config panel (default: true)
  showTitleField?: boolean // Control visibility of title field in config panel (default: true)
  lockParent?: boolean // If true, groups of this type are locked to parent by default
  hideAddNode?: boolean // If true, hides "+ node" button in connection hover menu
  hideAddGroup?: boolean // If true, hides "+ group" button in connection hover menu
  hideNestedAddNode?: boolean // If true, hides "+ node" button in empty group "+" menu
  hideNestedAddGroup?: boolean // If true, hides "+ group" button in empty group "+" menu
  addNodeButtonText?: string // Custom text for "+ node" button in group hover menu (defaults to "+ node")
  addGroupButtonText?: string // Custom text for "+ group" button in group hover menu (defaults to "+ group")
}

/**
 * Type configuration map for groups (keyed by type identifier)
 */
export interface GroupTypeConfig {
  [typeId: string]: GroupTypeDefinition
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
  label?: string
  labelRight?: string
  position: Position
  size?: Size
  definition?: NodeDefinitionOverride // overrides for NodeTypeDefinition
  locked?: boolean // if true, prevents deletion
  readonly?: boolean // if true, prevents editing (hides menu and config panel)
  lockParent?: boolean // if true, prevents moving outside parent group
  hideAddNode?: boolean // if true, hides "+ node" button in hover menu
  hideAddGroup?: boolean // if true, hides "+ group" button in hover menu
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
 * Payload emitted when an edge is added
 */
export interface EdgeAddPayload {
  edge: WorkflowEdge
  from: WorkflowNode | WorkflowGroup
  to: WorkflowNode | WorkflowGroup
}

/**
 * A group (container) for nodes and other groups
 */
export interface WorkflowGroup {
  id: string
  kind: string // Type of group (e.g., 'group', 'swimlane', 'phase')
  label?: string
  labelRight?: string
  position: Position
  size: Size
  containedIds: string[] // Contains both node IDs and group IDs
  definition?: GroupDefinitionOverride // overrides for GroupTypeDefinition
  locked?: boolean // if true, prevents deletion
  readonly?: boolean // if true, prevents editing (hides config panel)
  lockParent?: boolean // if true, prevents moving outside parent group
  maxDepth?: number | null // if set, overrides global maxGroupDepth for this group
  hideAddNode?: boolean // if true, hides "+ node" button in connection hover menu
  hideAddGroup?: boolean // if true, hides "+ group" button in connection hover menu
  hideNestedAddNode?: boolean // if true, hides "+ node" button in empty group "+" menu
  hideNestedAddGroup?: boolean // if true, hides "+ group" button in empty group "+" menu
  nested?: NestedGroupConfig // Per-instance override for nested group configuration
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
 * Connected entities for a node or group
 */
export interface ConnectedEntities {
  incoming: (WorkflowNode | WorkflowGroup)[] // Entities that have edges pointing to this entity
  outgoing: (WorkflowNode | WorkflowGroup)[] // Entities that this entity has edges pointing to
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

  // Buttons
  deleteNodeButton: string
  deleteGroupButton: string
  configureButton: string
  addNodeToGroupButton: string
  addNestedGroupButton: string
  addNodeAfterNodeButton: string
  addGroupAfterNodeButton: string

  // Placeholders
  groupLabelPlaceholder: string
  selectNodeTypePlaceholder: string

  // Boolean values
  yes: string
  no: string

  // Button text fallbacks
  addNodeButtonTextFallback: string
  addGroupButtonTextFallback: string

  // Default values
  defaultGroupKind: string
  defaultGroupLabel: string

  // Dynamic text formatters
  nestedGroupLabel: (kind: string) => string
}
