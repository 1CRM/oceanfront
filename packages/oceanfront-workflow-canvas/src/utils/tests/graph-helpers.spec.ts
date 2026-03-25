import { describe, it, expect } from 'vitest'
import type { WorkflowGraph, NodeTypeConfig } from '../../types/workflow'
import {
  getConnectedEntities,
  isGroupDescendantOf,
  isEntityTypeCompatibleWithGroup,
  addNode,
  addGroup,
  handleConnectNodes,
  getAutoAssignedNodeKind,
  swapNodes,
  connectNodeToLastInGroup,
  removeEntityEdgesAndBridge,
  alignNodeInGroup,
  insertEntityInGroup,
  normalizeGroupSpacing,
  normalizeAllGroupsEntitySpacing,
  wireEntityIntoChain
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
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }]
    })

    const result = getConnectedEntities(graph, 'n1')
    expect(result.incoming).toHaveLength(0)
    expect(result.outgoing).toHaveLength(0)
  })

  it('resolves groups as connected entities', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          containedIds: []
        }
      ],
      edges: [{ id: 'e1', from: { entityId: 'g1' }, to: { entityId: 'n1' } }]
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
        {
          id: 'parent',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          containedIds: ['child']
        },
        {
          id: 'child',
          kind: 'group',
          position: { x: 20, y: 20 },
          size: { w: 200, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(isGroupDescendantOf(graph, 'child', 'parent')).toBe(true)
  })

  it('returns true for deeply nested descendant', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'root',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 500, h: 500 },
          containedIds: ['mid']
        },
        {
          id: 'mid',
          kind: 'group',
          position: { x: 20, y: 20 },
          size: { w: 300, h: 300 },
          containedIds: ['leaf']
        },
        {
          id: 'leaf',
          kind: 'group',
          position: { x: 40, y: 40 },
          size: { w: 100, h: 100 },
          containedIds: []
        }
      ]
    })

    expect(isGroupDescendantOf(graph, 'leaf', 'root')).toBe(true)
  })

  it('returns false for non-descendant', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 200, h: 200 },
          containedIds: []
        },
        {
          id: 'g2',
          kind: 'group',
          position: { x: 300, y: 0 },
          size: { w: 200, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(isGroupDescendantOf(graph, 'g1', 'g2')).toBe(false)
  })

  it('returns false for reverse relationship', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'parent',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          containedIds: ['child']
        },
        {
          id: 'child',
          kind: 'group',
          position: { x: 20, y: 20 },
          size: { w: 200, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(isGroupDescendantOf(graph, 'parent', 'child')).toBe(false)
  })
})

describe('isEntityTypeCompatibleWithGroup', () => {
  it('allows nodes of any kind in any group', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }],
      groups: [
        {
          id: 'g1',
          kind: 'phase',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'n1', 'g1')).toBe(true)
  })

  it('allows groups of same kind to nest', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: 'phase',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          containedIds: []
        },
        {
          id: 'g2',
          kind: 'phase',
          position: { x: 20, y: 20 },
          size: { w: 200, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'g2', 'g1')).toBe(true)
  })

  it('rejects groups of different kinds', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: 'phase',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          containedIds: []
        },
        {
          id: 'g2',
          kind: 'swimlane',
          position: { x: 20, y: 20 },
          size: { w: 200, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'g2', 'g1')).toBe(false)
  })

  it('allows when target group does not exist', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }]
    })

    expect(isEntityTypeCompatibleWithGroup(graph, 'n1', 'nonexistent')).toBe(true)
  })

  it('allows groups with empty kind', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: '',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          containedIds: []
        },
        {
          id: 'g2',
          kind: 'phase',
          position: { x: 20, y: 20 },
          size: { w: 200, h: 200 },
          containedIds: []
        }
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
      nodes: [{ id: 'n1', kind: 'action', position: { x: 100, y: 100 } }]
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

    const result = handleConnectNodes(
      graph,
      { fromNodeId: 'n1', toNodeId: 'n2' },
      {
        edgeIdGenerator: () => 'e-custom'
      }
    )

    expect(result.edges[0].id).toBe('e-custom')
  })

  it('sets edge locked when option is provided', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } }
      ]
    })

    const result = handleConnectNodes(
      graph,
      { fromNodeId: 'n1', toNodeId: 'n2' },
      {
        edgeLocked: true
      }
    )

    expect(result.edges[0].locked).toBe(true)
  })

  it('replaces existing outgoing edge from source', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } },
        { id: 'n3', kind: 'action', position: { x: 0, y: 300 } }
      ],
      edges: [{ id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n2' } }]
    })

    const result = handleConnectNodes(graph, { fromNodeId: 'n1', toNodeId: 'n3' })

    const outgoingFromN1 = result.edges.filter(e => e.from.entityId === 'n1')
    expect(outgoingFromN1).toHaveLength(1)
    expect(outgoingFromN1[0].to.entityId).toBe('n3')
  })
})

describe('connectNodeToLastInGroup', () => {
  it('connects to the previous node in group order', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 150 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 300 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = connectNodeToLastInGroup(graph, 'n2', 'g1', {
      edgeIdGenerator: () => 'e-auto'
    })

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].id).toBe('e-auto')
    expect(result.edges[0].from.entityId).toBe('n1')
    expect(result.edges[0].to.entityId).toBe('n2')
  })

  it('does nothing when no previous node exists in group', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 300 },
          containedIds: ['n1']
        }
      ]
    })

    const result = connectNodeToLastInGroup(graph, 'n1', 'g1')
    expect(result).toEqual(graph)
  })

  it('connects to the previous group when it is the last entity', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n2', kind: 'action', position: { x: 0, y: 150 } }],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 0, y: 0 },
          size: { w: 400, h: 400 },
          containedIds: ['g2', 'n2']
        },
        {
          id: 'g2',
          kind: 'group',
          position: { x: 20, y: 20 },
          size: { w: 200, h: 120 },
          containedIds: []
        }
      ]
    })

    const result = connectNodeToLastInGroup(graph, 'n2', 'g1', {
      edgeIdGenerator: () => 'e-group-to-node'
    })

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].id).toBe('e-group-to-node')
    expect(result.edges[0].from.entityId).toBe('g2')
    expect(result.edges[0].to.entityId).toBe('n2')
  })
})

describe('getAutoAssignedNodeKind', () => {
  const nodeTypes: NodeTypeConfig = {
    action: { type: 'action', title: 'Action', fields: [] },
    trigger: { type: 'trigger', title: 'Trigger', fields: [] }
  }

  it('returns group kind when node has no kind and group kind exists in nodeTypes', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: '', position: { x: 0, y: 0 } }],
      groups: [
        {
          id: 'g1',
          kind: 'action',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          containedIds: ['n1']
        }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'g1', nodeTypes)).toBe('action')
  })

  it('returns null when node already has a kind', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'trigger', position: { x: 0, y: 0 } }],
      groups: [
        {
          id: 'g1',
          kind: 'action',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          containedIds: ['n1']
        }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'g1', nodeTypes)).toBe(null)
  })

  it('returns null when group kind is not in nodeTypes', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: '', position: { x: 0, y: 0 } }],
      groups: [
        {
          id: 'g1',
          kind: 'unknown',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          containedIds: ['n1']
        }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'g1', nodeTypes)).toBe(null)
  })

  it('returns null when node does not exist', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: 'action',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          containedIds: []
        }
      ]
    })

    expect(getAutoAssignedNodeKind(graph, 'nonexistent', 'g1', nodeTypes)).toBe(null)
  })

  it('returns null when group does not exist', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: '', position: { x: 0, y: 0 } }]
    })

    expect(getAutoAssignedNodeKind(graph, 'n1', 'nonexistent', nodeTypes)).toBe(null)
  })
})

describe('swapNodes', () => {
  it('swaps positions between two nodes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 10, y: 20 } },
        { id: 'n2', kind: 'action', position: { x: 300, y: 400 } }
      ]
    })

    const result = swapNodes(graph, 'n1', 'n2')

    expect(result.nodes.find(n => n.id === 'n1')?.position).toEqual({ x: 300, y: 400 })
    expect(result.nodes.find(n => n.id === 'n2')?.position).toEqual({ x: 10, y: 20 })
  })

  it('swaps edge connections', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 200 } },
        { id: 'n3', kind: 'action', position: { x: 0, y: 400 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n3' } },
        { id: 'e2', from: { entityId: 'n3' }, to: { entityId: 'n2' } }
      ]
    })

    const result = swapNodes(graph, 'n1', 'n2')

    const e1 = result.edges.find(e => e.id === 'e1')!
    expect(e1.from.entityId).toBe('n2')
    expect(e1.to.entityId).toBe('n3')

    const e2 = result.edges.find(e => e.id === 'e2')!
    expect(e2.from.entityId).toBe('n3')
    expect(e2.to.entityId).toBe('n1')
  })

  it('swaps group membership', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 100, y: 100 } },
        { id: 'n2', kind: 'action', position: { x: 400, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 50, y: 50 },
          size: { w: 300, h: 300 },
          containedIds: ['n1']
        },
        {
          id: 'g2',
          kind: 'group',
          position: { x: 350, y: 350 },
          size: { w: 300, h: 300 },
          containedIds: ['n2']
        }
      ]
    })

    const result = swapNodes(graph, 'n1', 'n2')

    expect(result.groups.find(g => g.id === 'g1')?.containedIds).toEqual(['n2'])
    expect(result.groups.find(g => g.id === 'g2')?.containedIds).toEqual(['n1'])
  })

  it('handles edge between the two swapped nodes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 0, y: 200 } }
      ],
      edges: [{ id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n2' } }]
    })

    const result = swapNodes(graph, 'n1', 'n2')

    const e1 = result.edges.find(e => e.id === 'e1')!
    expect(e1.from.entityId).toBe('n2')
    expect(e1.to.entityId).toBe('n1')
  })

  it('returns graph unchanged if a node does not exist', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }]
    })

    const result = swapNodes(graph, 'n1', 'nonexistent')
    expect(result).toBe(graph)
  })

  it('handles nodes not in any group', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 200, y: 200 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 500, y: 500 },
          size: { w: 300, h: 300 },
          containedIds: ['other']
        }
      ]
    })

    const result = swapNodes(graph, 'n1', 'n2')

    expect(result.nodes.find(n => n.id === 'n1')?.position).toEqual({ x: 200, y: 200 })
    expect(result.nodes.find(n => n.id === 'n2')?.position).toEqual({ x: 0, y: 0 })
    // Unrelated groups are unchanged
    expect(result.groups.find(g => g.id === 'g1')?.containedIds).toEqual(['other'])
  })
})

describe('removeEntityEdgesAndBridge', () => {
  it('bridges A -> B when removing middle node from A -> X -> B', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'x', kind: 'action', position: { x: 0, y: 150 } },
        { id: 'b', kind: 'action', position: { x: 0, y: 300 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'a' }, to: { entityId: 'x' } },
        { id: 'e2', from: { entityId: 'x' }, to: { entityId: 'b' } }
      ]
    })

    const result = removeEntityEdgesAndBridge(graph, 'x')

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].from.entityId).toBe('a')
    expect(result.edges[0].to.entityId).toBe('b')
  })

  it('does not bridge when only incoming edge exists', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'x', kind: 'action', position: { x: 0, y: 150 } }
      ],
      edges: [{ id: 'e1', from: { entityId: 'a' }, to: { entityId: 'x' } }]
    })

    const result = removeEntityEdgesAndBridge(graph, 'x')

    expect(result.edges).toHaveLength(0)
  })

  it('does not bridge when only outgoing edge exists', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'x', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'b', kind: 'action', position: { x: 0, y: 150 } }
      ],
      edges: [{ id: 'e1', from: { entityId: 'x' }, to: { entityId: 'b' } }]
    })

    const result = removeEntityEdgesAndBridge(graph, 'x')

    expect(result.edges).toHaveLength(0)
  })

  it('does not create self-loop bridge', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'x', kind: 'action', position: { x: 0, y: 150 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'a' }, to: { entityId: 'x' } },
        { id: 'e2', from: { entityId: 'x' }, to: { entityId: 'a' } }
      ]
    })

    const result = removeEntityEdgesAndBridge(graph, 'x')

    expect(result.edges).toHaveLength(0)
  })

  it('bridges group edges (scoped to group entity only)', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'n2', kind: 'action', position: { x: 100, y: 100 } },
        { id: 'n3', kind: 'action', position: { x: 0, y: 300 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 50, y: 50 },
          size: { w: 200, h: 200 },
          containedIds: ['n2']
        }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'g1' } },
        { id: 'e2', from: { entityId: 'g1' }, to: { entityId: 'n3' } }
      ]
    })

    const result = removeEntityEdgesAndBridge(graph, 'g1')

    const bridgeEdge = result.edges.find(e => e.from.entityId === 'n1' && e.to.entityId === 'n3')
    expect(bridgeEdge).toBeDefined()
    expect(result.edges.some(e => e.from.entityId === 'g1' || e.to.entityId === 'g1')).toBe(false)
  })

  it('preserves edgeLocked option on bridged edge', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'x', kind: 'action', position: { x: 0, y: 150 } },
        { id: 'b', kind: 'action', position: { x: 0, y: 300 } }
      ],
      edges: [
        { id: 'e1', from: { entityId: 'a' }, to: { entityId: 'x' } },
        { id: 'e2', from: { entityId: 'x' }, to: { entityId: 'b' } }
      ]
    })

    const result = removeEntityEdgesAndBridge(graph, 'x', { edgeLocked: true })

    expect(result.edges).toHaveLength(1)
    expect(result.edges[0].locked).toBe(true)
  })

  it('removes all edges when entity has no connections', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'x', kind: 'action', position: { x: 0, y: 150 } }
      ],
      edges: []
    })

    const result = removeEntityEdgesAndBridge(graph, 'x')

    expect(result.edges).toHaveLength(0)
  })
})

describe('alignNodeInGroup', () => {
  it('does not reposition when node is the only entity in the group', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 999, y: 999 } }],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 300 },
          containedIds: ['n1']
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'n1', 'g1')
    expect(result).toBe(graph)
  })

  it('stacks node below existing sibling and aligns x', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 120 } },
        { id: 'n2', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'n2', 'g1')
    const node = result.nodes.find(n => n.id === 'n2')!

    // x aligned to first sibling (n1): 120
    expect(node.position.x).toBe(120)
    // y below n1: 120 + 100 (default height) + 20 (spacing) = 240
    expect(node.position.y).toBe(240)
  })

  it('stacks below the bottommost sibling when multiple siblings exist', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 120 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 240 } },
        { id: 'n3', kind: 'action', position: { x: 800, y: 800 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 800 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'n3', 'g1')
    const node = result.nodes.find(n => n.id === 'n3')!

    // x aligned to first sibling (n1): 120
    expect(node.position.x).toBe(120)
    // y below n2 (bottommost): 240 + 100 + 20 = 360
    expect(node.position.y).toBe(360)
  })

  it('updates group bounds after alignment', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 120 } },
        { id: 'n2', kind: 'action', position: { x: 800, y: 800 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 290, h: 140 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'n2', 'g1')
    const group = result.groups.find(g => g.id === 'g1')!

    // After alignment n2 is at (120, 240), so group should wrap both nodes with padding
    // minX=120-20=100, minY=120-20=100, maxX=120+250+20=390, maxY=240+100+20=360
    expect(group.position.x).toBe(100)
    expect(group.position.y).toBe(100)
    expect(group.size.w).toBe(290)
    expect(group.size.h).toBe(260)
  })

  it('returns graph unchanged when node does not exist', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 300 },
          containedIds: []
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'nonexistent', 'g1')
    expect(result).toBe(graph)
  })

  it('returns graph unchanged when group does not exist', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }]
    })

    const result = alignNodeInGroup(graph, 'n1', 'nonexistent')
    expect(result).toBe(graph)
  })

  it('respects custom entity spacing', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 120 } },
        { id: 'n2', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'n2', 'g1', 60)
    const node = result.nodes.find(n => n.id === 'n2')!

    // y below n1: 120 + 100 + 60 = 280
    expect(node.position.y).toBe(280)
  })

  it('aligns next to nested group sibling', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 999, y: 999 } }],
      groups: [
        {
          id: 'g-parent',
          kind: 'group',
          position: { x: 50, y: 50 },
          size: { w: 500, h: 500 },
          containedIds: ['g-child', 'n1']
        },
        {
          id: 'g-child',
          kind: 'group',
          position: { x: 70, y: 70 },
          size: { w: 300, h: 200 },
          containedIds: []
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'n1', 'g-parent')
    const node = result.nodes.find(n => n.id === 'n1')!

    // x aligned to first sibling (g-child): 70
    expect(node.position.x).toBe(70)
    // y below g-child: 70 + 200 + 20 = 290
    expect(node.position.y).toBe(290)
  })
})

describe('insertEntityInGroup', () => {
  it('inserts a node at the beginning of a group', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'nNew', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = insertEntityInGroup(graph, 'nNew', 'g1', null)
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds[0]).toBe('nNew')
    expect(group.containedIds[1]).toBe('n1')
    expect(group.containedIds[2]).toBe('n2')
  })

  it('inserts a node between two existing nodes', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'nNew', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'n1')
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n1', 'nNew', 'n2'])
  })

  it('inserts a node at the end of a group', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'nNew', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'n2')
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n1', 'n2', 'nNew'])
  })

  it('removes the entity from its previous group before inserting', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'nNew', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        },
        {
          id: 'g2',
          kind: 'group',
          position: { x: 600, y: 100 },
          size: { w: 400, h: 300 },
          containedIds: ['nNew']
        }
      ]
    })

    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'n1')
    const g1 = result.groups.find(g => g.id === 'g1')!
    const g2 = result.groups.find(g => g.id === 'g2')!
    expect(g1.containedIds).toEqual(['n1', 'nNew', 'n2'])
    expect(g2.containedIds).not.toContain('nNew')
  })

  it('preserves existing positions and places inserted entity between neighbors', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 400 } },
        { id: 'nNew', kind: 'action', position: { x: 500, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'n1')
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const nNew = result.nodes.find(n => n.id === 'nNew')!
    const n2 = result.nodes.find(n => n.id === 'n2')!

    // n1 stays at original position
    expect(n1.position.y).toBe(160)
    expect(n1.position.x).toBe(120)
    // nNew placed below n1: 160 + 100 + 20 = 280
    expect(nNew.position.y).toBe(280)
    expect(nNew.position.x).toBe(120)
    // n2 was at 400, required bottom is 280+100+20=400, so n2 stays at 400 (no overlap)
    expect(n2.position.y).toBe(400)
    expect(n2.position.x).toBe(120)
  })

  it('returns graph unchanged when group does not exist', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }]
    })

    const result = insertEntityInGroup(graph, 'n1', 'nonexistent', null)
    expect(result).toBe(graph)
  })

  it('handles reordering within the same group and adjusts positions', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    // Move n3 to between n1 and n2
    const result = insertEntityInGroup(graph, 'n3', 'g1', 'n1')
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n1', 'n3', 'n2'])

    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n3 = result.nodes.find(n => n.id === 'n3')!
    const n2 = result.nodes.find(n => n.id === 'n2')!
    // n1 stays at 160, n3 placed at 160+100+20=280, n2 was at 280 so pushed to 280+100+20=400
    expect(n1.position.y).toBe(160)
    expect(n3.position.y).toBe(280)
    expect(n2.position.y).toBe(400)
  })

  it('collapses gap when moving an element down within the same group', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    // Move n1 to after n2 → [n2, n1, n3]
    const result = insertEntityInGroup(graph, 'n1', 'g1', 'n2')
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n2', 'n1', 'n3'])

    const n2 = result.nodes.find(n => n.id === 'n2')!
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n3 = result.nodes.find(n => n.id === 'n3')!

    // n2 anchors at its original y=280 (first in new order, but was second before)
    // With normalization: n2 keeps y=280, n1=280+100+20=400, n3=400+100+20=520
    // No gap left at n1's old position (y=160)
    expect(n2.position.y).toBe(280)
    expect(n1.position.y).toBe(400)
    expect(n3.position.y).toBe(520)
  })

  it('collapses gap when moving the first element to the end', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    // Move n1 to after n3 → [n2, n3, n1]
    const result = insertEntityInGroup(graph, 'n1', 'g1', 'n3')
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n2', 'n3', 'n1'])

    const n2 = result.nodes.find(n => n.id === 'n2')!
    const n3 = result.nodes.find(n => n.id === 'n3')!
    const n1 = result.nodes.find(n => n.id === 'n1')!

    // n2 anchors at 280, n3=280+100+20=400, n1=400+100+20=520
    expect(n2.position.y).toBe(280)
    expect(n3.position.y).toBe(400)
    expect(n1.position.y).toBe(520)
  })

  it('collapses gap when moving the last element to the beginning', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    // Move n3 to beginning → [n3, n1, n2]
    const result = insertEntityInGroup(graph, 'n3', 'g1', null)
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n3', 'n1', 'n2'])

    const n3 = result.nodes.find(n => n.id === 'n3')!
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n2 = result.nodes.find(n => n.id === 'n2')!

    // n3 anchors at n1's original position (160), n1=160+100+20=280, n2=280+100+20=400
    expect(n3.position.y).toBe(160)
    expect(n1.position.y).toBe(280)
    expect(n2.position.y).toBe(400)
  })

  it('maintains uniform spacing with 4 elements after reorder', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } },
        { id: 'n4', kind: 'action', position: { x: 120, y: 520 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 800 },
          containedIds: ['n1', 'n2', 'n3', 'n4']
        }
      ]
    })

    // Move n2 to after n3 → [n1, n3, n2, n4]
    const result = insertEntityInGroup(graph, 'n2', 'g1', 'n3')
    const group = result.groups.find(g => g.id === 'g1')!
    expect(group.containedIds).toEqual(['n1', 'n3', 'n2', 'n4'])

    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n3 = result.nodes.find(n => n.id === 'n3')!
    const n2 = result.nodes.find(n => n.id === 'n2')!
    const n4 = result.nodes.find(n => n.id === 'n4')!

    // All elements should be evenly spaced with no gaps
    expect(n1.position.y).toBe(160)
    expect(n3.position.y).toBe(280)
    expect(n2.position.y).toBe(400)
    expect(n4.position.y).toBe(520)
  })
})

describe('normalizeGroupSpacing', () => {
  it('collapses gap after an entity is removed from the middle', () => {
    // Simulate state after n2 was removed from [n1, n2, n3] — gap at y=280
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n3']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n3 = result.nodes.find(n => n.id === 'n3')!

    // n1 stays at 160, n3 should move up to 160+100+20=280
    expect(n1.position.y).toBe(160)
    expect(n3.position.y).toBe(280)
  })

  it('collapses gap after the first entity is removed', () => {
    // Simulate state after n1 was removed from [n1, n2, n3] — gap at top
    const graph = makeGraph({
      nodes: [
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n2', 'n3']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    const n2 = result.nodes.find(n => n.id === 'n2')!
    const n3 = result.nodes.find(n => n.id === 'n3')!

    // n2 stays at 280 (first entity keeps its position), n3 moves to 280+100+20=400
    expect(n2.position.y).toBe(280)
    expect(n3.position.y).toBe(400)
  })

  it('collapses gap after the last entity is removed', () => {
    // Simulate state after n3 was removed from [n1, n2, n3]
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n2 = result.nodes.find(n => n.id === 'n2')!

    // Already evenly spaced, nothing should change
    expect(n1.position.y).toBe(160)
    expect(n2.position.y).toBe(280)
  })

  it('normalizes uneven spacing between multiple entities', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 400 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 700 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 800 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n2 = result.nodes.find(n => n.id === 'n2')!
    const n3 = result.nodes.find(n => n.id === 'n3')!

    // n1 stays at 160, n2=160+100+20=280, n3=280+100+20=400
    expect(n1.position.y).toBe(160)
    expect(n2.position.y).toBe(280)
    expect(n3.position.y).toBe(400)
  })

  it('returns graph unchanged for empty group', () => {
    const graph = makeGraph({
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 140 },
          containedIds: []
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    expect(result).toBe(graph)
  })

  it('returns graph unchanged for nonexistent group', () => {
    const graph = makeGraph({})
    const result = normalizeGroupSpacing(graph, 'nonexistent')
    expect(result).toBe(graph)
  })

  it('respects custom entitySpacing parameter', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 500 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1', 40)
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n2 = result.nodes.find(n => n.id === 'n2')!

    // n1 stays at 160, n2=160+100+40=300
    expect(n1.position.y).toBe(160)
    expect(n2.position.y).toBe(300)
  })
})

describe('normalizeAllGroupsEntitySpacing', () => {
  it('applies spacing to all groups', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'n2']
        }
      ]
    })

    const result = normalizeAllGroupsEntitySpacing(graph, 30, 20)
    const n2 = result.nodes.find(n => n.id === 'n2')!
    expect(n2.position.y).toBe(290)
  })

  it('returns the same reference when there are no groups', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 0, y: 0 } }]
    })
    expect(normalizeAllGroupsEntitySpacing(graph)).toBe(graph)
  })
})

describe('wireEntityIntoChain', () => {
  it('wires an entity between two neighbors by replacing the old edge', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'nNew', kind: 'action', position: { x: 120, y: 220 } }
      ],
      edges: [{ id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n2' } }],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'nNew', 'n2']
        }
      ]
    })

    const result = wireEntityIntoChain(graph, 'nNew', 'g1', 'n1')

    // Old edge n1->n2 should be removed
    const oldEdge = result.edges.find(e => e.from.entityId === 'n1' && e.to.entityId === 'n2')
    expect(oldEdge).toBeUndefined()

    // New edge n1->nNew should exist
    const newEdge1 = result.edges.find(e => e.from.entityId === 'n1' && e.to.entityId === 'nNew')
    expect(newEdge1).toBeDefined()

    // New edge nNew->n2 should exist
    const newEdge2 = result.edges.find(e => e.from.entityId === 'nNew' && e.to.entityId === 'n2')
    expect(newEdge2).toBeDefined()
  })

  it('wires correctly when inserted at the beginning (no prev)', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'nNew', kind: 'action', position: { x: 120, y: 120 } }
      ],
      edges: [],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['nNew', 'n1']
        }
      ]
    })

    const result = wireEntityIntoChain(graph, 'nNew', 'g1', null)

    // Edge nNew->n1 should exist
    const edge = result.edges.find(e => e.from.entityId === 'nNew' && e.to.entityId === 'n1')
    expect(edge).toBeDefined()
  })

  it('wires correctly when inserted at the end (no next)', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'nNew', kind: 'action', position: { x: 120, y: 280 } }
      ],
      edges: [],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1', 'nNew']
        }
      ]
    })

    const result = wireEntityIntoChain(graph, 'nNew', 'g1', 'n1')

    // Edge n1->nNew should exist
    const edge = result.edges.find(e => e.from.entityId === 'n1' && e.to.entityId === 'nNew')
    expect(edge).toBeDefined()
  })

  it('returns graph unchanged when entity is not in group', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 120, y: 160 } }],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['n1']
        }
      ]
    })

    const result = wireEntityIntoChain(graph, 'nonexistent', 'g1', null)
    expect(result).toBe(graph)
  })

  it('returns graph unchanged when group does not exist', () => {
    const graph = makeGraph({
      nodes: [{ id: 'n1', kind: 'action', position: { x: 120, y: 160 } }]
    })

    const result = wireEntityIntoChain(graph, 'n1', 'nonexistent', null)
    expect(result).toBe(graph)
  })
})
