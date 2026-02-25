import { describe, it, expect } from 'vitest'
import type {
  WorkflowGraph,
  NodeTypeConfig
} from '../../types/workflow'
import {
  getConnectedEntities,
  isGroupDescendantOf,
  isEntityTypeCompatibleWithGroup,
  addNode,
  addGroup,
  handleConnectNodes,
  getAutoAssignedNodeKind
} from '../graph-helpers'

function makeGraph(overrides: Partial<WorkflowGraph> = {}): WorkflowGraph {
  return {
    nodes: [],
    edges: [],
    groups: [],
    ...overrides
  }
}

describe('getConnectedEntities', () => {
  it('returns incoming and outgoing entities for a node', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } },
        { id: 'n3', kind: 'action', position: { x: 0, y: 300 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n2' } },
        { id: 'e2', from: { entityId: 'n2' }, to: { entityId: 'n3' } }
      ]
    })

    const result = getConnectedEntities(graph, 'n2')
    expect(result.incoming).toHaveLength(1)
    expect(result.incoming[0].id).toBe('n1')
    expect(result.outgoing).toHaveLength(1)
    expect(result.outgoing[0].id).toBe('n3')
  })

  it('returns empty arrays for unconnected node', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      ]
    })

    const result = getConnectedEntities(graph, 'n1')
    expect(result.incoming).toHaveLength(0)
    expect(result.outgoing).toHaveLength(0)
  })

  it('resolves groups as connected entities', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      ],
      groups: [
        { id: 'g1', kind: 'group', position: { x: 0, y: 0 }, size: { w: 300, h: 200 }, containedIds: [] }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'g1' }, to: { entityId: 'n1' } }
      ]
    })

    const result = getConnectedEntities(graph, 'n1')
    expect(result.incoming).toHaveLength(1)
    expect(result.incoming[0].id).toBe('g1')
  })

  it('handles multiple incoming and outgoing connections', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } },
        { id: 'n3', kind: 'action', position: { x: 0, y: 300 } },
        { id: 'n4', kind: 'action', position: { x: 0, y: 450 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n3' } },
        { id: 'e2', from: { entityId: 'n2' }, to: { entityId: 'n3' } },
        { id: 'e3', from: { entityId: 'n3' }, to: { entityId: 'n4' } }
      ]
    })

    const result = getConnectedEntities(graph, 'n3')
    expect(result.incoming).toHaveLength(2)
    expect(result.outgoing).toHaveLength(1)
  })
})

describe('isGroupDescendantOf', () => {
  it('returns true for direct child', () => {
    const graph = makeGraph({
      groups: [
        { id: 'parent', kind: 'group', position: { x: 0, y: 0 }, size: { w: 400, h: 400 }, containedIds: ['child'] },
        { id: 'child', kind: 'group', position: { x: 20, y: 20 }, size: { w: 200, h: 200 }, containedIds: [] }
      ]
    })

    expect(isGroupDescendantOf(graph, 'child', 'parent')).toBe(true)
  })

  it('returns true for deeply nested descendant', () => {
    const graph = makeGraph({
      groups: [
        { id: 'root', kind: 'group', position: { x: 0, y: 0 }, size: { w: 500, h: 500 }, containedIds: ['mid'] },
        { id: 'mid', kind: 'group', position: { x: 20, y: 20 }, size: { w: 300, h: 300 }, containedIds: ['leaf'] },
        { id: 'leaf', kind: 'group', position: { x: 40, y: 40 }, size: { w: 100, h: 100 }, containedIds: [] }
      ]
    })

    expect(isGroupDescendantOf(graph, 'leaf', 'root')).toBe(true)
  })

  it('returns false for non-descendant', () => {
    const graph = makeGraph({
      groups: [
        { id: 'g1', kind: 'group', position: { x: 0, y: 0 }, size: { w: 200, h: 200 }, containedIds: [] },
        { id: 'g2', kind: 'group', position: { x: 300, y: 0 }, size: { w: 200, h: 200 }, containedIds: [] }
      ]
    })

    expect(isGroupDescendantOf(graph, 'g1', 'g2')).toBe(false)
  })

  it('returns false for reverse relationship', () => {
    const graph = makeGraph({
      groups: [
        { id: 'parent', kind: 'group', position: { x: 0, y: 0 }, size: { w: 400, h: 400 }, containedIds: ['child'] },
        { id: 'child', kind: 'group', position: { x: 20, y: 20 }, size: { w: 200, h: 200 }, containedIds: [] }
      ]
    })

    expect(isGroupDescendantOf(graph, 'parent', 'child')).toBe(false)
  })
})

describe('isEntityTypeCompatibleWithGroup', () => {
  it('allows nodes of any kind in any group', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      ],
      groups: [
        { id: 'g1', kind: 'phase', position: { x: 0, y: 0 }, size: { w: 300, h: 200 }, containedIds: [] }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'n1', 'g1')).toBe(true)
  })

  it('allows groups of same kind to nest', () => {
    const graph = makeGraph({
      groups: [
        { id: 'g1', kind: 'phase', position: { x: 0, y: 0 }, size: { w: 400, h: 400 }, containedIds: [] },
        { id: 'g2', kind: 'phase', position: { x: 20, y: 20 }, size: { w: 200, h: 200 }, containedIds: [] }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'g2', 'g1')).toBe(true)
  })

  it('rejects groups of different kinds', () => {
    const graph = makeGraph({
      groups: [
        { id: 'g1', kind: 'phase', position: { x: 0, y: 0 }, size: { w: 400, h: 400 }, containedIds: [] },
        { id: 'g2', kind: 'swimlane', position: { x: 20, y: 20 }, size: { w: 200, h: 200 }, containedIds: [] }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'g2', 'g1')).toBe(false)
  })

  it('allows when target group does not exist', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'n1', 'nonexistent')).toBe(true)
  })

  it('allows groups with empty kind', () => {
    const graph = makeGraph({
      groups: [
        { id: 'g1', kind: '', position: { x: 0, y: 0 }, size: { w: 400, h: 400 }, containedIds: [] },
        { id: 'g2', kind: 'phase', position: { x: 20, y: 20 }, size: { w: 200, h: 200 }, containedIds: [] }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'g2', 'g1')).toBe(true)
  })
})

describe('addNode', () => {
  it('adds a node with default position when graph is empty', () => {
    const graph = makeGraph()
    const result = addNode(graph)

    expect(result.graph.nodes).toHaveLength(1)
    expect(result.newNodeId).toBeDefined()
    expect(result.graph.nodes[0].id).toBe(result.newNodeId)
  })

  it('uses custom node ID generator', () => {
    const graph = makeGraph()
    const result = addNode(graph, { nodeIdGenerator: () => 'custom-id' })

    expect(result.newNodeId).toBe('custom-id')
    expect(result.graph.nodes[0].id).toBe('custom-id')
  })

  it('uses provided position', () => {
    const graph = makeGraph()
    const result = addNode(graph, { position: { x: 200, y: 300 } })

    expect(result.graph.nodes[0].position).toEqual({ x: 200, y: 300 })
  })

  it('uses provided kind', () => {
    const graph = makeGraph()
    const result = addNode(graph, { kind: 'trigger' })

    expect(result.graph.nodes[0].kind).toBe('trigger')
  })

  it('places node below existing nodes when no position given', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 100, y: 100 } }
      ]
    })

    const result = addNode(graph)
    expect(result.graph.nodes[1].position.y).toBeGreaterThan(100)
  })

  it('does not mutate original graph', () => {
    const graph = makeGraph()
    const result = addNode(graph)

    expect(graph.nodes).toHaveLength(0)
    expect(result.graph.nodes).toHaveLength(1)
  })
})

describe('addGroup', () => {
  it('adds a group with defaults when graph is empty', () => {
    const graph = makeGraph()
    const result = addGroup(graph)

    expect(result.graph.groups).toHaveLength(1)
    expect(result.newGroupId).toBeDefined()
    expect(result.graph.groups[0].id).toBe(result.newGroupId)
    expect(result.graph.groups[0].containedIds).toEqual([])
  })

  it('uses custom group ID generator', () => {
    const graph = makeGraph()
    const result = addGroup(graph, { groupIdGenerator: () => 'g-custom' })

    expect(result.newGroupId).toBe('g-custom')
  })

  it('uses provided label', () => {
    const graph = makeGraph()
    const result = addGroup(graph, { label: 'My Phase' })

    expect(result.graph.groups[0].label).toBe('My Phase')
  })

  it('uses provided size', () => {
    const graph = makeGraph()
    const result = addGroup(graph, { size: { w: 500, h: 400 } })

    expect(result.graph.groups[0].size).toEqual({ w: 500, h: 400 })
  })

  it('uses provided kind', () => {
    const graph = makeGraph()
    const result = addGroup(graph, { kind: 'phase' })

    expect(result.graph.groups[0].kind).toBe('phase')
  })

  it('does not mutate original graph', () => {
    const graph = makeGraph()
    const result = addGroup(graph)

    expect(graph.groups).toHaveLength(0)
    expect(result.graph.groups).toHaveLength(1)
  })
})

describe('handleConnectNodes', () => {
  it('creates an edge between two nodes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } }
      ]
    })

    const result = handleConnectNodes(graph, { fromNodeId: 'n1', toNodeId: 'n2' })

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].from.entityId).toBe('n1')
    expect(result.edges[0].to.entityId).toBe('n2')
  })

  it('uses custom edge ID generator', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } }
      ]
    })

    const result = handleConnectNodes(graph, { fromNodeId: 'n1', toNodeId: 'n2' }, {
      edgeIdGenerator: () => 'e-custom'
    })

    expect(result.edges[0].id).toBe('e-custom')
  })

  it('sets edge locked when option is provided', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } }
      ]
    })

    const result = handleConnectNodes(graph, { fromNodeId: 'n1', toNodeId: 'n2' }, {
      edgeLocked: true
    })

    expect(result.edges[0].locked).toBe(true)
  })

  it('replaces existing outgoing edge from source', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } },
        { id: 'n3', kind: 'action', position: { x: 0, y: 300 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n2' } }
      ]
    })

    const result = handleConnectNodes(graph, { fromNodeId: 'n1', toNodeId: 'n3' })

    const outgoingFromN1 = result.edges.filter(e => e.from.entityId === 'n1')
    expect(outgoingFromN1).toHaveLength(1)
    expect(outgoingFromN1[0].to.entityId).toBe('n3')
  })
})

describe('getAutoAssignedNodeKind', () => {
  const nodeTypes: NodeTypeConfig = {
    action: { type: 'action', title: 'Action', fields: [] },
    trigger: { type: 'trigger', title: 'Trigger', fields: [] }
  }

  it('returns group kind when node has no kind and group kind exists in nodeTypes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: '', position: { x: 0, y: 0 } }
      ],
      groups: [
        { id: 'g1', kind: 'action', position: { x: 0, y: 0 }, size: { w: 300, h: 200 }, containedIds: ['n1'] }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'g1', nodeTypes)).toBe('action')
  })

  it('returns null when node already has a kind', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'trigger', position: { x: 0, y: 0 } }
      ],
      groups: [
        { id: 'g1', kind: 'action', position: { x: 0, y: 0 }, size: { w: 300, h: 200 }, containedIds: ['n1'] }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'g1', nodeTypes)).toBe(null)
  })

  it('returns null when group kind is not in nodeTypes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: '', position: { x: 0, y: 0 } }
      ],
      groups: [
        { id: 'g1', kind: 'unknown', position: { x: 0, y: 0 }, size: { w: 300, h: 200 }, containedIds: ['n1'] }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'g1', nodeTypes)).toBe(null)
  })

  it('returns null when node does not exist', () => {
    const graph = makeGraph({
      groups: [
        { id: 'g1', kind: 'action', position: { x: 0, y: 0 }, size: { w: 300, h: 200 }, containedIds: [] }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'nonexistent', 'g1', nodeTypes)).toBe(null)
  })

  it('returns null when group does not exist', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: '', position: { x: 0, y: 0 } }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'nonexistent', nodeTypes)).toBe(null)
  })
})
