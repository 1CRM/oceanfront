import type {
  EntityType,
  WorkflowEntity,
  WorkflowGraph,
  WorkflowGroup,
  WorkflowNode
} from '../types/workflow'

let idCounter = 0
export const generateId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`

export const isGroup = (entity: WorkflowEntity): entity is WorkflowGroup => 'children' in entity

export const findNode = (graph: WorkflowGraph, id: string): WorkflowNode | undefined =>
  graph.nodes.find(n => n.id === id)

export const findGroup = (graph: WorkflowGraph, id: string): WorkflowGroup | undefined =>
  graph.groups.find(g => g.id === id)

export const findEntity = (graph: WorkflowGraph, id: string): WorkflowEntity | undefined =>
  findNode(graph, id) ?? findGroup(graph, id)

export const getParentGroup = (graph: WorkflowGraph, id: string): WorkflowGroup | undefined =>
  graph.groups.find(g => g.children.includes(id))

export function getDescendants(graph: WorkflowGraph, groupId: string): string[] {
  const descendants: string[] = []
  const queue = [...(findGroup(graph, groupId)?.children ?? [])]
  while (queue.length > 0) {
    const id = queue.shift()!
    descendants.push(id)
    queue.push(...(findGroup(graph, id)?.children ?? []))
  }
  return descendants
}

export function getGroupDepth(graph: WorkflowGraph, groupId: string): number {
  let depth = 0
  let parent = getParentGroup(graph, groupId)
  while (parent) {
    depth++
    parent = getParentGroup(graph, parent.id)
  }
  return depth
}

function getSubtreeHeight(graph: WorkflowGraph, groupId: string): number {
  return (findGroup(graph, groupId)?.children ?? []).reduce(
    (height, id) =>
      findGroup(graph, id) ? Math.max(height, getSubtreeHeight(graph, id) + 1) : height,
    0
  )
}

/**
 * Whether placing `groupId` (with its nested groups) inside `targetGroupId` keeps every group
 * at most `maxDepth` levels deep. A missing `groupId` means a new empty group.
 */
export function fitsMaxGroupDepth(
  graph: WorkflowGraph,
  targetGroupId: string,
  maxDepth: number | undefined,
  groupId?: string
): boolean {
  if (maxDepth === undefined) return true
  const height = groupId ? getSubtreeHeight(graph, groupId) : 0
  return getGroupDepth(graph, targetGroupId) + 1 + height <= maxDepth
}

/**
 * Entities can only be placed into groups of the same kind, and a group cannot be
 * placed into itself or its descendants.
 */
export function canPlaceInGroup(graph: WorkflowGraph, entityId: string, groupId: string): boolean {
  const entity = findEntity(graph, entityId)
  const target = findGroup(graph, groupId)
  if (!entity || !target || target.kind !== entity.kind) return false
  return (
    !isGroup(entity) || (groupId !== entityId && !getDescendants(graph, entityId).includes(groupId))
  )
}

const detach = (graph: WorkflowGraph, id: string): WorkflowGraph => ({
  ...graph,
  groups: graph.groups.map(g =>
    g.children.includes(id) ? { ...g, children: g.children.filter(c => c !== id) } : g
  )
})

/**
 * Moves the entity into `groupId` at `index`, counted without the entity itself.
 */
export function moveEntity(
  graph: WorkflowGraph,
  id: string,
  groupId: string,
  index: number
): WorkflowGraph {
  const detached = detach(graph, id)
  return {
    ...detached,
    groups: detached.groups.map(g =>
      g.id === groupId
        ? { ...g, children: [...g.children.slice(0, index), id, ...g.children.slice(index)] }
        : g
    )
  }
}

export function insertEntity(
  graph: WorkflowGraph,
  type: EntityType,
  kind: string,
  groupId: string,
  index: number
): { graph: WorkflowGraph; id: string } {
  const id = generateId(type)
  const added: WorkflowGraph =
    type === 'node'
      ? { ...graph, nodes: [...graph.nodes, { id, kind }] }
      : { ...graph, groups: [...graph.groups, { id, kind, children: [] }] }
  return { graph: moveEntity(added, id, groupId, index), id }
}

export function swapNodes(graph: WorkflowGraph, a: string, b: string): WorkflowGraph {
  const swap = (id: string) => (id === a ? b : id === b ? a : id)
  return {
    ...graph,
    groups: graph.groups.map(g =>
      g.children.includes(a) || g.children.includes(b)
        ? { ...g, children: g.children.map(swap) }
        : g
    )
  }
}

export function removeEntity(graph: WorkflowGraph, id: string): WorkflowGraph {
  const removed = new Set([id, ...getDescendants(graph, id)])
  return {
    nodes: graph.nodes.filter(n => !removed.has(n.id)),
    groups: graph.groups
      .filter(g => !removed.has(g.id))
      .map(g =>
        g.children.some(c => removed.has(c))
          ? { ...g, children: g.children.filter(c => !removed.has(c)) }
          : g
      )
  }
}
