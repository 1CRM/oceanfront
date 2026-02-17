// Components
import WorkflowCanvas from './components/WorkflowCanvas.vue'
import WorkflowTile from './components/WorkflowTile.vue'
import WorkflowPlusPlaceholder from './components/WorkflowPlusPlaceholder.vue'

// Types
export type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGroup,
  Position,
  Size,
  Rect,
  Port,
  NodeData,
  AddStepEvent,
  ConnectEvent,
  WorkflowCanvasLabels,
  WorkflowCanvasMode,
  NodeTypeConfig,
  NodeTypeDefinition,
  NodeFieldDefinition,
  NodeDefinitionOverride,
  GroupTypeConfig,
  GroupTypeDefinition,
  GroupTypeFieldDefinition,
  GroupDefinitionOverride,
  NestedGroupConfig
} from './types/workflow'

// Constants
export { DEFAULT_LABELS } from './constants/labels'

// Utilities
export {
  findNode,
  findGroup,
  updateNodePosition,
  updateNodesPositions,
  addEdge,
  removeEdge,
  addEntityToGroup,
  removeEntityFromGroup,
  removeEntityFromAllGroups,
  isPointInRect,
  findGroupAtPosition,
  getEntityEdges,
  getParentGroup,
  getGroupDescendants,
  calculateGroupBounds,
  updateGroupBounds,
  updateGroupPosition,
  getGroupDepth,
  areEntitiesInDifferentGroups,
  handleAddStepToGraph,
  handleConnectNodes,
  addNode,
  addGroup,
  isEntityTypeCompatibleWithGroup,
  isGroupDescendantOf,
  moveNodesBelow
} from './utils/graph-helpers'

// Components
export { WorkflowCanvas, WorkflowTile, WorkflowPlusPlaceholder }

// Import styles
import './scss/index.scss'
