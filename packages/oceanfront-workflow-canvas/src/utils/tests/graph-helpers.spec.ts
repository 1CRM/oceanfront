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
  alignNodeInGroup
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

    const result = alignNodeInGroup(graph, 'n2', 'g1', 40)
    const node = result.nodes.find(n => n.id === 'n2')!

    // y below n1: 120 + 100 + 40 = 260
    expect(node.position.y).toBe(260)
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
