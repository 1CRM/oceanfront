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
  descriptionLabel: 'Description',

  // Buttons
  deleteNodeButton: 'Delete Node',
  deleteGroupButton: 'Delete Group',
  configureButton: 'Configure',

  // Placeholders
  groupTitlePlaceholder: 'Enter group title',
  selectNodeTypePlaceholder: 'Select node type...',

  // Boolean values
  yes: 'Yes',
  no: 'No',

  // Dynamic text formatters
  itemCount: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
  nestingDepth: (depth: number) => (depth === 0 ? 'Top-level' : `Level ${depth}`)
}
