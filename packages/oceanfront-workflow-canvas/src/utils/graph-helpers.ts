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
 * - Removes any existing outgoing edge from the source node
 * - Removes any existing incoming edge to the target node
 */
export function addEdge(graph: WorkflowGraph, edge: WorkflowEdge): WorkflowGraph {
  // Check if edge already exists
  const exists = graph.edges.some(
    e => e.from.nodeId === edge.from.nodeId && e.to.nodeId === edge.to.nodeId
  )
  if (exists) return graph

  // Remove any existing outgoing edge from the source node (one output per node)
  // Remove any existing incoming edge to the target node (one input per node)
  const filteredEdges = graph.edges.filter(
    e => e.from.nodeId !== edge.from.nodeId && e.to.nodeId !== edge.to.nodeId
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
 * Add a node to a group (immutable)
 */
export function addNodeToGroup(
  graph: WorkflowGraph,
  nodeId: string,
  groupId: string
): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => {
      if (g.id === groupId && !g.nodeIds.includes(nodeId)) {
        return { ...g, nodeIds: [...g.nodeIds, nodeId] }
      }
      return g
    })
  }
}

/**
 * Remove a node from a group (immutable)
 */
export function removeNodeFromGroup(
  graph: WorkflowGraph,
  nodeId: string,
  groupId: string
): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => {
      if (g.id === groupId) {
        return { ...g, nodeIds: g.nodeIds.filter(id => id !== nodeId) }
      }
      return g
    })
  }
}

/**
 * Remove a node from all groups (immutable)
 */
export function removeNodeFromAllGroups(graph: WorkflowGraph, nodeId: string): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => ({
      ...g,
      nodeIds: g.nodeIds.filter(id => id !== nodeId)
    }))
  }
}

/**
 * Check if a point is inside a rectangle
 */
export const isPointInRect = (point: Position, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.w &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.h

/**
 * Find which group (if any) contains a node at the given position
 */
export const findGroupAtPosition = (
  graph: WorkflowGraph,
  position: Position
): WorkflowGroup | undefined =>
  graph.groups.find(g => isPointInRect(position, g.rect))

/**
 * Get all edges connected to a node
 */
export const getNodeEdges = (graph: WorkflowGraph, nodeId: string): WorkflowEdge[] =>
  graph.edges.filter(e => e.from.nodeId === nodeId || e.to.nodeId === nodeId)

/**
 * Get the group that contains a node
 */
export const getNodeGroup = (graph: WorkflowGraph, nodeId: string): WorkflowGroup | undefined =>
  graph.groups.find(g => g.nodeIds.includes(nodeId))

/**
 * Calculate the bounding box for a group based on its nodes
 * Adds padding around the nodes
 */
export function calculateGroupBounds(
  graph: WorkflowGraph,
  nodeIds: string[],
  padding: number = 20
): Rect {
  if (nodeIds.length === 0) {
    // Default size for empty group (suitable for one node)
    return { x: 0, y: 0, w: 290, h: 140 }
  }

  const nodes = nodeIds.map(id => findNode(graph, id)).filter(Boolean) as WorkflowNode[]

  if (nodes.length === 0) {
    return { x: 0, y: 0, w: 290, h: 140 }
  }

  // Find bounds of all nodes
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  nodes.forEach(node => {
    const nodeW = node.size?.w || 250
    const nodeH = node.size?.h || 100

    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + nodeW)
    maxY = Math.max(maxY, node.position.y + nodeH)
  })

  return {
    x: minX - padding,
    y: minY - padding,
    w: maxX - minX + padding * 2,
    h: maxY - minY + padding * 2
  }
}

/**
 * Update group bounds based on its contained nodes
 */
export function updateGroupBounds(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

  const newBounds = calculateGroupBounds(graph, group.nodeIds, padding)

  return {
    ...graph,
    groups: graph.groups.map(g =>
      g.id === groupId ? { ...g, rect: newBounds } : g
    )
  }
}

/**
 * Update all group bounds
 */
export function updateAllGroupBounds(graph: WorkflowGraph, padding: number = 20): WorkflowGraph {
  return {
    ...graph,
    groups: graph.groups.map(g => ({
      ...g,
      rect: calculateGroupBounds(graph, g.nodeIds, padding)
    }))
  }
}

/**
 * Arrange nodes within a group in a single vertical column
 * @param graph - The workflow graph
 * @param groupId - The group to arrange nodes in
 * @param padding - Padding around the group (default: 20)
 * @param spacing - Spacing between nodes (default: 40)
 * @returns Updated graph with rearranged nodes and resized group
 */
export function arrangeNodesInGroup(
  graph: WorkflowGraph,
  groupId: string,
  padding: number = 20,
  spacing: number = 40
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group || group.nodeIds.length === 0) return graph

  const nodes = group.nodeIds.map(id => findNode(graph, id)).filter(Boolean) as WorkflowNode[]
  if (nodes.length === 0) return graph

  const nodeCount = nodes.length

  // Get node dimensions (assume uniform size or use first node's dimensions)
  const nodeWidth = nodes[0].size?.w || 250
  const nodeHeight = nodes[0].size?.h || 100

  // Calculate starting position (group top-left + padding)
  const startX = group.rect.x + padding
  const startY = group.rect.y + padding

  // Update node positions in a single vertical column
  const updatedNodes = graph.nodes.map(node => {
    const nodeIndex = group.nodeIds.indexOf(node.id)
    if (nodeIndex === -1) return node

    return {
      ...node,
      position: {
        x: startX,
        y: startY + nodeIndex * (nodeHeight + spacing)
      }
    }
  })

  // Calculate new group size based on vertical layout
  const groupWidth = nodeWidth + padding * 2
  const groupHeight = nodeCount * nodeHeight + (nodeCount - 1) * spacing + padding * 2

  // Update group bounds
  const updatedGroups = graph.groups.map(g =>
    g.id === groupId
      ? {
        ...g,
        rect: {
          ...g.rect,
          w: groupWidth,
          h: groupHeight
        }
      }
      : g
  )

  return {
    ...graph,
    nodes: updatedNodes,
    groups: updatedGroups
  }
}

/**
 * Reorder a node within its group by changing its position in the nodeIds array
 * @param graph - The workflow graph
 * @param nodeId - The node to reorder
 * @param newIndex - The new index in the group's nodeIds array
 * @returns Updated graph with reordered nodes
 */
export function reorderNodeInGroup(
  graph: WorkflowGraph,
  nodeId: string,
  newIndex: number
): WorkflowGraph {
  const group = getNodeGroup(graph, nodeId)
  if (!group) return graph

  const currentIndex = group.nodeIds.indexOf(nodeId)
  if (currentIndex === -1 || currentIndex === newIndex) return graph

  // Reorder the nodeIds array
  const newNodeIds = [...group.nodeIds]
  newNodeIds.splice(currentIndex, 1)
  newNodeIds.splice(newIndex, 0, nodeId)

  // Update the group
  const updatedGraph = {
    ...graph,
    groups: graph.groups.map(g =>
      g.id === group.id ? { ...g, nodeIds: newNodeIds } : g
    )
  }

  // Rearrange nodes to reflect new order
  return arrangeNodesInGroup(updatedGraph, group.id)
}


/**
 * Update a group's position and move all contained nodes accordingly
 * @param graph - The workflow graph
 * @param groupId - The group to move
 * @param newPosition - The new position for the group's top-left corner
 * @returns Updated graph with moved group and nodes
 */
export function updateGroupPosition(
  graph: WorkflowGraph,
  groupId: string,
  newPosition: Position
): WorkflowGraph {
  const group = findGroup(graph, groupId)
  if (!group) return graph

  // Calculate the delta (how much the group moved)
  const deltaX = newPosition.x - group.rect.x
  const deltaY = newPosition.y - group.rect.y

  // Update all nodes within the group by the same delta
  const updatedNodes = graph.nodes.map(node => {
    if (group.nodeIds.includes(node.id)) {
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

  // Update the group's rect position
  const updatedGroups = graph.groups.map(g =>
    g.id === groupId
      ? {
        ...g,
        rect: {
          ...g.rect,
          x: newPosition.x,
          y: newPosition.y
        }
      }
      : g
  )

  return {
    ...graph,
    nodes: updatedNodes,
    groups: updatedGroups
  }
}
