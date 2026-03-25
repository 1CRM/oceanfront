import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGroup,
  Position,
  Rect,
  AddStepEvent,
  ConnectEvent,
  Size,
  NodeTypeConfig,
  ConnectedEntities
} from '../types/workflow'

/**
 * Find a node by ID
 */
export const findNode = (graph: WorkflowGraph, nodeId: string): WorkflowNode | undefined =>
  graph.nodes.find(n => n.id === nodeId)

/**
 * Find a group by ID
 */
export const findGroup = (graph: WorkflowGraph, groupId: string): WorkflowGroup | undefined =>
  graph.groups.find(g => g.id === groupId)

/**
 * Find an entity (node or group) by ID (internal use only)
 */
const findEntity = (
  graph: WorkflowGraph,
  entityId: string
): WorkflowNode | WorkflowGroup | undefined => {
  const node = findNode(graph, entityId)
  if (node) return node
  return findGroup(graph, entityId)
}

/**
 * Update a node's position (immutable)
 */
export const updateNodePosition = (
  graph: WorkflowGraph,
  nodeId: string,
  position: Position
): WorkflowGraph => ({
  ...graph,
  nodes: graph.nodes.map(n => (n.id === nodeId ? { ...n, position } : n))
})

/**
 * Update multiple nodes' positions (immutable)
 */
export function updateNodesPositions(
  graph: WorkflowGraph,
  updates: Array<{ nodeId: string; position: Position }>
): WorkflowGraph {
  const updateMap = new Map(updates.map(u => [u.nodeId, u.position]))
  return {
    ...graph,
    nodes: graph.nodes.map(n => {
      const newPos = updateMap.get(n.id)
      return newPos ? { ...n, position: newPos } : n
    })
  }
}

/**
 * Add an edge to the graph (immutable)
 * Automatically removes existing connections:
 * - Removes any existing outgoing edge from the source entity
 * - Removes any existing incoming edge to the target entity
 */
export function addEdge(graph: WorkflowGraph, edge: WorkflowEdge): WorkflowGraph {
  // Check if edge already exists
  const exists = graph.edges.some(
    e => e.from.entityId === edge.from.entityId && e.to.entityId === edge.to.entityId
  )
  if (exists) return graph

  // Remove any existing outgoing edge from the source entity (one output per entity)
  // Remove any existing incoming edge to the target entity (one input per entity)
  const filteredEdges = graph.edges.filter(
    e => e.from.entityId !== edge.from.entityId && e.to.entityId !== edge.to.entityId
  )

  return {
    ...graph,
    edges: [...filteredEdges, edge]
  }
}

/**
 * Remove an edge by ID (immutable)
 */
export function removeEdge(graph: WorkflowGraph, edgeId: string): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.filter(e => e.id !== edgeId)
  }
}

/**
 * Remove all edges incident on an entity and, when the entity had exactly
 * one incoming AND one outgoing edge whose endpoints are distinct, bridge
 * the predecessor directly to the successor.
 *
 * Designed for delete-node / delete-group / reparent-move flows.
 */
export function removeEntityEdgesAndBridge(
  graph: WorkflowGraph,
  entityId: string,
  options?: {
    edgeIdGenerator?: () => string
    edgeLocked?: boolean
  }
): WorkflowGraph {
  const incomingEdge = graph.edges.find(e => e.to.entityId === entityId)
  const outgoingEdge = graph.edges.find(e => e.from.entityId === entityId)

  const filteredEdges = graph.edges.filter(
    e => e.from.entityId !== entityId && e.to.entityId !== entityId
  )

  let updatedGraph: WorkflowGraph = { ...graph, edges: filteredEdges }

  if (incomingEdge && outgoingEdge) {
    const fromId = incomingEdge.from.entityId
    const toId = outgoingEdge.to.entityId

    if (fromId !== toId) {
      const fromExists = findNode(updatedGraph, fromId) || findGroup(updatedGraph, fromId)
      const toExists = findNode(updatedGraph, toId) || findGroup(updatedGraph, toId)

      if (fromExists && toExists) {
        const edgeIdGen = options?.edgeIdGenerator || (() => `edge-${Date.now()}-${idCounter++}`)

        updatedGraph = addEdge(updatedGraph, {
          id: edgeIdGen(),
          from: { entityId: fromId },
          to: { entityId: toId },
          ...(options?.edgeLocked !== undefined && { locked: options.edgeLocked })
        })
      }
    }
  }

  return updatedGraph
}

/**
 * Check if an entity's type is compatible with a target group's type
 * - Nodes can be added to any group (node kinds and group kinds are separate namespaces)
 * - Groups can only be added to groups with matching kinds (or no kind)
 * Returns true if:
 * - Entity is a node (nodes can always be added to groups)
 * - Entity is a group with no kind
 * - Target group has no kind
 * - Both are groups with matching kinds
 * Returns false if:
 * - Entity is a group with a kind that doesn't match the target group's kind
 */
export function isEntityTypeCompatibleWithGroup(
  graph: WorkflowGraph,
  entityId: string,
  targetGroupId: string
): boolean {
  const node = findNode(graph, entityId)
  const entityGroup = findGroup(graph, entityId)
  const targetGroup = findGroup(graph, targetGroupId)

  if (!targetGroup) return true

  // If entity is a node, always allow (node kinds and group kinds are separate)
  if (node) return true

  // Entity is a group - check kind compatibility for nested groups
  if (!entityGroup) return true

  const entityKind = entityGroup.kind || ''
  const groupKind = targetGroup.kind || ''

  // If either has no kind, allow
  if (!entityKind || !groupKind) return true

  // Both have kinds - they must match
  return entityKind === groupKind
}

/**
 * Add an entity (node or group) to a group (immutable)
 * Automatically updates the group bounds to fit the new entity
 * Validates type compatibility before adding
 */
export function addEntityToGroup(
  graph: WorkflowGraph,
  entityId: string,
  groupId: string
): WorkflowGraph {
  // Check type compatibility before adding
  if (!isEntityTypeCompatibleWithGroup(graph, entityId, groupId)) {
    return graph // Silent fail - return unchanged graph
  }

  let updatedGraph = {
    ...graph,
    groups: graph.groups.map(g => {
      if (g.id === groupId && !g.containedIds.includes(entityId)) {
        return { ...g, containedIds: [...g.containedIds, entityId] }
      }
      return g
    })
  }

  // Update the group bounds to fit the new entity
  updatedGraph = updateGroupBounds(updatedGraph, groupId)

  return updatedGraph
}

/**
 * Remove an entity from a group (immutable)
 */
export function removeEntityFromGroup(
  graph: WorkflowGraph,
  entityId: string,
  groupId: string
): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => {
      if (g.id === groupId) {
        return { ...g, containedIds: g.containedIds.filter(id => id !== entityId) }
      }
      return g
    })
  }
}

/**
 * Remove an entity from all groups (immutable)
 */
export function removeEntityFromAllGroups(graph: WorkflowGraph, entityId: string): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => ({
      ...g,
      containedIds: g.containedIds.filter(id => id !== entityId)
    }))
  }
}

/**
 * Check if a point is inside a rectangle
 */
export const isPointInRect = (point: Position, rect: Rect): boolean =>
  point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h

/**
 * Find which group (if any) contains a position (returns innermost group for nested groups)
 */
export function findGroupAtPosition(
  graph: WorkflowGraph,
  position: Position
): WorkflowGroup | undefined {
  // Find all groups that contain the position
  const matchingGroups = graph.groups.filter(g => {
    const rect: Rect = {
      x: g.position.x,
      y: g.position.y,
      w: g.size.w,
      h: g.size.h
    }
    return isPointInRect(position, rect)
  })

  if (matchingGroups.length === 0) return undefined
  if (matchingGroups.length === 1) return matchingGroups[0]

  // Return the group with the highest depth (innermost)
  return matchingGroups.reduce((deepest, current) => {
    const deepestDepth = getGroupDepth(graph, deepest.id)
    const currentDepth = getGroupDepth(graph, current.id)
    return currentDepth > deepestDepth ? current : deepest
  })
}

/**
 * Get all edges connected to an entity (node or group)
 */
export const getEntityEdges = (graph: WorkflowGraph, entityId: string): WorkflowEdge[] =>
  graph.edges.filter(e => e.from.entityId === entityId || e.to.entityId === entityId)

/**
 * Get connected entities for a node or group
 * Returns entities that have edges pointing TO this entity (incoming) and
 * entities that this entity has edges pointing TO (outgoing)
 */
export function getConnectedEntities(graph: WorkflowGraph, entityId: string): ConnectedEntities {
  const incoming: (WorkflowNode | WorkflowGroup)[] = []
  const outgoing: (WorkflowNode | WorkflowGroup)[] = []

  // Find all edges connected to this entity
  graph.edges.forEach(edge => {
    if (edge.to.entityId === entityId) {
      // This is an incoming edge
      const entity = findNode(graph, edge.from.entityId) || findGroup(graph, edge.from.entityId)
      if (entity) incoming.push(entity)
    }
    if (edge.from.entityId === entityId) {
      // This is an outgoing edge
      const entity = findNode(graph, edge.to.entityId) || findGroup(graph, edge.to.entityId)
      if (entity) outgoing.push(entity)
    }
  })

  return { incoming, outgoing }
}

/**
 * Get the parent group that contains an entity (node or group)
 */
export const getParentGroup = (graph: WorkflowGraph, entityId: string): WorkflowGroup | undefined =>
  graph.groups.find(g => g.containedIds.includes(entityId))

/**
 * Get all descendants (recursive) of a group
 * Returns an array of all entity IDs (nodes and groups) contained within the group
 */
export function getGroupDescendants(graph: WorkflowGraph, groupId: string): string[] {
  const group = findGroup(graph, groupId)
  if (!group) return []

  const descendants: string[] = []
  const toProcess = [...group.containedIds]

  while (toProcess.length > 0) {
    const entityId = toProcess.shift()!
    descendants.push(entityId)

    const childGroup = findGroup(graph, entityId)
    if (childGroup) {
      toProcess.push(...childGroup.containedIds)
    }
  }

  return descendants
}

/**
 * Check if a group is a descendant of another group (i.e., nested inside it)
 */
export function isGroupDescendantOf(
  graph: WorkflowGraph,
  groupId: string,
  potentialAncestorId: string
): boolean {
  const descendants = getGroupDescendants(graph, potentialAncestorId)
  return descendants.includes(groupId)
}

/**
 * Check if two entities belong to different groups
 * Returns true if entities are in different groups, false if they're in the same group or both ungrouped
 */
export function areEntitiesInDifferentGroups(
  graph: WorkflowGraph,
  entityId1: string,
  entityId2: string
): boolean {
  const group1 = getParentGroup(graph, entityId1)
  const group2 = getParentGroup(graph, entityId2)

  // If both are ungrouped, they're in the same context
  if (!group1 && !group2) return false

  // If one is grouped and the other isn't, they're different
  if (!group1 || !group2) return true

  // If both are grouped, check if it's the same group
  return group1.id !== group2.id
}

/**
 * Get nesting depth of a group (0 = top-level)
 */
export function getGroupDepth(graph: WorkflowGraph, groupId: string): number {
  let depth = 0
  let currentId: string | undefined = groupId

  while (currentId) {
    const parent = getParentGroup(graph, currentId)
    if (!parent) break
    depth++
    currentId = parent.id
  }

  return depth
}

/**
 * Calculate the bounding box for a group based on its contained entities (recursive)
 * Adds padding around the entities
 */
export function calculateGroupBounds(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20
): Rect {
  const group = findGroup(graph, groupId)
  if (!group || group.containedIds.length === 0) {
    // Default size for empty group (suitable for one node)
    // Preserve the current position if the group exists
    return group
      ? { x: group.position.x, y: group.position.y, w: 290, h: 140 }
      : { x: 0, y: 0, w: 290, h: 140 }
  }

  const entities = group.containedIds.map(id => findEntity(graph, id)).filter(Boolean) as (
    | WorkflowNode
    | WorkflowGroup
  )[]

  if (entities.length === 0) {
    // Preserve the current position
    return { x: group.position.x, y: group.position.y, w: 290, h: 140 }
  }

  // Find bounds of all entities
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  entities.forEach(entity => {
    let entityX: number
    let entityY: number
    let entityW: number
    let entityH: number

    if ('kind' in entity && 'containedIds' in entity) {
      // It's a group
      entityX = entity.position.x
      entityY = entity.position.y
      entityW = entity.size.w
      entityH = entity.size.h
    } else {
      // It's a node
      entityX = entity.position.x
      entityY = entity.position.y
      entityW = entity.size?.w || 250
      entityH = entity.size?.h || 100
    }

    minX = Math.min(minX, entityX)
    minY = Math.min(minY, entityY)
    maxX = Math.max(maxX, entityX + entityW)
    maxY = Math.max(maxY, entityY + entityH)
  })

  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2
  }
}

/**
 * Update group position and size based on its contained entities
 * Also recursively updates all parent groups in the hierarchy
 */
export function updateGroupBounds(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20,
  visitedGroups: Set<string> = new Set()
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

  // Prevent infinite recursion by checking if we've already processed this group
  if (visitedGroups.has(groupId)) {
    console.warn(`[updateGroupBounds] Circular reference detected for group ${groupId}`)
    return graph
  }

  // Add this group to the visited set
  visitedGroups.add(groupId)

  const newBounds = calculateGroupBounds(graph, groupId, padding)

  let updatedGraph = {
    ...graph,
    groups: graph.groups.map(g =>
      g.id === groupId
        ? {
            ...g,
            position: { x: newBounds.x, y: newBounds.y },
            size: { w: newBounds.w, h: newBounds.h }
          }
        : g
    )
  }

  // Recursively update parent group if this group is nested
  const parentGroup = getParentGroup(updatedGraph, groupId)
  if (parentGroup) {
    updatedGraph = updateGroupBounds(updatedGraph, parentGroup.id, padding, visitedGroups)
  }

  return updatedGraph
}

/**
 * Update a group's position and move all contained entities accordingly (recursive)
 * @param graph - The workflow graph
 * @param groupId - The group to move
 * @param newPosition - The new position for the group's top-left corner
 * @returns Updated graph with moved group and all contained entities
 */
export function updateGroupPosition(
  graph: WorkflowGraph,
  groupId: string,
  newPosition: Position
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

  // Calculate the delta (how much the group moved)
  const deltaX = newPosition.x - group.position.x
  const deltaY = newPosition.y - group.position.y

  // Get all descendants (recursive)
  const descendants = getGroupDescendants(graph, groupId)

  // Update all nodes within the group and its descendants by the same delta
  const updatedNodes = graph.nodes.map(node => {
    if (descendants.includes(node.id)) {
      return {
        ...node,
        position: {
          x: node.position.x + deltaX,
          y: node.position.y + deltaY
        }
      }
    }
    return node
  })

  // Update all groups within the group and the group itself
  const updatedGroups = graph.groups.map(g => {
    if (g.id === groupId) {
      return {
        ...g,
        position: newPosition
      }
    }
    if (descendants.includes(g.id)) {
      return {
        ...g,
        position: {
          x: g.position.x + deltaX,
          y: g.position.y + deltaY
        }
      }
    }
    return g
  })

  return {
    ...graph,
    nodes: updatedNodes,
    groups: updatedGroups
  }
}

/**
 * Default ID generator using timestamp and counter to ensure uniqueness
 */
let idCounter = 0
const defaultIdGenerator = (prefix: string) => () => {
  const timestamp = Date.now()
  const counter = idCounter++
  return `${prefix}-${timestamp}-${counter}`
}

/**
 * Move all nodes below a Y threshold down by a specified offset
 * This is useful when inserting a new node and needing to make space
 * @param graph - The workflow graph
 * @param yThreshold - The Y position threshold (nodes at or below this will be moved)
 * @param offset - How much to move the nodes down (in pixels)
 * @param excludeNodeId - Optional node ID to exclude from movement (e.g., the newly inserted node)
 * @returns Updated graph with moved nodes
 */
export function moveNodesBelow(
  graph: WorkflowGraph,
  yThreshold: number,
  offset: number,
  excludeNodeId?: string
): WorkflowGraph {
  const updatedNodes = graph.nodes.map(node => {
    // Skip the excluded node (if specified)
    if (excludeNodeId && node.id === excludeNodeId) {
      return node
    }

    // Move nodes at or below the threshold
    if (node.position.y >= yThreshold) {
      return {
        ...node,
        position: {
          ...node.position,
          y: node.position.y + offset
        }
      }
    }

    return node
  })

  return {
    ...graph,
    nodes: updatedNodes
  }
}

/**
 * Handle adding a step to the workflow graph
 * Inserts a new node after a specified node, handling edge reconnection
 * @param graph - The workflow graph
 * @param event - The add step event with afterNodeId and optional inGroupId
 * @param options - Optional configuration for node creation
 * @returns Updated graph and the new node ID
 */
export function handleAddStepToGraph(
  graph: WorkflowGraph,
  event: AddStepEvent,
  options?: {
    nodeIdGenerator?: () => string
    edgeIdGenerator?: () => string
    defaultNodeData?: unknown
    defaultKind?: string
    /** Vertical gap between nodes; should match `--wf-entity-spacing` when used from the canvas */
    entitySpacing?: number
  }
): { graph: WorkflowGraph; newNodeId: string } {
  const nodeIdGenerator = options?.nodeIdGenerator || defaultIdGenerator('node')
  const edgeIdGenerator = options?.edgeIdGenerator || defaultIdGenerator('edge')
  const defaultKind = options?.defaultKind || ''
  const nodeSpacing = options?.entitySpacing ?? 20

  const newNodeId = nodeIdGenerator()
  const afterNode = event.afterNodeId ? findNode(graph, event.afterNodeId) : null

  // Find the edge from the afterNode (if it exists)
  const existingEdge = event.afterNodeId
    ? graph.edges.find((e: WorkflowEdge) => e.from.entityId === event.afterNodeId)
    : null

  // Calculate position between the two nodes if there's an existing edge
  let position: Position
  let shouldMoveNodesBelow = false
  const nodeHeight = 100 // Default node height
  const totalOffset = nodeHeight + nodeSpacing

  if (afterNode && existingEdge) {
    const toNode = findNode(graph, existingEdge.to.entityId)
    if (toNode) {
      // Place new node below the afterNode
      const afterNodeHeight = afterNode.size?.h || nodeHeight
      position = {
        x: afterNode.position.x,
        y: afterNode.position.y + afterNodeHeight + nodeSpacing
      }
      // We need to move all nodes at or below the toNode's position
      shouldMoveNodesBelow = true
    } else {
      // Fallback: place below the afterNode
      position = { x: afterNode.position.x, y: afterNode.position.y + 150 }
    }
  } else if (afterNode) {
    // No existing edge, place below the afterNode
    position = { x: afterNode.position.x, y: afterNode.position.y + 150 }
  } else {
    // No afterNode specified, place at default position
    position = { x: 100, y: 100 }
  }

  // Move all nodes below the insertion point down to make space
  let workingGraph = graph
  if (shouldMoveNodesBelow && existingEdge) {
    const toNode = findNode(graph, existingEdge.to.entityId)
    if (toNode) {
      // Move all nodes at or below the target node's position
      workingGraph = moveNodesBelow(graph, toNode.position.y, totalOffset)
    }
  }

  // Create the new node
  const newNode: WorkflowNode = {
    id: newNodeId,
    kind: defaultKind,
    position
  }

  let updatedGraph: WorkflowGraph = {
    ...workingGraph,
    nodes: [...workingGraph.nodes, newNode]
  }

  // If the source node is in a group, add the new node to the same group
  // Type compatibility is checked within addEntityToGroup
  if (event.inGroupId) {
    updatedGraph = addEntityToGroup(updatedGraph, newNodeId, event.inGroupId)
  }

  // If there's an existing edge, we need to:
  // 1. Remove the old edge
  // 2. Create edge from afterNode to newNode
  // 3. Create edge from newNode to the original target
  if (existingEdge && event.afterNodeId) {
    const targetNodeId = existingEdge.to.entityId

    // Remove the old edge
    updatedGraph = {
      ...updatedGraph,
      edges: updatedGraph.edges.filter((e: WorkflowEdge) => e.id !== existingEdge.id)
    }

    // Add edge from afterNode to new node
    updatedGraph = addEdge(updatedGraph, {
      id: edgeIdGenerator(),
      from: { entityId: event.afterNodeId },
      to: { entityId: newNodeId }
    })

    // Add edge from new node to original target
    updatedGraph = addEdge(updatedGraph, {
      id: edgeIdGenerator(),
      from: { entityId: newNodeId },
      to: { entityId: targetNodeId }
    })
  } else if (event.afterNodeId) {
    // No existing edge, just create one from afterNode to newNode
    updatedGraph = addEdge(updatedGraph, {
      id: edgeIdGenerator(),
      from: { entityId: event.afterNodeId },
      to: { entityId: newNodeId }
    })
  }

  // Update group bounds for all affected groups
  // Collect all unique group IDs that contain nodes that were moved
  if (shouldMoveNodesBelow) {
    const affectedGroupIds = new Set<string>()

    // Find all groups that contain moved nodes
    updatedGraph.nodes.forEach(node => {
      const parentGroup = getParentGroup(updatedGraph, node.id)
      if (parentGroup) {
        affectedGroupIds.add(parentGroup.id)
      }
    })

    // Update bounds for each affected group (this handles parent updates recursively)
    affectedGroupIds.forEach(groupId => {
      updatedGraph = updateGroupBounds(updatedGraph, groupId)
    })
  }

  return { graph: updatedGraph, newNodeId }
}

/**
 * Handle connecting two nodes in the workflow graph
 * @param graph - The workflow graph
 * @param event - The connect event with fromNodeId and toNodeId
 * @param options - Optional configuration for edge creation
 * @returns Updated graph
 */
export function handleConnectNodes(
  graph: WorkflowGraph,
  event: ConnectEvent,
  options?: {
    edgeIdGenerator?: () => string
    edgeLocked?: boolean
  }
): WorkflowGraph {
  const edgeIdGenerator = options?.edgeIdGenerator || defaultIdGenerator('edge')

  return addEdge(graph, {
    id: edgeIdGenerator(),
    from: {
      entityId: event.fromNodeId,
      ...(event.fromPosition && { position: event.fromPosition })
    },
    to: {
      entityId: event.toNodeId,
      ...(event.toPosition && { position: event.toPosition })
    },
    ...(options?.edgeLocked !== undefined && { locked: options.edgeLocked })
  })
}

/**
 * Connect a node to the last existing node in a group.
 * The "last" node is determined by the group's containedIds order.
 */
export function connectNodeToLastInGroup(
  graph: WorkflowGraph,
  nodeId: string,
  groupId: string,
  options?: {
    edgeIdGenerator?: () => string
    edgeLocked?: boolean
  }
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  const node = findNode(graph, nodeId)

  if (!group || !node || !group.containedIds.includes(nodeId)) {
    return graph
  }

  const previousEntityId = [...group.containedIds]
    .reverse()
    .find(id => id !== nodeId && (!!findNode(graph, id) || !!findGroup(graph, id)))

  if (!previousEntityId) {
    return graph
  }

  const edgeIdGenerator = options?.edgeIdGenerator || defaultIdGenerator('edge')

  return addEdge(graph, {
    id: edgeIdGenerator(),
    from: { entityId: previousEntityId },
    to: { entityId: nodeId },
    ...(options?.edgeLocked !== undefined && { locked: options.edgeLocked })
  })
}

/**
 * Add a new node to the workflow graph
 * @param graph - The workflow graph
 * @param options - Optional configuration for node creation
 * @returns Updated graph and the new node ID
 */
export function addNode(
  graph: WorkflowGraph,
  options?: {
    nodeIdGenerator?: () => string
    position?: Position
    nodeData?: unknown
    kind?: string
  }
): { graph: WorkflowGraph; newNodeId: string } {
  const nodeIdGenerator = options?.nodeIdGenerator || defaultIdGenerator('node')
  const defaultKind = options?.kind || ''

  const newNodeId = nodeIdGenerator()

  // Calculate position: find the bottommost node and place new node below it
  let position: Position
  if (options?.position) {
    position = options.position
  } else {
    let maxY = 0
    graph.nodes.forEach((node: WorkflowNode) => {
      const nodeBottom = node.position.y + (node.size?.h || 100)
      if (nodeBottom > maxY) {
        maxY = nodeBottom
      }
    })
    position = { x: 100, y: maxY + 50 }
  }

  // Create new node
  const newNode: WorkflowNode = {
    id: newNodeId,
    kind: defaultKind,
    position
  }

  const updatedGraph: WorkflowGraph = {
    ...graph,
    nodes: [...graph.nodes, newNode]
  }

  return { graph: updatedGraph, newNodeId }
}

/**
 * Add a new group to the workflow graph
 * @param graph - The workflow graph
 * @param options - Optional configuration for group creation
 * @returns Updated graph and the new group ID
 */
export function addGroup(
  graph: WorkflowGraph,
  options?: {
    groupIdGenerator?: () => string
    position?: Position
    label?: string
    size?: Size
    kind?: string
  }
): { graph: WorkflowGraph; newGroupId: string } {
  const groupIdGenerator = options?.groupIdGenerator || defaultIdGenerator('group')
  // Note: This default label should typically be overridden by the caller using labels from WorkflowCanvasLabels
  // See DEFAULT_LABELS.defaultGroupLabel for the internationalized version
  const defaultLabel = options?.label || 'New Group'
  const defaultSize = options?.size || { w: 290, h: 140 }
  const defaultKind = options?.kind || 'group'

  const newGroupId = groupIdGenerator()

  // Calculate position: find the rightmost node/group and place new group to the right
  let position: Position
  if (options?.position) {
    position = options.position
  } else {
    let maxX = 0
    graph.nodes.forEach((node: WorkflowNode) => {
      const nodeRight = node.position.x + (node.size?.w || 250)
      if (nodeRight > maxX) {
        maxX = nodeRight
      }
    })

    graph.groups.forEach((group: WorkflowGroup) => {
      const groupRight = group.position.x + group.size.w
      if (groupRight > maxX) {
        maxX = groupRight
      }
    })

    position = { x: maxX + 50, y: 100 }
  }

  // Create new group (empty, suitable size for one node)
  const newGroup: WorkflowGroup = {
    id: newGroupId,
    kind: defaultKind,
    label: defaultLabel,
    position,
    size: defaultSize,
    containedIds: []
  }

  const updatedGraph: WorkflowGraph = {
    ...graph,
    groups: [...graph.groups, newGroup]
  }

  return { graph: updatedGraph, newGroupId }
}

/**
 * Align a node within its group: horizontally aligned with siblings,
 * vertically stacked below the bottommost sibling.
 * Only repositions when the group has other entities (siblings) to align with.
 * After repositioning the node, recalculates group bounds (and parent bounds recursively).
 */
export function alignNodeInGroup(
  graph: WorkflowGraph,
  nodeId: string,
  groupId: string,
  entitySpacing: number = 20
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  const node = findNode(graph, nodeId)
  if (!group || !node) return graph

  const siblings = group.containedIds
    .filter(id => id !== nodeId)
    .map(id => findEntity(graph, id))
    .filter(Boolean) as (WorkflowNode | WorkflowGroup)[]

  if (siblings.length === 0) {
    return graph
  }

  const firstSibling = siblings[0]
  const newX = firstSibling.position.x

  let maxBottom = -Infinity
  for (const sib of siblings) {
    const sibH = 'containedIds' in sib ? sib.size.h : (sib as WorkflowNode).size?.h || 100
    const sibBottom = sib.position.y + sibH
    if (sibBottom > maxBottom) maxBottom = sibBottom
  }
  const newY = maxBottom + entitySpacing

  let updatedGraph: WorkflowGraph = {
    ...graph,
    nodes: graph.nodes.map(n => (n.id === nodeId ? { ...n, position: { x: newX, y: newY } } : n))
  }

  updatedGraph = updateGroupBounds(updatedGraph, groupId)

  return updatedGraph
}

/**
 * Get the auto-assigned node kind based on the parent group's kind
 * Only assigns if:
 * 1. Node has no kind (empty string)
 * 2. Group has a kind that exists in nodeTypes
 * @param graph - The workflow graph
 * @param nodeId - The node to check
 * @param groupId - The parent group
 * @param nodeTypes - Available node type configurations
 * @returns The kind to assign, or null if no auto-assignment should occur
 */
export function getAutoAssignedNodeKind(
  graph: WorkflowGraph,
  nodeId: string,
  groupId: string,
  nodeTypes: NodeTypeConfig
): string | null {
  const node = findNode(graph, nodeId)
  const group = findGroup(graph, groupId)

  // Only auto-assign if node has no type
  if (!node || node.kind) return null

  // Only auto-assign if group kind exists in nodeTypes
  if (group && group.kind && nodeTypes[group.kind]) {
    return group.kind
  }

  return null
}

/**
 * Swap two nodes completely: positions, edge connections, and group membership.
 * Both nodes must exist in the graph; returns the graph unchanged if either is missing.
 */
export function swapNodes(graph: WorkflowGraph, nodeIdA: string, nodeIdB: string): WorkflowGraph {
  const nodeA = findNode(graph, nodeIdA)
  const nodeB = findNode(graph, nodeIdB)
  if (!nodeA || !nodeB) return graph

  // Swap positions
  const updatedNodes = graph.nodes.map(n => {
    if (n.id === nodeIdA) return { ...n, position: { ...nodeB.position } }
    if (n.id === nodeIdB) return { ...n, position: { ...nodeA.position } }
    return n
  })

  // Swap edge references: A↔B in both from.entityId and to.entityId
  const updatedEdges = graph.edges.map(e => {
    let from = e.from
    let to = e.to
    if (from.entityId === nodeIdA) from = { ...from, entityId: nodeIdB }
    else if (from.entityId === nodeIdB) from = { ...from, entityId: nodeIdA }
    if (to.entityId === nodeIdA) to = { ...to, entityId: nodeIdB }
    else if (to.entityId === nodeIdB) to = { ...to, entityId: nodeIdA }
    if (from !== e.from || to !== e.to) return { ...e, from, to }
    return e
  })

  // Swap group membership: replace A↔B in every group's containedIds
  const updatedGroups = graph.groups.map(g => {
    const hasA = g.containedIds.includes(nodeIdA)
    const hasB = g.containedIds.includes(nodeIdB)
    if (!hasA && !hasB) return g
    return {
      ...g,
      containedIds: g.containedIds.map(id => {
        if (id === nodeIdA) return nodeIdB
        if (id === nodeIdB) return nodeIdA
        return id
      })
    }
  })

  return { nodes: updatedNodes, edges: updatedEdges, groups: updatedGroups }
}

/**
 * Insert an entity into a group at a specific position within containedIds.
 * Positions the inserted entity at the correct slot and normalizes spacing
 * for all siblings so that no gaps are left at the entity's old position.
 *
 * @param afterEntityId - The entity after which to insert. null = insert at the beginning.
 * @param options.entitySpacing - Vertical gap between entities (default 20)
 */
export function insertEntityInGroup(
  graph: WorkflowGraph,
  entityId: string,
  groupId: string,
  afterEntityId: string | null,
  options?: {
    entitySpacing?: number
    edgeIdGenerator?: () => string
    edgeLocked?: boolean
  }
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

  const spacing = options?.entitySpacing ?? 20

  let updatedGraph = removeEntityFromAllGroups(graph, entityId)

  const currentIds = updatedGraph.groups.find(g => g.id === groupId)!.containedIds
  let newContainedIds: string[]

  if (afterEntityId === null) {
    newContainedIds = [entityId, ...currentIds]
  } else {
    const idx = currentIds.indexOf(afterEntityId)
    if (idx === -1) {
      newContainedIds = [...currentIds, entityId]
    } else {
      newContainedIds = [...currentIds.slice(0, idx + 1), entityId, ...currentIds.slice(idx + 1)]
    }
  }

  updatedGraph = {
    ...updatedGraph,
    groups: updatedGraph.groups.map(g =>
      g.id === groupId ? { ...g, containedIds: newContainedIds } : g
    )
  }

  const updatedGroup = findGroup(updatedGraph, groupId)!

  // Determine X from existing siblings
  const firstExisting = newContainedIds
    .filter(id => id !== entityId)
    .map(id => findEntity(updatedGraph, id))
    .find(Boolean)
  const baseX = firstExisting ? firstExisting.position.x : updatedGroup.position.x + 20

  // Use the first sibling's Y as the anchor for the top of the stack.
  // This keeps the topmost element pinned and stacks everything below it.
  const firstEntity = findEntity(updatedGraph, newContainedIds[0])
  let anchorY: number
  if (newContainedIds[0] === entityId) {
    // Inserted entity is first — anchor to the next sibling's current position
    const nextSib = newContainedIds.length > 1 ? findEntity(updatedGraph, newContainedIds[1]) : null
    anchorY = nextSib ? nextSib.position.y : updatedGroup.position.y + 40
  } else {
    anchorY = firstEntity ? firstEntity.position.y : updatedGroup.position.y + 40
  }

  // Walk through all siblings in order and stack them with consistent spacing.
  // This both positions the inserted entity and collapses any gap left behind.
  let currentY = anchorY
  for (let i = 0; i < newContainedIds.length; i++) {
    const sibId = newContainedIds[i]
    const sib = findEntity(updatedGraph, sibId)
    if (!sib) continue

    const sibX = sibId === entityId ? baseX : sib.position.x

    if (findNode(updatedGraph, sibId)) {
      updatedGraph = updateNodePosition(updatedGraph, sibId, { x: sibX, y: currentY })
    } else {
      updatedGraph = updateGroupPosition(updatedGraph, sibId, { x: sibX, y: currentY })
    }

    // Re-read the entity to get the correct height (groups may have changed via updateGroupPosition)
    const updatedSib = findEntity(updatedGraph, sibId)
    const sibH = updatedSib
      ? 'containedIds' in updatedSib
        ? (updatedSib as WorkflowGroup).size.h
        : (updatedSib as WorkflowNode).size?.h || 100
      : 100

    currentY = currentY + sibH + spacing
  }

  updatedGraph = updateGroupBounds(updatedGraph, groupId)

  return updatedGraph
}

/**
 * Normalize the vertical spacing of all entities inside a group so that
 * consecutive siblings are separated by exactly `entitySpacing` pixels.
 * The first entity keeps its current Y position; subsequent entities are
 * stacked below it. Group bounds are updated afterwards.
 *
 * Use this after removing an entity from a group to collapse the gap it left.
 */
export function normalizeGroupSpacing(
  graph: WorkflowGraph,
  groupId: string,
  entitySpacing: number = 20,
  boundsPadding: number = 20
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group || group.containedIds.length === 0) return graph

  const ids = group.containedIds
  const firstEntity = findEntity(graph, ids[0])
  if (!firstEntity) return graph

  let updatedGraph = graph
  let currentY = firstEntity.position.y

  for (let i = 0; i < ids.length; i++) {
    const sibId = ids[i]
    const sib = findEntity(updatedGraph, sibId)
    if (!sib) continue

    if (findNode(updatedGraph, sibId)) {
      updatedGraph = updateNodePosition(updatedGraph, sibId, { x: sib.position.x, y: currentY })
    } else {
      updatedGraph = updateGroupPosition(updatedGraph, sibId, { x: sib.position.x, y: currentY })
    }

    const updatedSib = findEntity(updatedGraph, sibId)
    const sibH = updatedSib
      ? 'containedIds' in updatedSib
        ? (updatedSib as WorkflowGroup).size.h
        : (updatedSib as WorkflowNode).size?.h || 100
      : 100

    currentY = currentY + sibH + entitySpacing
  }

  updatedGraph = updateGroupBounds(updatedGraph, groupId, boundsPadding)

  return updatedGraph
}

/**
 * Normalize vertical spacing for every group (deepest groups first so nested
 * layout and sizes are correct before parent bounds update).
 */
export function normalizeAllGroupsEntitySpacing(
  graph: WorkflowGraph,
  entitySpacing: number = 20,
  boundsPadding: number = 20
): WorkflowGraph {
  if (graph.groups.length === 0) return graph

  const sorted = [...graph.groups].sort(
    (a, b) => getGroupDepth(graph, b.id) - getGroupDepth(graph, a.id)
  )

  let updated = graph
  for (const g of sorted) {
    updated = normalizeGroupSpacing(updated, g.id, entitySpacing, boundsPadding)
  }
  return updated
}

/**
 * Wire an entity into the edge chain of a group at a specific insertion point.
 * Removes the old edge between afterEntity and nextEntity, then creates:
 *   afterEntity -> entityId -> nextEntity
 */
export function wireEntityIntoChain(
  graph: WorkflowGraph,
  entityId: string,
  groupId: string,
  afterEntityId: string | null,
  options?: {
    edgeIdGenerator?: () => string
    edgeLocked?: boolean
  }
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

  const edgeIdGen = options?.edgeIdGenerator || (() => `edge-${Date.now()}-${idCounter++}`)
  const containedIds = group.containedIds
  const idx = containedIds.indexOf(entityId)
  if (idx === -1) return graph

  let updatedGraph = graph

  // Find the entity before and after in containedIds
  const prevId = idx > 0 ? containedIds[idx - 1] : null
  const nextId = idx < containedIds.length - 1 ? containedIds[idx + 1] : null

  // Remove the old edge between prev and next (if it exists)
  if (prevId && nextId) {
    const oldEdge = updatedGraph.edges.find(
      e => e.from.entityId === prevId && e.to.entityId === nextId
    )
    if (oldEdge) {
      updatedGraph = removeEdge(updatedGraph, oldEdge.id)
    }
  }

  // Create edge: prev -> entityId
  if (prevId) {
    updatedGraph = addEdge(updatedGraph, {
      id: edgeIdGen(),
      from: { entityId: prevId },
      to: { entityId: entityId },
      ...(options?.edgeLocked !== undefined && { locked: options.edgeLocked })
    })
  }

  // Create edge: entityId -> next
  if (nextId) {
    updatedGraph = addEdge(updatedGraph, {
      id: edgeIdGen(),
      from: { entityId: entityId },
      to: { entityId: nextId },
      ...(options?.edgeLocked !== undefined && { locked: options.edgeLocked })
    })
  }

  return updatedGraph
}
