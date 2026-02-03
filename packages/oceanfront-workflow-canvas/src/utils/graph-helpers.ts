import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGroup,
  Position,
  Rect,
  AddStepEvent,
  ConnectEvent,
  Size
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
 * Add an entity (node or group) to a group (immutable)
 * Automatically updates the group bounds to fit the new entity
 */
export function addEntityToGroup(
  graph: WorkflowGraph,
  entityId: string,
  groupId: string
): WorkflowGraph {
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
 * Find all groups at a position (including nested groups) (internal use only)
 */
const findAllGroupsAtPosition = (graph: WorkflowGraph, position: Position): WorkflowGroup[] => {
  return graph.groups.filter(g => {
    const rect: Rect = {
      x: g.position.x,
      y: g.position.y,
      w: g.size.w,
      h: g.size.h
    }
    return isPointInRect(position, rect)
  })
}

/**
 * Get all edges connected to an entity (node or group)
 */
export const getEntityEdges = (graph: WorkflowGraph, entityId: string): WorkflowEdge[] =>
  graph.edges.filter(e => e.from.entityId === entityId || e.to.entityId === entityId)

/**
 * Get the parent group that contains an entity (node or group)
 */
export const getParentGroup = (graph: WorkflowGraph, entityId: string): WorkflowGroup | undefined =>
  graph.groups.find(g => g.containedIds.includes(entityId))

/**
 * Get all descendants (recursive) of a group (internal use only)
 */
const getGroupDescendants = (graph: WorkflowGraph, groupId: string): string[] => {
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
 * Check if adding an entity to a group would create a cycle (internal use only)
 */
const wouldCreateCycle = (graph: WorkflowGraph, childId: string, parentId: string): boolean => {
  // Can't add a group to itself
  if (childId === parentId) return true

  // If child is not a group, no cycle possible
  const childGroup = findGroup(graph, childId)
  if (!childGroup) return false

  // Check if parentId is a descendant of childId
  const descendants = getGroupDescendants(graph, childId)
  return descendants.includes(parentId)
}

/**
 * Check if adding an entity to a group would exceed the maximum depth (internal use only)
 * @param graph - The workflow graph
 * @param entityId - The entity to be added
 * @param parentId - The group to add the entity to
 * @param maxDepth - Maximum allowed depth (null means no limit)
 * @returns true if the operation would exceed max depth, false otherwise
 */
const wouldExceedMaxDepth = (
  graph: WorkflowGraph,
  entityId: string,
  parentId: string,
  maxDepth: number | null
): boolean => {
  // If no max depth is set, no limit
  if (maxDepth === null) return false

  // Calculate what the depth of the entity would be after adding to parent
  const parentDepth = getGroupDepth(graph, parentId)
  const newEntityDepth = parentDepth + 1

  // If entity is a group, check if any of its descendants would exceed max depth
  const entity = findGroup(graph, entityId)
  if (entity) {
    // Get the maximum depth of descendants relative to this group
    let maxDescendantDepth = 0
    const descendants = getGroupDescendants(graph, entityId)
    descendants.forEach(descendantId => {
      const descendant = findGroup(graph, descendantId)
      if (descendant) {
        const relativeDepth = getGroupDepth(graph, descendantId) - getGroupDepth(graph, entityId)
        maxDescendantDepth = Math.max(maxDescendantDepth, relativeDepth)
      }
    })
    
    // Check if the deepest descendant would exceed max depth
    return newEntityDepth + maxDescendantDepth > maxDepth
  }

  // For nodes, just check the new depth
  return newEntityDepth > maxDepth
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
 * Calculate the minimum size required for a group to contain all its entities (internal use only)
 * Returns the minimum width and height with padding, accounting for entity positions
 * relative to the current group position
 */
const calculateGroupMinimumSize = (
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20
): { w: number; h: number } => {
  const group = findGroup(graph, groupId)
  if (!group || group.containedIds.length === 0) {
    // Minimum size for empty group
    return { w: 100, h: 100 }
  }

  const entities = group.containedIds.map(id => findEntity(graph, id)).filter(Boolean) as (
    | WorkflowNode
    | WorkflowGroup
  )[]

  if (entities.length === 0) {
    return { w: 100, h: 100 }
  }

  // Find bounds of all entities in absolute coordinates
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

  // Calculate required size from group position to contain all entities with padding
  const requiredWidth = maxX - group.position.x + padding
  const requiredHeight = maxY - group.position.y + padding

  return {
    w: Math.max(100, requiredWidth),
    h: Math.max(100, requiredHeight)
  }
}

/**
 * Update group position and size based on its contained entities
 * Also recursively updates all parent groups in the hierarchy
 */
export function updateGroupBounds(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

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
    updatedGraph = updateGroupBounds(updatedGraph, parentGroup.id, padding)
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
 * Default ID generator using timestamp
 */
const defaultIdGenerator = (prefix: string) => () => `${prefix}-${Date.now()}`

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
  }
): { graph: WorkflowGraph; newNodeId: string } {
  const nodeIdGenerator = options?.nodeIdGenerator || defaultIdGenerator('node')
  const edgeIdGenerator = options?.edgeIdGenerator || defaultIdGenerator('edge')
  const defaultNodeData = options?.defaultNodeData || {
    title: 'New Action',
    description: 'Configure this action'
  }
  const defaultKind = options?.defaultKind || 'action'

  const newNodeId = nodeIdGenerator()
  const afterNode = event.afterNodeId ? findNode(graph, event.afterNodeId) : null

  // Find the edge from the afterNode (if it exists)
  const existingEdge = event.afterNodeId
    ? graph.edges.find((e: WorkflowEdge) => e.from.entityId === event.afterNodeId)
    : null

  // Calculate position between the two nodes if there's an existing edge
  let position: Position
  if (afterNode && existingEdge) {
    const toNode = findNode(graph, existingEdge.to.entityId)
    if (toNode) {
      // Place new node between the two connected nodes
      position = {
        x: (afterNode.position.x + toNode.position.x) / 2,
        y: (afterNode.position.y + toNode.position.y) / 2
      }
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

  // Create the new node
  const newNode: WorkflowNode = {
    id: newNodeId,
    kind: defaultKind,
    position,
    data: defaultNodeData
  }

  let updatedGraph: WorkflowGraph = {
    ...graph,
    nodes: [...graph.nodes, newNode]
  }

  // If the source node is in a group, add the new node to the same group
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
  }
): WorkflowGraph {
  const edgeIdGenerator = options?.edgeIdGenerator || defaultIdGenerator('edge')

  return addEdge(graph, {
    id: edgeIdGenerator(),
    from: { entityId: event.fromNodeId },
    to: { entityId: event.toNodeId }
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
  const defaultNodeData = options?.nodeData || {
    title: 'New Action',
    description: 'Configure this action'
  }
  const defaultKind = options?.kind || 'action'

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
    position,
    data: defaultNodeData
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
    title?: string
    size?: Size
  }
): { graph: WorkflowGraph; newGroupId: string } {
  const groupIdGenerator = options?.groupIdGenerator || defaultIdGenerator('group')
  const defaultTitle = options?.title || 'New Group'
  const defaultSize = options?.size || { w: 290, h: 140 }

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
    kind: 'group',
    title: defaultTitle,
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
