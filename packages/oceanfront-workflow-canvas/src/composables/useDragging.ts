import { ref, type Ref } from 'vue'
import type {
  Position,
  WorkflowGraph,
  WorkflowEdge,
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
  getConnectedEntities,
  swapNodes,
  connectNodeToLastInGroup,
  removeEntityEdgesAndBridge,
  alignNodeInGroup
} from '../utils/graph-helpers'

export interface UseDraggingOptions {
  graph: Ref<WorkflowGraph>
  maxGroupDepth: Ref<number | null>
  readonly: Ref<boolean>
  edgesLocked: Ref<boolean>
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
  onNodeParentGroupChange?: (
    node: WorkflowNode,
    parentGroup: WorkflowGroup | null,
    connected: ConnectedEntities
  ) => void
  onNodeSwap: (nodeIdA: string, nodeIdB: string) => void
  onEdgeAdd?: (graph: WorkflowGraph, edge: WorkflowEdge) => void
}

export function useDragging(options: UseDraggingOptions) {
  const {
    graph,
    readonly,
    edgesLocked,
    canvasRef,
    nodeTypes,
    findDropTargetGroup,
    wouldExceedMaxDepth,
    onGraphUpdate,
    onNodeDragStart,
    onNodeDragEnd,
    onGroupDragStart,
    onGroupDragEnd,
    onEntityMovedToGroup,
    onNodeParentGroupChange,
    onNodeSwap,
    onEdgeAdd
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
  const swapTargetNodeId = ref<string | null>(null)
  const invalidSwapTargetNodeId = ref<string | null>(null)
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

    // Check if node with requireGroup is being dragged outside all groups
    if (node.requireGroup && !validTargetGroup) {
      isInvalid = true
    }

    invalidDropTarget.value = isInvalid
    // Keep allGroupsAtPosition in nodeOverGroupIds even when invalid (for visual feedback)
    nodeOverGroupIds.value = allGroupsAtPosition.map(g => g.id)
    // Only set nodeOverGroupId if valid (for actual drop logic)
    nodeOverGroupId.value = validTargetGroup?.id || null

    // Detect if the dragged node is over another node (for swap)
    let foundSwapTarget: string | null = null
    let foundInvalidSwapTarget: string | null = null
    for (const otherNode of updatedGraph.nodes) {
      if (otherNode.id === draggingNodeId.value) continue
      const otherDims = getNodeDimensions(otherNode, nodeElements)
      const otherRect = {
        x: otherNode.position.x,
        y: otherNode.position.y,
        w: otherDims.width,
        h: otherDims.height
      }
      const isOverNode =
        nodeCenter.x >= otherRect.x &&
        nodeCenter.x <= otherRect.x + otherRect.w &&
        nodeCenter.y >= otherRect.y &&
        nodeCenter.y <= otherRect.y + otherRect.h
      if (isOverNode) {
        if (otherNode.kind === node.kind && node.kind !== '') {
          foundSwapTarget = otherNode.id
        } else {
          foundInvalidSwapTarget = otherNode.id
        }
        break
      }
    }
    swapTargetNodeId.value = foundSwapTarget
    invalidSwapTargetNodeId.value = foundInvalidSwapTarget

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

    // Check if group with requireGroup is being dragged outside all groups
    if (group.requireGroup && !primaryTargetGroup) {
      isInvalid = true
      if (originalParent) {
        primaryTargetGroup = originalParent
      }
    }

    invalidDropTarget.value = isInvalid
    nodeOverGroupId.value = primaryTargetGroup
    // Keep allGroupsAtPosition in nodeOverGroupIds when hovering over groups (for visual feedback)
    nodeOverGroupIds.value =
      isInvalid || primaryTargetGroup ? allGroupsAtPosition.map(g => g.id) : []

    return true
  }

  const emitNewEdges = (before: Set<string>, updatedGraph: WorkflowGraph) => {
    if (!onEdgeAdd) return
    for (const edge of updatedGraph.edges) {
      if (!before.has(edge.id)) {
        onEdgeAdd(updatedGraph, edge)
      }
    }
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
        const edgeIdsBefore = new Set(graph.value.edges.map(e => e.id))

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
                updatedGraph = removeEntityEdgesAndBridge(updatedGraph, groupId, {
                  edgeLocked: edgesLocked.value
                })
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
          } else if (
            originalParent &&
            !centerInOriginalParent &&
            !group.lockParent &&
            !group.requireGroup
          ) {
            parentChanged = true
            updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)
            updatedGraph = updateGroupBounds(updatedGraph, originalParent)

            if (parentChanged) {
              updatedGraph = removeEntityEdgesAndBridge(updatedGraph, groupId, {
                edgeLocked: edgesLocked.value
              })
            }

            onGraphUpdate(updatedGraph)
            onEntityMovedToGroup(groupId, null)
          } else if (
            originalParent &&
            !centerInOriginalParent &&
            (group.lockParent || group.requireGroup)
          ) {
            // Group has lockParent/requireGroup and is being dragged outside parent - restore original position
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

          emitNewEdges(edgeIdsBefore, updatedGraph)

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
        const edgeIdsBefore = new Set(graph.value.edges.map(e => e.id))

        // Handle node swap if dragged onto a same-kind node
        if (swapTargetNodeId.value) {
          const targetId = swapTargetNodeId.value
          // Restore the dragged node to its original position before swapping,
          // so swapNodes exchanges the two original positions cleanly.
          let baseGraph = graph.value
          if (draggedEntityOriginalPosition.value) {
            baseGraph = updateNodePosition(baseGraph, nodeId, draggedEntityOriginalPosition.value)
          }
          const updatedGraph = swapNodes(baseGraph, nodeId, targetId)
          onGraphUpdate(updatedGraph)
          onNodeSwap(nodeId, targetId)

          draggingNodeId.value = null
          draggedNodeOriginalGroup.value = null
          draggedEntityOriginalPosition.value = null
          nodeOverGroupId.value = null
          nodeOverGroupIds.value = []
          invalidDropTarget.value = false
          swapTargetNodeId.value = null
          invalidSwapTargetNodeId.value = null
          return
        }

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
              swapTargetNodeId.value = null
              invalidSwapTargetNodeId.value = null
              return
            }
          }

          // Check if node with requireGroup is being moved outside all groups
          if (node.requireGroup && !targetGroup) {
            if (draggedEntityOriginalPosition.value) {
              updatedGraph = updateNodePosition(
                updatedGraph,
                nodeId,
                draggedEntityOriginalPosition.value
              )
            }
            if (originalGroup) {
              updatedGraph = updateGroupBounds(updatedGraph, originalGroup)
            }
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
            swapTargetNodeId.value = null
            invalidSwapTargetNodeId.value = null
            return
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
            if (parentChanged) {
              updatedGraph = alignNodeInGroup(updatedGraph, nodeId, targetGroup.id)
            }

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
            updatedGraph = removeEntityEdgesAndBridge(updatedGraph, nodeId, {
              edgeLocked: edgesLocked.value
            })

            if (targetGroup) {
              updatedGraph = connectNodeToLastInGroup(updatedGraph, nodeId, targetGroup.id, {
                edgeLocked: edgesLocked.value
              })
            }
          }

          onGraphUpdate(updatedGraph)
          emitNewEdges(edgeIdsBefore, updatedGraph)

          if (targetGroup) {
            onEntityMovedToGroup(nodeId, targetGroup.id)
          } else if (originalGroup) {
            onEntityMovedToGroup(nodeId, null)
          }

          if (parentChanged && onNodeParentGroupChange) {
            const updatedNode = findNode(updatedGraph, nodeId)
            if (updatedNode) {
              onNodeParentGroupChange(
                updatedNode,
                getParentGroup(updatedGraph, nodeId) || null,
                getConnectedEntities(updatedGraph, nodeId)
              )
            }
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
        swapTargetNodeId.value = null
        invalidSwapTargetNodeId.value = null
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
    swapTargetNodeId,
    invalidSwapTargetNodeId,
    handleNodeMouseDown,
    handleGroupMouseDown,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeDragMove,
    handleGroupDragMove,
    handleMouseUp
  }
}
