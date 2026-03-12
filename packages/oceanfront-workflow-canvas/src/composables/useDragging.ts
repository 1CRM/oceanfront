import { ref, type Ref } from 'vue'
import type {
  Position,
  WorkflowGraph,
  WorkflowNode,
  WorkflowGroup,
  NodeTypeConfig,
  ConnectedEntities
} from '../types/workflow'
import {
  updateNodePosition,
  updateGroupPosition,
  findNode,
  findGroup,
  getParentGroup,
  removeEntityFromAllGroups,
  addEntityToGroup,
  updateGroupBounds,
  findGroupAtPosition,
  getAutoAssignedNodeKind,
  isEntityTypeCompatibleWithGroup,
  isGroupDescendantOf,
  getConnectedEntities
} from '../utils/graph-helpers'

export interface UseDraggingOptions {
  graph: Ref<WorkflowGraph>
  maxGroupDepth: Ref<number | null>
  readonly: Ref<boolean>
  canvasRef: Ref<HTMLElement | undefined>
  nodeTypes: Ref<NodeTypeConfig>
  findDropTargetGroup: (x: number, y: number, excludeId: string | null) => WorkflowGroup | undefined
  wouldExceedMaxDepth: (entityId: string, targetGroupId: string) => boolean
  onGraphUpdate: (graph: WorkflowGraph) => void
  onNodeDragStart: (nodeId: string) => void
  onNodeDragEnd: (
    nodeId: string,
    position: Position,
    parentGroup: WorkflowGroup | null,
    connected: ConnectedEntities
  ) => void
  onGroupDragStart: (groupId: string) => void
  onGroupDragEnd: (
    groupId: string,
    position: Position,
    parentGroup: WorkflowGroup | null,
    connected: ConnectedEntities
  ) => void
  onEntityMovedToGroup: (entityId: string, groupId: string | null) => void
}

export function useDragging(options: UseDraggingOptions) {
  const {
    graph,
    readonly,
    canvasRef,
    nodeTypes,
    findDropTargetGroup,
    wouldExceedMaxDepth,
    onGraphUpdate,
    onNodeDragStart,
    onNodeDragEnd,
    onGroupDragStart,
    onGroupDragEnd,
    onEntityMovedToGroup
  } = options

  const draggingNodeId = ref<string | null>(null)
  const draggingGroupId = ref<string | null>(null)
  const dragOffset = ref<Position>({ x: 0, y: 0 })
  const draggedNodeOriginalGroup = ref<string | null>(null)
  const draggedEntityOriginalPosition = ref<Position | null>(null)
  const nodeOverGroupId = ref<string | null>(null)
  const nodeOverGroupIds = ref<string[]>([])
  const hoveredNodeGroupId = ref<string | null>(null)
  const invalidDropTarget = ref<boolean>(false)
  const isHandlingMouseUp = ref<boolean>(false)

  const getCanvasMousePosition = (event: MouseEvent): Position | null => {
    const canvas = canvasRef.value
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left + canvas.scrollLeft,
      y: event.clientY - rect.top + canvas.scrollTop
    }
  }

  const handleNodeMouseDown = (event: MouseEvent, node: WorkflowNode) => {
    if (readonly.value) return
    if ((event.target as HTMLElement).classList.contains('workflow-canvas-node__handle')) return
    if (event.button !== 0) return

    // Prevent starting a new drag if already dragging something or handling mouseup
    if (draggingNodeId.value || draggingGroupId.value || isHandlingMouseUp.value) return

    event.preventDefault()
    const mousePos = getCanvasMousePosition(event)
    if (!mousePos) return

    dragOffset.value = {
      x: mousePos.x - node.position.x,
      y: mousePos.y - node.position.y
    }

    const currentGroup = getParentGroup(graph.value, node.id)
    draggedNodeOriginalGroup.value = currentGroup?.id || null
    draggedEntityOriginalPosition.value = { x: node.position.x, y: node.position.y }
    draggingNodeId.value = node.id
    onNodeDragStart(node.id)
  }

  const handleGroupMouseDown = (event: MouseEvent, group: WorkflowGroup) => {
    if (readonly.value) return
    if (event.button !== 0) return

    // Prevent starting a new drag if already dragging something or handling mouseup
    if (draggingGroupId.value || draggingNodeId.value || isHandlingMouseUp.value) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('.workflow-canvas-node')) return
    if (target.classList.contains('workflow-canvas-group__handle')) return
    if (target.classList.contains('workflow-canvas-group__resize-handle')) return

    event.preventDefault()
    const mousePos = getCanvasMousePosition(event)
    if (!mousePos) return

    dragOffset.value = {
      x: mousePos.x - group.position.x,
      y: mousePos.y - group.position.y
    }

    const currentParent = getParentGroup(graph.value, group.id)
    draggedNodeOriginalGroup.value = currentParent?.id || null
    draggedEntityOriginalPosition.value = { x: group.position.x, y: group.position.y }
    draggingGroupId.value = group.id
    onGroupDragStart(group.id)
  }

  const handleNodeMouseEnter = (node: WorkflowNode) => {
    const parentGroup = getParentGroup(graph.value, node.id)
    if (parentGroup) {
      hoveredNodeGroupId.value = parentGroup.id
    }
  }

  const handleNodeMouseLeave = () => {
    hoveredNodeGroupId.value = null
  }

  const getNodeDimensions = (
    node: WorkflowNode,
    nodeElements: Map<string, HTMLElement>
  ): { width: number; height: number } => {
    const element = nodeElements.get(node.id)
    if (element) {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }
    return { width: node.size?.w || 250, height: node.size?.h || 100 }
  }

  const handleNodeDragMove = (
    newPosition: Position,
    nodeElements: Map<string, HTMLElement>,
    findAllGroupsAtPosition: (position: Position) => WorkflowGroup[]
  ): boolean => {
    if (!draggingNodeId.value) return false

    const updatedGraph = updateNodePosition(graph.value, draggingNodeId.value, newPosition)
    onGraphUpdate(updatedGraph)

    const node = findNode(updatedGraph, draggingNodeId.value)
    if (!node) return true

    const nodeDimensions = getNodeDimensions(node, nodeElements)
    const nodeCenter = {
      x: node.position.x + nodeDimensions.width / 2,
      y: node.position.y + nodeDimensions.height / 2
    }

    const targetGroup = findGroupAtPosition(updatedGraph, nodeCenter)
    const allGroupsAtPosition = findAllGroupsAtPosition(nodeCenter)

    let validTargetGroup = targetGroup
    let isInvalid = false

    if (targetGroup && wouldExceedMaxDepth(draggingNodeId.value, targetGroup.id)) {
      validTargetGroup = undefined
    }

    // Check type compatibility
    if (
      targetGroup &&
      !isEntityTypeCompatibleWithGroup(updatedGraph, draggingNodeId.value, targetGroup.id)
    ) {
      isInvalid = true
      validTargetGroup = undefined
    }

    // Check if node with lockParent is being dragged outside its parent
    const originalParent = draggedNodeOriginalGroup.value
    if (node.lockParent && originalParent) {
      // Node must stay within original parent or its descendants
      const targetGroupId = targetGroup?.id || null
      if (
        targetGroupId !== originalParent &&
        !isGroupDescendantOf(updatedGraph, targetGroupId || '', originalParent)
      ) {
        isInvalid = true
        validTargetGroup = undefined
      }
    }

    invalidDropTarget.value = isInvalid
    // Keep allGroupsAtPosition in nodeOverGroupIds even when invalid (for visual feedback)
    nodeOverGroupIds.value = allGroupsAtPosition.map(g => g.id)
    // Only set nodeOverGroupId if valid (for actual drop logic)
    nodeOverGroupId.value = validTargetGroup?.id || null

    return true
  }

  const handleGroupDragMove = (
    newPosition: Position,
    findAllGroupsAtPosition: (position: Position) => WorkflowGroup[],
    isPointInRect: (
      point: Position,
      rect: { x: number; y: number; w: number; h: number }
    ) => boolean
  ): boolean => {
    if (!draggingGroupId.value) return false

    const updatedGraph = updateGroupPosition(graph.value, draggingGroupId.value, newPosition)
    onGraphUpdate(updatedGraph)

    const group = findGroup(updatedGraph, draggingGroupId.value)
    if (!group) return true

    const groupCenter = {
      x: group.position.x + group.size.w / 2,
      y: group.position.y + group.size.h / 2
    }

    const targetGroup = findDropTargetGroup(groupCenter.x, groupCenter.y, draggingGroupId.value)
    let allGroupsAtPosition = findAllGroupsAtPosition(groupCenter).filter(
      g => g.id !== draggingGroupId.value
    )

    const originalParent = draggedNodeOriginalGroup.value
    let centerInOriginalParent = false

    if (originalParent) {
      const parentGroup = findGroup(updatedGraph, originalParent)
      if (parentGroup) {
        centerInOriginalParent = isPointInRect(groupCenter, {
          x: parentGroup.position.x,
          y: parentGroup.position.y,
          w: parentGroup.size.w,
          h: parentGroup.size.h
        })
      }
    }

    let primaryTargetGroup: string | null = null
    let isInvalid = false

    if (targetGroup && !wouldExceedMaxDepth(draggingGroupId.value, targetGroup.id)) {
      primaryTargetGroup = targetGroup.id
    } else if (centerInOriginalParent && originalParent) {
      primaryTargetGroup = originalParent
    }

    // Check type compatibility
    if (
      targetGroup &&
      !isEntityTypeCompatibleWithGroup(updatedGraph, draggingGroupId.value, targetGroup.id)
    ) {
      isInvalid = true
      primaryTargetGroup = null
    }

    // Check if group with lockParent is being dragged outside its parent
    if (group.lockParent && originalParent && !centerInOriginalParent) {
      isInvalid = true
      primaryTargetGroup = originalParent
    }

    invalidDropTarget.value = isInvalid
    nodeOverGroupId.value = primaryTargetGroup
    // Keep allGroupsAtPosition in nodeOverGroupIds when hovering over groups (for visual feedback)
    nodeOverGroupIds.value =
      isInvalid || primaryTargetGroup ? allGroupsAtPosition.map(g => g.id) : []

    return true
  }

  const handleMouseUp = (
    isPointInRect: (
      point: Position,
      rect: { x: number; y: number; w: number; h: number }
    ) => boolean
  ) => {
    // Prevent re-entrant calls
    if (isHandlingMouseUp.value) {
      return
    }

    isHandlingMouseUp.value = true

    try {
      if (draggingGroupId.value) {
        const groupId = draggingGroupId.value
        const group = findGroup(graph.value, groupId)

        if (group) {
          const groupCenter = {
            x: group.position.x + group.size.w / 2,
            y: group.position.y + group.size.h / 2
          }
          let targetGroup = findDropTargetGroup(groupCenter.x, groupCenter.y, groupId)
          const originalParent = draggedNodeOriginalGroup.value

          let centerInOriginalParent = false
          if (originalParent) {
            const parentGroup = findGroup(graph.value, originalParent)
            if (parentGroup) {
              centerInOriginalParent = isPointInRect(groupCenter, {
                x: parentGroup.position.x,
                y: parentGroup.position.y,
                w: parentGroup.size.w,
                h: parentGroup.size.h
              })
            }
          }

          let updatedGraph = graph.value
          let parentChanged = false

          if (
            targetGroup &&
            targetGroup.id !== groupId &&
            !isGroupDescendantOf(updatedGraph, targetGroup.id, groupId) &&
            !wouldExceedMaxDepth(groupId, targetGroup.id) &&
            isEntityTypeCompatibleWithGroup(updatedGraph, groupId, targetGroup.id)
          ) {
            if (originalParent !== targetGroup.id) {
              parentChanged = true
              updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)

              if (originalParent) {
                updatedGraph = updateGroupBounds(updatedGraph, originalParent)
              }

              updatedGraph = addEntityToGroup(updatedGraph, groupId, targetGroup.id)

              if (parentChanged) {
                updatedGraph = {
                  ...updatedGraph,
                  edges: updatedGraph.edges.filter(
                    edge => edge.from.entityId !== groupId && edge.to.entityId !== groupId
                  )
                }
              }

              onGraphUpdate(updatedGraph)
              onEntityMovedToGroup(groupId, targetGroup.id)
            } else if (originalParent) {
              updatedGraph = updateGroupBounds(updatedGraph, originalParent)
              onGraphUpdate(updatedGraph)
            }
          } else if (centerInOriginalParent && originalParent) {
            updatedGraph = updateGroupBounds(updatedGraph, originalParent)
            onGraphUpdate(updatedGraph)
          } else if (originalParent && !centerInOriginalParent && !group.lockParent) {
            parentChanged = true
            updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)
            updatedGraph = updateGroupBounds(updatedGraph, originalParent)

            if (parentChanged) {
              updatedGraph = {
                ...updatedGraph,
                edges: updatedGraph.edges.filter(
                  edge => edge.from.entityId !== groupId && edge.to.entityId !== groupId
                )
              }
            }

            onGraphUpdate(updatedGraph)
            onEntityMovedToGroup(groupId, null)
          } else if (originalParent && !centerInOriginalParent && group.lockParent) {
            // Group has lockParent and is being dragged outside parent - restore original position
            if (draggedEntityOriginalPosition.value) {
              updatedGraph = updateGroupPosition(
                updatedGraph,
                groupId,
                draggedEntityOriginalPosition.value
              )
            }
            updatedGraph = updateGroupBounds(updatedGraph, originalParent)
            onGraphUpdate(updatedGraph)
          }

          const connectedEntities = getConnectedEntities(updatedGraph, groupId)
          onGroupDragEnd(
            groupId,
            group.position,
            getParentGroup(updatedGraph, groupId) || null,
            connectedEntities
          )
        }

        draggingGroupId.value = null
        draggedNodeOriginalGroup.value = null
        draggedEntityOriginalPosition.value = null
        nodeOverGroupId.value = null
        nodeOverGroupIds.value = []
        invalidDropTarget.value = false
      } else if (draggingNodeId.value) {
        const nodeId = draggingNodeId.value
        const node = findNode(graph.value, nodeId)

        if (node) {
          const nodeDimensions = { width: node.size?.w || 250, height: node.size?.h || 100 }
          const nodeCenter = {
            x: node.position.x + nodeDimensions.width / 2,
            y: node.position.y + nodeDimensions.height / 2
          }
          const targetGroup = findGroupAtPosition(graph.value, nodeCenter)
          const originalGroup = draggedNodeOriginalGroup.value

          let updatedGraph = graph.value
          let parentChanged = originalGroup !== (targetGroup?.id || null)

          // Check if node with lockParent is being moved outside its parent
          if (node.lockParent && originalGroup) {
            const targetGroupId = targetGroup?.id || null
            const isMovingOutsideParent =
              targetGroupId !== originalGroup &&
              !isGroupDescendantOf(updatedGraph, targetGroupId || '', originalGroup)

            if (isMovingOutsideParent) {
              // Restore original position
              if (draggedEntityOriginalPosition.value) {
                updatedGraph = updateNodePosition(
                  updatedGraph,
                  nodeId,
                  draggedEntityOriginalPosition.value
                )
              }
              updatedGraph = updateGroupBounds(updatedGraph, originalGroup)
              onGraphUpdate(updatedGraph)
              const connectedEntities = getConnectedEntities(updatedGraph, nodeId)
              onNodeDragEnd(
                nodeId,
                node.position,
                getParentGroup(updatedGraph, nodeId) || null,
                connectedEntities
              )

              draggingNodeId.value = null
              draggedNodeOriginalGroup.value = null
              draggedEntityOriginalPosition.value = null
              nodeOverGroupId.value = null
              nodeOverGroupIds.value = []
              invalidDropTarget.value = false
              return
            }
          }

          if (originalGroup) {
            updatedGraph = removeEntityFromAllGroups(updatedGraph, nodeId)
            updatedGraph = updateGroupBounds(updatedGraph, originalGroup)
          } else {
            updatedGraph = removeEntityFromAllGroups(updatedGraph, nodeId)
          }

          if (
            targetGroup &&
            !wouldExceedMaxDepth(nodeId, targetGroup.id) &&
            isEntityTypeCompatibleWithGroup(updatedGraph, nodeId, targetGroup.id)
          ) {
            updatedGraph = addEntityToGroup(updatedGraph, nodeId, targetGroup.id)

            // Auto-assign node type from group if node has no type
            const autoKind = getAutoAssignedNodeKind(
              updatedGraph,
              nodeId,
              targetGroup.id,
              nodeTypes.value
            )
            if (autoKind) {
              updatedGraph = {
                ...updatedGraph,
                nodes: updatedGraph.nodes.map(n => (n.id === nodeId ? { ...n, kind: autoKind } : n))
              }
            }
          }

          if (parentChanged) {
            updatedGraph = {
              ...updatedGraph,
              edges: updatedGraph.edges.filter(
                edge => edge.from.entityId !== nodeId && edge.to.entityId !== nodeId
              )
            }
          }

          onGraphUpdate(updatedGraph)

          if (targetGroup) {
            onEntityMovedToGroup(nodeId, targetGroup.id)
          } else if (originalGroup) {
            onEntityMovedToGroup(nodeId, null)
          }

          const connectedEntities = getConnectedEntities(updatedGraph, nodeId)
          onNodeDragEnd(
            nodeId,
            node.position,
            getParentGroup(updatedGraph, nodeId) || null,
            connectedEntities
          )
        }

        draggingNodeId.value = null
        draggedNodeOriginalGroup.value = null
        draggedEntityOriginalPosition.value = null
        nodeOverGroupId.value = null
        nodeOverGroupIds.value = []
        invalidDropTarget.value = false
      }
    } finally {
      // Use setTimeout to reset the flag after the current event loop
      // This prevents mousedown events triggered during re-render from starting a new drag
      setTimeout(() => {
        isHandlingMouseUp.value = false
      }, 0)
    }
  }

  return {
    draggingNodeId,
    draggingGroupId,
    dragOffset,
    draggedNodeOriginalGroup,
    nodeOverGroupId,
    nodeOverGroupIds,
    hoveredNodeGroupId,
    invalidDropTarget,
    handleNodeMouseDown,
    handleGroupMouseDown,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeDragMove,
    handleGroupDragMove,
    handleMouseUp
  }
}
