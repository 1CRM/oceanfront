import type { WorkflowCanvasLabels } from '../types/workflow'

/**
 * Default English labels for the workflow canvas
 */
export const DEFAULT_LABELS: WorkflowCanvasLabels = {
  // Panel headers
  nodeDetailsHeader: 'Node Details',
  groupDetailsHeader: 'Group Details',

  // Field labels
  typeLabel: 'Type',
  titleLabel: 'Title',

  // Buttons
  deleteNodeButton: 'Delete Node',
  deleteGroupButton: 'Delete Group',
  configureButton: 'Configure',
  addNodeToGroupButton: 'Add node',
  addNestedGroupButton: 'Add group',
  addNodeAfterNodeButton: 'Add node after this node',
  addGroupAfterNodeButton: 'Add group after this node',

  // Placeholders
  groupLabelPlaceholder: 'Enter group label',
  selectNodeTypePlaceholder: 'Select node type...',

  // Boolean values
  yes: 'Yes',
  no: 'No',

  // Button text fallbacks
  addNodeButtonTextFallback: '+ node',
  addGroupButtonTextFallback: '+ group',

  // Default values
  defaultGroupKind: 'group',
  defaultGroupLabel: 'New Group',

  // Dynamic text formatters
  nestedGroupLabel: (kind: string) => `Nested ${kind}`
}
