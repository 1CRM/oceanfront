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
  alignNodeInGroup,
  insertEntityInGroup,
  wireEntityIntoChain,
  normalizeGroupSpacing
} from '../utils/graph-helpers'

export interface InsertIndicator {
  groupId: string
  afterEntityId: string | null
  y: number
  x: number
  width: number
}

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
  onEntityReorder?: (entityId: string, groupId: string, afterEntityId: string | null) => void
  /** From `--wf-entity-spacing` on the canvas element */
  getEntitySpacing: () => number
  /** From `--wf-group-padding` on the canvas element */
  getGroupPadding: () => number
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
    onEdgeAdd,
    onEntityReorder,
    getEntitySpacing,
    getGroupPadding
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
  const insertIndicator = ref<InsertIndicator | null>(null)
  // `undefined` = not set, `null` = entity was first in its group
  const draggedEntityOriginalAfterEntityId = ref<string | null | undefined>(undefined)

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

    if (currentGroup) {
      const idx = currentGroup.containedIds.indexOf(node.id)
      draggedEntityOriginalAfterEntityId.value = idx > 0 ? currentGroup.containedIds[idx - 1] : null
    } else {
      draggedEntityOriginalAfterEntityId.value = undefined
    }

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

    if (currentParent) {
      const idx = currentParent.containedIds.indexOf(group.id)
      draggedEntityOriginalAfterEntityId.value =
        idx > 0 ? currentParent.containedIds[idx - 1] : null
    } else {
      draggedEntityOriginalAfterEntityId.value = undefined
    }

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

  /**
   * Given a target group and the Y-center of the dragged entity, compute the
   * insertion slot (the gap between two consecutive siblings, or before the
   * first / after the last) and return the indicator geometry.
   */
  const computeInsertionPoint = (
    currentGraph: WorkflowGraph,
    targetGroupId: string,
    draggedEntityId: string,
    draggedCenterY: number,
    nodeElements: Map<string, HTMLElement>,
    originalGroupId?: string | null,
    originalAfterEntityId?: string | null
  ): InsertIndicator | null => {
    const targetGroup = findGroup(currentGraph, targetGroupId)
    if (!targetGroup) return null

    // Resolve siblings (excluding the dragged entity itself)
    const siblings = targetGroup.containedIds
      .filter(id => id !== draggedEntityId)
      .map(id => {
        const node = findNode(currentGraph, id)
        if (node) {
          const dims = getNodeDimensions(node, nodeElements)
          return { id, y: node.position.y, h: dims.height, x: node.position.x, w: dims.width }
        }
        const grp = findGroup(currentGraph, id)
        if (grp) {
          return { id: grp.id, y: grp.position.y, h: grp.size.h, x: grp.position.x, w: grp.size.w }
        }
        return null
      })
      .filter(Boolean) as Array<{ id: string; y: number; h: number; x: number; w: number }>

    if (siblings.length === 0) return null

    // Sort by Y position
    siblings.sort((a, b) => a.y - b.y)

    // Compute gap midpoints and find the closest one to draggedCenterY
    interface Slot {
      afterEntityId: string | null
      y: number // Y coordinate for the indicator line
    }

    const slots: Slot[] = []

    // Slot before the first sibling
    const firstSib = siblings[0]
    slots.push({
      afterEntityId: null,
      y: firstSib.y - 10
    })

    // Slots between consecutive siblings
    for (let i = 0; i < siblings.length - 1; i++) {
      const above = siblings[i]
      const below = siblings[i + 1]
      const gapMid = (above.y + above.h + below.y) / 2
      slots.push({
        afterEntityId: above.id,
        y: gapMid
      })
    }

    // Slot after the last sibling
    const lastSib = siblings[siblings.length - 1]
    slots.push({
      afterEntityId: lastSib.id,
      y: lastSib.y + lastSib.h + 10
    })

    // Find the slot closest to the dragged entity center
    let bestSlot = slots[0]
    let bestDist = Math.abs(draggedCenterY - slots[0].y)
    for (let i = 1; i < slots.length; i++) {
      const dist = Math.abs(draggedCenterY - slots[i].y)
      if (dist < bestDist) {
        bestDist = dist
        bestSlot = slots[i]
      }
    }

    // Suppress indicator when the slot matches the entity's original position
    if (
      originalGroupId !== undefined &&
      targetGroupId === originalGroupId &&
      bestSlot.afterEntityId === originalAfterEntityId
    ) {
      return null
    }

    // Compute X and width from the group bounds (or sibling bounds)
    const indicatorX = targetGroup.position.x + 10
    const indicatorWidth = targetGroup.size.w - 20

    return {
      groupId: targetGroupId,
      afterEntityId: bestSlot.afterEntityId,
      y: bestSlot.y,
      x: indicatorX,
      width: Math.max(indicatorWidth, 60)
    }
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

    // Check if node with allowedParents is being dragged outside all allowed groups
    if (node.allowedParents && !validTargetGroup) {
      isInvalid = true
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

    // Compute insertion indicator when over a valid group with siblings and not swapping
    const hasGroupSiblings =
      validTargetGroup &&
      validTargetGroup.containedIds.filter(id => id !== draggingNodeId.value).length > 0

    if (validTargetGroup && hasGroupSiblings && !foundSwapTarget && !foundInvalidSwapTarget) {
      insertIndicator.value = computeInsertionPoint(
        updatedGraph,
        validTargetGroup.id,
        draggingNodeId.value,
        nodeCenter.y,
        nodeElements,
        draggedNodeOriginalGroup.value,
        draggedEntityOriginalAfterEntityId.value
      )
    } else {
      insertIndicator.value = null
    }

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

    // Check if group with allowedParents is being dragged outside all allowed groups
    if (group.allowedParents && !primaryTargetGroup) {
      isInvalid = true
      if (originalParent) {
        primaryTargetGroup = originalParent
      }
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

    // Compute insertion indicator when over a valid group
    if (primaryTargetGroup && !isInvalid) {
      insertIndicator.value = computeInsertionPoint(
        updatedGraph,
        primaryTargetGroup,
        draggingGroupId.value,
        groupCenter.y,
        new Map(),
        draggedNodeOriginalGroup.value,
        draggedEntityOriginalAfterEntityId.value
      )
    } else {
      insertIndicator.value = null
    }

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
      const currentInsertIndicator = insertIndicator.value

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
            if (originalParent !== targetGroup.id || currentInsertIndicator) {
              parentChanged = originalParent !== targetGroup.id

              updatedGraph = removeEntityEdgesAndBridge(updatedGraph, groupId, {
                edgeLocked: edgesLocked.value
              })

              if (currentInsertIndicator && currentInsertIndicator.groupId === targetGroup.id) {
                updatedGraph = insertEntityInGroup(
                  updatedGraph,
                  groupId,
                  targetGroup.id,
                  currentInsertIndicator.afterEntityId,
                  {
                    edgeLocked: edgesLocked.value,
                    entitySpacing: getEntitySpacing()
                  }
                )
                updatedGraph = wireEntityIntoChain(
                  updatedGraph,
                  groupId,
                  targetGroup.id,
                  currentInsertIndicator.afterEntityId,
                  { edgeLocked: edgesLocked.value }
                )
                if (parentChanged && originalParent) {
                  updatedGraph = normalizeGroupSpacing(
                    updatedGraph,
                    originalParent,
                    getEntitySpacing(),
                    getGroupPadding()
                  )
                }
              } else {
                updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)
                if (originalParent) {
                  updatedGraph = normalizeGroupSpacing(
                    updatedGraph,
                    originalParent,
                    getEntitySpacing(),
                    getGroupPadding()
                  )
                }
                updatedGraph = addEntityToGroup(updatedGraph, groupId, targetGroup.id)
              }

              onGraphUpdate(updatedGraph)
              onEntityMovedToGroup(groupId, targetGroup.id)

              if (currentInsertIndicator && onEntityReorder) {
                onEntityReorder(groupId, targetGroup.id, currentInsertIndicator.afterEntityId)
              }
            } else if (originalParent) {
              updatedGraph = updateGroupBounds(updatedGraph, originalParent, getGroupPadding())
              onGraphUpdate(updatedGraph)
            }
          } else if (centerInOriginalParent && originalParent) {
            // Same-group reorder via insert indicator
            if (currentInsertIndicator && currentInsertIndicator.groupId === originalParent) {
              updatedGraph = removeEntityEdgesAndBridge(updatedGraph, groupId, {
                edgeLocked: edgesLocked.value
              })
              updatedGraph = insertEntityInGroup(
                updatedGraph,
                groupId,
                originalParent,
                currentInsertIndicator.afterEntityId,
                {
                  edgeLocked: edgesLocked.value,
                  entitySpacing: getEntitySpacing()
                }
              )
              updatedGraph = wireEntityIntoChain(
                updatedGraph,
                groupId,
                originalParent,
                currentInsertIndicator.afterEntityId,
                { edgeLocked: edgesLocked.value }
              )
              onGraphUpdate(updatedGraph)
              if (onEntityReorder) {
                onEntityReorder(groupId, originalParent, currentInsertIndicator.afterEntityId)
              }
            } else {
              updatedGraph = updateGroupBounds(updatedGraph, originalParent, getGroupPadding())
              onGraphUpdate(updatedGraph)
            }
          } else if (
            originalParent &&
            !centerInOriginalParent &&
            !group.lockParent &&
            !group.requireGroup &&
            !group.allowedParents
          ) {
            parentChanged = true
            updatedGraph = removeEntityFromAllGroups(updatedGraph, groupId)
            updatedGraph = normalizeGroupSpacing(
              updatedGraph,
              originalParent,
              getEntitySpacing(),
              getGroupPadding()
            )

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
            (group.lockParent || group.requireGroup || group.allowedParents)
          ) {
            if (draggedEntityOriginalPosition.value) {
              updatedGraph = updateGroupPosition(
                updatedGraph,
                groupId,
                draggedEntityOriginalPosition.value
              )
            }
            updatedGraph = updateGroupBounds(updatedGraph, originalParent, getGroupPadding())
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
        draggedEntityOriginalAfterEntityId.value = undefined
        nodeOverGroupId.value = null
        nodeOverGroupIds.value = []
        invalidDropTarget.value = false
        insertIndicator.value = null
      } else if (draggingNodeId.value) {
        const nodeId = draggingNodeId.value
        const edgeIdsBefore = new Set(graph.value.edges.map(e => e.id))

        // Handle node swap if dragged onto a same-kind node
        if (swapTargetNodeId.value) {
          const targetId = swapTargetNodeId.value
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
          draggedEntityOriginalAfterEntityId.value = undefined
          nodeOverGroupId.value = null
          nodeOverGroupIds.value = []
          invalidDropTarget.value = false
          swapTargetNodeId.value = null
          invalidSwapTargetNodeId.value = null
          insertIndicator.value = null
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
              if (draggedEntityOriginalPosition.value) {
                updatedGraph = updateNodePosition(
                  updatedGraph,
                  nodeId,
                  draggedEntityOriginalPosition.value
                )
              }
              updatedGraph = updateGroupBounds(updatedGraph, originalGroup, getGroupPadding())
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
              draggedEntityOriginalAfterEntityId.value = undefined
              nodeOverGroupId.value = null
              nodeOverGroupIds.value = []
              invalidDropTarget.value = false
              swapTargetNodeId.value = null
              invalidSwapTargetNodeId.value = null
              insertIndicator.value = null
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
              updatedGraph = updateGroupBounds(updatedGraph, originalGroup, getGroupPadding())
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
            draggedEntityOriginalAfterEntityId.value = undefined
            nodeOverGroupId.value = null
            nodeOverGroupIds.value = []
            invalidDropTarget.value = false
            swapTargetNodeId.value = null
            invalidSwapTargetNodeId.value = null
            insertIndicator.value = null
            return
          }

          // Check if node with allowedParents is being moved outside allowed groups
          if (
            node.allowedParents &&
            (!targetGroup || !node.allowedParents.includes(targetGroup.kind))
          ) {
            if (draggedEntityOriginalPosition.value) {
              updatedGraph = updateNodePosition(
                updatedGraph,
                nodeId,
                draggedEntityOriginalPosition.value
              )
            }
            if (originalGroup) {
              updatedGraph = updateGroupBounds(updatedGraph, originalGroup, getGroupPadding())
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
            draggedEntityOriginalAfterEntityId.value = undefined
            nodeOverGroupId.value = null
            nodeOverGroupIds.value = []
            invalidDropTarget.value = false
            swapTargetNodeId.value = null
            invalidSwapTargetNodeId.value = null
            insertIndicator.value = null
            return
          }

          // Insert-between logic: if insertIndicator is set, use positional insertion
          if (currentInsertIndicator) {
            const targetGrpId = currentInsertIndicator.groupId

            // Remove from old edge chain (bridge old neighbors together)
            updatedGraph = removeEntityEdgesAndBridge(updatedGraph, nodeId, {
              edgeLocked: edgesLocked.value
            })

            // Insert at position within target group
            updatedGraph = insertEntityInGroup(
              updatedGraph,
              nodeId,
              targetGrpId,
              currentInsertIndicator.afterEntityId,
              {
                edgeLocked: edgesLocked.value,
                entitySpacing: getEntitySpacing()
              }
            )

            // Wire into new edge chain
            updatedGraph = wireEntityIntoChain(
              updatedGraph,
              nodeId,
              targetGrpId,
              currentInsertIndicator.afterEntityId,
              { edgeLocked: edgesLocked.value }
            )

            if (parentChanged && originalGroup) {
              updatedGraph = normalizeGroupSpacing(
                updatedGraph,
                originalGroup,
                getEntitySpacing(),
                getGroupPadding()
              )
            }

            // Auto-assign node type from group if node has no type
            const autoKind = getAutoAssignedNodeKind(
              updatedGraph,
              nodeId,
              targetGrpId,
              nodeTypes.value
            )
            if (autoKind) {
              updatedGraph = {
                ...updatedGraph,
                nodes: updatedGraph.nodes.map(n => (n.id === nodeId ? { ...n, kind: autoKind } : n))
              }
            }

            onGraphUpdate(updatedGraph)
            emitNewEdges(edgeIdsBefore, updatedGraph)
            onEntityMovedToGroup(nodeId, targetGrpId)

            if (onEntityReorder) {
              onEntityReorder(nodeId, targetGrpId, currentInsertIndicator.afterEntityId)
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
          } else if (!parentChanged && originalGroup) {
            // Node stayed in the same group with no reorder — just update bounds
            updatedGraph = updateGroupBounds(updatedGraph, originalGroup, getGroupPadding())
            onGraphUpdate(updatedGraph)
          } else {
            // Default behavior: move to a different group or to canvas root
            if (originalGroup) {
              updatedGraph = removeEntityFromAllGroups(updatedGraph, nodeId)
              updatedGraph = normalizeGroupSpacing(
                updatedGraph,
                originalGroup,
                getEntitySpacing(),
                getGroupPadding()
              )
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
                updatedGraph = alignNodeInGroup(
                  updatedGraph,
                  nodeId,
                  targetGroup.id,
                  getEntitySpacing()
                )
              }

              const autoKind = getAutoAssignedNodeKind(
                updatedGraph,
                nodeId,
                targetGroup.id,
                nodeTypes.value
              )
              if (autoKind) {
                updatedGraph = {
                  ...updatedGraph,
                  nodes: updatedGraph.nodes.map(n =>
                    n.id === nodeId ? { ...n, kind: autoKind } : n
                  )
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
        draggedEntityOriginalAfterEntityId.value = undefined
        nodeOverGroupId.value = null
        nodeOverGroupIds.value = []
        invalidDropTarget.value = false
        swapTargetNodeId.value = null
        invalidSwapTargetNodeId.value = null
        insertIndicator.value = null
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
    insertIndicator,
    handleNodeMouseDown,
    handleGroupMouseDown,
    handleNodeMouseEnter,
    handleNodeMouseLeave,
    handleNodeDragMove,
    handleGroupDragMove,
    handleMouseUp
  }
}
