import type { WorkflowNode, WorkflowGroup, NodeTypeConfig, GroupTypeConfig, WorkflowCanvasLabels } from '../types/workflow'

export function getNodeCssClass(node: WorkflowNode, nodeTypes: NodeTypeConfig): string {
  const typeDef = nodeTypes?.[node.kind]
  return (
    node.definition?.cssClass ?? typeDef?.cssClass ?? `workflow-canvas-node--type-${node.kind}`
  )
}

export function getGroupDisplayLabel(group: WorkflowGroup, groupTypes: GroupTypeConfig): string {
  // Priority 1: definition override label
  if (group.definition?.label && group.definition.label.trim() !== '') {
    return group.definition.label
  }

  // Priority 2: group.label
  if (group.label && group.label.trim() !== '') {
    return group.label
  }

  // Priority 3: type definition label
  const groupTypeDef = groupTypes?.[group.kind]
  if (groupTypeDef?.label) {
    return groupTypeDef.label
  }

  // Priority 4: kind as fallback
  return group.kind
}

export function getGroupDisplayLabelRight(group: WorkflowGroup): string {
  // Priority 1: definition override labelRight
  if (group.definition?.labelRight && group.definition.labelRight.trim() !== '') {
    return group.definition.labelRight
  }

  // Priority 2: group.labelRight
  if (group.labelRight && group.labelRight.trim() !== '') {
    return group.labelRight
  }

  return ''
}

export function shouldHideGroupHoverMenu(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig
): boolean {
  // Check instance-level property first
  if (group.hideAddNodeWhenNotEmpty !== undefined) {
    return group.hideAddNodeWhenNotEmpty && group.containedIds.length > 0
  }

  // Fall back to type-level property
  const groupTypeDef = groupTypes?.[group.kind]
  if (groupTypeDef?.hideAddNodeWhenNotEmpty !== undefined) {
    return groupTypeDef.hideAddNodeWhenNotEmpty && group.containedIds.length > 0
  }

  return false
}

export function shouldHideNodeHoverMenu(
  node: WorkflowNode,
  nodeTypes: NodeTypeConfig,
  edges: Array<{ from: { entityId: string } }>
): boolean {
  // Check instance-level property first
  if (node.hideAddNodeWhenNotEmpty !== undefined) {
    const hasOutgoingConnection = edges.some(edge => edge.from.entityId === node.id)
    return node.hideAddNodeWhenNotEmpty && hasOutgoingConnection
  }

  // Fall back to type-level property
  const nodeTypeDef = nodeTypes?.[node.kind]
  if (nodeTypeDef?.hideAddNodeWhenNotEmpty !== undefined) {
    const hasOutgoingConnection = edges.some(edge => edge.from.entityId === node.id)
    return nodeTypeDef.hideAddNodeWhenNotEmpty && hasOutgoingConnection
  }

  return false
}

export function getNodeAddNodeButtonText(
  node: WorkflowNode,
  nodeTypes: NodeTypeConfig,
  labels: WorkflowCanvasLabels
): string {
  const typeConfig = nodeTypes?.[node.kind]
  return typeConfig?.addNodeButtonText ?? labels.addNodeButtonTextFallback
}

export function getNodeAddGroupButtonText(
  node: WorkflowNode,
  nodeTypes: NodeTypeConfig,
  labels: WorkflowCanvasLabels
): string {
  const typeConfig = nodeTypes?.[node.kind]
  return typeConfig?.addGroupButtonText ?? labels.addGroupButtonTextFallback
}

export function getGroupAddNodeButtonText(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig,
  labels: WorkflowCanvasLabels
): string {
  const typeConfig = groupTypes?.[group.kind]
  return typeConfig?.addNodeButtonText ?? labels.addNodeButtonTextFallback
}

export function getGroupAddGroupButtonText(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig,
  labels: WorkflowCanvasLabels
): string {
  const typeConfig = groupTypes?.[group.kind]
  return typeConfig?.addGroupButtonText ?? labels.addGroupButtonTextFallback
}
