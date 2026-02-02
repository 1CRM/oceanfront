import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowGroup,
  Position,
  Rect
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
 * Find an entity (node or group) by ID
 */
export const findEntity = (
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
 * Legacy function for backward compatibility (deprecated)
 * @deprecated Use addEntityToGroup instead
 */
export const addNodeToGroup = addEntityToGroup

/**
 * Legacy function for backward compatibility (deprecated)
 * @deprecated Use removeEntityFromGroup instead
 */
export const removeNodeFromGroup = removeEntityFromGroup

/**
 * Legacy function for backward compatibility (deprecated)
 * @deprecated Use removeEntityFromAllGroups instead
 */
export const removeNodeFromAllGroups = removeEntityFromAllGroups

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
 * Find all groups at a position (including nested groups)
 */
export function findAllGroupsAtPosition(
  graph: WorkflowGraph,
  position: Position
): WorkflowGroup[] {
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
 * Legacy function for backward compatibility (deprecated)
 * @deprecated Use getEntityEdges instead
 */
export const getNodeEdges = getEntityEdges

/**
 * Legacy function for backward compatibility (deprecated)
 * @deprecated Use getParentGroup instead
 */
export const getNodeGroup = getParentGroup

/**
 * Get all children (nodes + groups) of a group
 */
export function getGroupChildren(
  graph: WorkflowGraph,
  groupId: string
): (WorkflowNode | WorkflowGroup)[] {
  const group = findGroup(graph, groupId)
  if (!group) return []

  return group.containedIds
    .map(id => findEntity(graph, id))
    .filter(Boolean) as (WorkflowNode | WorkflowGroup)[]
}

/**
 * Get all descendants (recursive) of a group
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
 * Check if adding an entity to a group would create a cycle
 */
export function wouldCreateCycle(
  graph: WorkflowGraph,
  childId: string,
  parentId: string
): boolean {
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
    return { x: 0, y: 0, w: 290, h: 140 }
  }

  const entities = group.containedIds
    .map(id => findEntity(graph, id))
    .filter(Boolean) as (WorkflowNode | WorkflowGroup)[]

  if (entities.length === 0) {
    return { x: 0, y: 0, w: 290, h: 140 }
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
 * Calculate the minimum size required for a group to contain all its entities
 * Returns the minimum width and height with padding, accounting for entity positions
 * relative to the current group position
 */
export function calculateGroupMinimumSize(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20
): { w: number; h: number } {
  const group = findGroup(graph, groupId)
  if (!group || group.containedIds.length === 0) {
    // Minimum size for empty group
    return { w: 100, h: 100 }
  }

  const entities = group.containedIds
    .map(id => findEntity(graph, id))
    .filter(Boolean) as (WorkflowNode | WorkflowGroup)[]

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

  // The group needs to span from the leftmost entity (with padding) to the rightmost entity (with padding)
  // If the group's current position is at minX - padding, then width = (maxX - minX) + 2*padding
  // But the group position might not align with minX - padding during resize

  // Calculate the required size to contain all entities from the current group position
  const requiredWidth = Math.max(
    maxX - group.position.x + padding, // Distance from group left edge to rightmost entity
    group.position.x + padding - minX  // Distance from leftmost entity to group left edge
  )

  const requiredHeight = Math.max(
    maxY - group.position.y + padding, // Distance from group top edge to bottom-most entity
    group.position.y + padding - minY  // Distance from topmost entity to group top edge
  )

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
 * Update all group bounds
 */
export function updateAllGroupBounds(graph: WorkflowGraph, padding: number = 20): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => {
      const bounds = calculateGroupBounds(graph, g.id, padding)
      return {
        ...g,
        position: { x: bounds.x, y: bounds.y },
        size: { w: bounds.w, h: bounds.h }
      }
    })
  }
}

/**
 * Arrange entities within a group in a single vertical column
 * @param graph - The workflow graph
 * @param groupId - The group to arrange entities in
 * @param padding - Padding around the group (default: 20)
 * @param spacing - Spacing between entities (default: 40)
 * @returns Updated graph with rearranged entities and resized group
 */
export function arrangeNodesInGroup(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20,
  spacing: number = 40
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group || group.containedIds.length === 0) return graph

  const entities = group.containedIds
    .map(id => findEntity(graph, id))
    .filter(Boolean) as (WorkflowNode | WorkflowGroup)[]
  if (entities.length === 0) return graph

  const entityCount = entities.length

  // Get entity dimensions (assume uniform size or use first entity's dimensions)
  const firstEntity = entities[0]
  let entityWidth: number
  let entityHeight: number

  if ('kind' in firstEntity && 'containedIds' in firstEntity) {
    entityWidth = firstEntity.size.w
    entityHeight = firstEntity.size.h
  } else {
    entityWidth = firstEntity.size?.w || 250
    entityHeight = firstEntity.size?.h || 100
  }

  // Calculate starting position (group top-left + padding)
  const startX = group.position.x + padding
  const startY = group.position.y + padding

  // Update node positions in a single vertical column
  const updatedNodes = graph.nodes.map(node => {
    const entityIndex = group.containedIds.indexOf(node.id)
    if (entityIndex === -1) return node

    return {
      ...node,
      position: {
        x: startX,
        y: startY + entityIndex * (entityHeight + spacing)
      }
    }
  })

  // Update group positions in a single vertical column
  const updatedGroups = graph.groups.map(g => {
    if (g.id === groupId) {
      // Update the parent group bounds
      const groupWidth = entityWidth + padding * 2
      const groupHeight = entityCount * entityHeight + (entityCount - 1) * spacing + padding * 2

      return {
        ...g,
        position: g.position,
        size: {
          w: groupWidth,
          h: groupHeight
        }
      }
    }

    const entityIndex = group.containedIds.indexOf(g.id)
    if (entityIndex === -1) return g

    return {
      ...g,
      position: {
        x: startX,
        y: startY + entityIndex * (entityHeight + spacing)
      }
    }
  })

  return {
    ...graph,
    nodes: updatedNodes,
    groups: updatedGroups
  }
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
