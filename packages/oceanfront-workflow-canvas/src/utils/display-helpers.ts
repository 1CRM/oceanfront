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

export function shouldHideGroupAddNode(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig
): boolean {
  // Check instance-level property first
  if (group.hideAddNode !== undefined) {
    return group.hideAddNode
  }

  // Fall back to type-level property
  const groupTypeDef = groupTypes?.[group.kind]
  if (groupTypeDef?.hideAddNode !== undefined) {
    return groupTypeDef.hideAddNode
  }

  return false
}

export function shouldHideGroupAddGroup(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig
): boolean {
  // Check instance-level property first
  if (group.hideAddGroup !== undefined) {
    return group.hideAddGroup
  }

  // Fall back to type-level property
  const groupTypeDef = groupTypes?.[group.kind]
  if (groupTypeDef?.hideAddGroup !== undefined) {
    return groupTypeDef.hideAddGroup
  }

  return false
}

export function shouldHideGroupNestedAddNode(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig
): boolean {
  // Check instance-level property first
  if (group.hideNestedAddNode !== undefined) {
    return group.hideNestedAddNode
  }

  // Fall back to type-level property
  const groupTypeDef = groupTypes?.[group.kind]
  if (groupTypeDef?.hideNestedAddNode !== undefined) {
    return groupTypeDef.hideNestedAddNode
  }

  return false
}

export function shouldHideGroupNestedAddGroup(
  group: WorkflowGroup,
  groupTypes: GroupTypeConfig
): boolean {
  // Check instance-level property first
  if (group.hideNestedAddGroup !== undefined) {
    return group.hideNestedAddGroup
  }

  // Fall back to type-level property
  const groupTypeDef = groupTypes?.[group.kind]
  if (groupTypeDef?.hideNestedAddGroup !== undefined) {
    return groupTypeDef.hideNestedAddGroup
  }

  return false
}

export function shouldHideNodeAddNode(
  node: WorkflowNode,
  nodeTypes: NodeTypeConfig
): boolean {
  // Check instance-level property first
  if (node.hideAddNode !== undefined) {
    return node.hideAddNode
  }

  // Fall back to type-level property
  const nodeTypeDef = nodeTypes?.[node.kind]
  if (nodeTypeDef?.hideAddNode !== undefined) {
    return nodeTypeDef.hideAddNode
  }

  return false
}

export function shouldHideNodeAddGroup(
  node: WorkflowNode,
  nodeTypes: NodeTypeConfig
): boolean {
  // Check instance-level property first
  if (node.hideAddGroup !== undefined) {
    return node.hideAddGroup
  }

  // Fall back to type-level property
  const nodeTypeDef = nodeTypes?.[node.kind]
  if (nodeTypeDef?.hideAddGroup !== undefined) {
    return nodeTypeDef.hideAddGroup
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
