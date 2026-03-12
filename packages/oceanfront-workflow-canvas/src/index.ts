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
  ConnectedEntities,
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
  NestedGroupConfig,
  EdgeAddPayload
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
  moveNodesBelow,
  getConnectedEntities
} from './utils/graph-helpers'

export {
  getNodeCssClass,
  getNodeDisplayLabel,
  getNodeDisplayLabelRight,
  getGroupDisplayLabel,
  getGroupDisplayLabelRight,
  shouldHideGroupAddNode,
  shouldHideGroupAddGroup,
  shouldHideGroupNestedAddNode,
  shouldHideGroupNestedAddGroup,
  shouldHideNodeAddNode,
  shouldHideNodeAddGroup,
  getNodeAddNodeButtonText,
  getNodeAddGroupButtonText,
  getGroupAddNodeButtonText,
  getGroupAddGroupButtonText
} from './utils/display-helpers'

// Components
export { WorkflowCanvas, WorkflowTile, WorkflowPlusPlaceholder }

// Import styles
import './scss/index.scss'
