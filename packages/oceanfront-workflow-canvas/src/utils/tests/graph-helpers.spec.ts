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
  reflowParentGroupStackPreservingOrder,
  normalizeAllGroupsEntitySpacing,
  normalizeRootLevelNodesSpacing,
  normalizeCanvasEntitySpacing,
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

  it('uses measured dimensions from entityDimensions map', () => {
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

    const dims = new Map([['n1', { w: 250, h: 60 }]])
    const result = alignNodeInGroup(graph, 'n2', 'g1', 20, dims)
    const node = result.nodes.find(n => n.id === 'n2')!

    // x aligned to first sibling (n1): 120
    expect(node.position.x).toBe(120)
    // y below n1: 120 + 60 (measured) + 20 (spacing) = 200
    expect(node.position.y).toBe(200)
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

  it('only considers column-mates when computing bottom position', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 120 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 240 } },
        { id: 'side', kind: 'action', position: { x: 500, y: 800 } },
        { id: 'nNew', kind: 'action', position: { x: 999, y: 999 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 700, h: 900 },
          containedIds: ['n1', 'n2', 'side', 'nNew']
        }
      ]
    })

    const result = alignNodeInGroup(graph, 'nNew', 'g1')
    const node = result.nodes.find(n => n.id === 'nNew')!

    // Aligned to first sibling n1 (x=120), bottom of column is n2 at 240+100=340
    // NOT side at 800+100=900
    expect(node.position.x).toBe(120)
    expect(node.position.y).toBe(360) // 240 + 100 + 20
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

    // Column anchor = min(160,280,400) = 160, so the gap at n1's old
    // position is closed.  New order [n2, n1, n3] stacks from 160:
    expect(n2.position.y).toBe(160)
    expect(n1.position.y).toBe(280)
    expect(n3.position.y).toBe(400)
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

    // Column anchor = min(160,280,400) = 160, gap closed.
    // New order [n2, n3, n1] stacks from 160:
    expect(n2.position.y).toBe(160)
    expect(n3.position.y).toBe(280)
    expect(n1.position.y).toBe(400)
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

  it('uses measured dimensions from entityDimensions for stacking', () => {
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

    const dims = new Map([
      ['n1', { w: 250, h: 50 }],
      ['nNew', { w: 250, h: 75 }]
    ])

    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'n1', {
      entityDimensions: dims
    })
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const nNew = result.nodes.find(n => n.id === 'nNew')!
    const n2 = result.nodes.find(n => n.id === 'n2')!

    // n1 stays at 160
    expect(n1.position.y).toBe(160)
    // nNew placed below n1 using measured height 50: 160 + 50 + 20 = 230
    expect(nNew.position.y).toBe(230)
    // n2 placed below nNew using measured height 75: 230 + 75 + 20 = 325
    expect(n2.position.y).toBe(325)
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

  it('aligns to the correct column when inserting between nodes in a different column than the first entity', () => {
    // Simulates moving "Log Activity" (node-action-8) from group-processing-sub
    // to between "Update CRM" (node-action-5) and "Generate PDF" (node-action-6)
    // in group-processing-main. The sub-group is in a different column (x=745)
    // than the two action nodes (x≈421).
    const graph = makeGraph({
      nodes: [
        { id: 'node-action-5', kind: 'action', position: { x: 421, y: 85 } },
        { id: 'node-action-6', kind: 'action', position: { x: 422, y: 284 } },
        { id: 'node-action-7', kind: 'action', position: { x: 771, y: 80 } },
        { id: 'node-action-8', kind: 'action', position: { x: 773, y: 273 } }
      ],
      groups: [
        {
          id: 'group-processing-main',
          kind: 'phase',
          position: { x: 401, y: 40 },
          size: { w: 662, h: 445 },
          containedIds: ['group-processing-sub', 'node-action-5', 'node-action-6']
        },
        {
          id: 'group-processing-sub',
          kind: 'action',
          position: { x: 745, y: 60 },
          size: { w: 298, h: 405 },
          containedIds: ['node-action-7', 'node-action-8']
        }
      ]
    })

    const result = insertEntityInGroup(
      graph,
      'node-action-8',
      'group-processing-main',
      'node-action-5'
    )
    const n5 = result.nodes.find(n => n.id === 'node-action-5')!
    const n8 = result.nodes.find(n => n.id === 'node-action-8')!
    const n6 = result.nodes.find(n => n.id === 'node-action-6')!

    // node-action-8 should be in the same column as node-action-5 and node-action-6
    expect(n8.position.x).toBe(n5.position.x)

    // All three should be stacked vertically in order: n5, n8, n6
    expect(n5.position.y).toBeLessThan(n8.position.y)
    expect(n8.position.y).toBeLessThan(n6.position.y)

    // node-action-8 should be removed from the sub-group
    const subGroup = result.groups.find(g => g.id === 'group-processing-sub')!
    expect(subGroup.containedIds).not.toContain('node-action-8')

    // node-action-8 should be in the main group between n5 and n6
    const mainGroup = result.groups.find(g => g.id === 'group-processing-main')!
    const idx5 = mainGroup.containedIds.indexOf('node-action-5')
    const idx8 = mainGroup.containedIds.indexOf('node-action-8')
    const idx6 = mainGroup.containedIds.indexOf('node-action-6')
    expect(idx5).toBeLessThan(idx8)
    expect(idx8).toBeLessThan(idx6)
  })

  it('uses targetX to align entity to the correct column when inserting at the beginning', () => {
    // Reproduces the demo bug: dragging "Log Activity" (action-8) from
    // group-notifications to above "Send Confirmation" (action-5) in
    // group-fulfillment.  Without targetX the entity lands at the sub-group's
    // X (770) instead of action-5's column (450).
    const graph = makeGraph({
      nodes: [
        { id: 'action-5', kind: 'action', position: { x: 450, y: 60 } },
        { id: 'action-6', kind: 'action', position: { x: 450, y: 220 } },
        { id: 'action-7', kind: 'action', position: { x: 770, y: 60 } },
        { id: 'action-8', kind: 'action', position: { x: 770, y: 220 } }
      ],
      groups: [
        {
          id: 'group-fulfillment',
          kind: 'phase',
          position: { x: 430, y: 20 },
          size: { w: 630, h: 370 },
          containedIds: ['group-notifications', 'action-5', 'action-6']
        },
        {
          id: 'group-notifications',
          kind: 'action',
          position: { x: 750, y: 40 },
          size: { w: 290, h: 330 },
          containedIds: ['action-7', 'action-8']
        }
      ]
    })

    // Insert action-8 before everything in group-fulfillment, targeting
    // the action-5 column (x=450) via targetX.
    const result = insertEntityInGroup(graph, 'action-8', 'group-fulfillment', null, {
      targetX: 450
    })

    const a8 = result.nodes.find(n => n.id === 'action-8')!
    const a5 = result.nodes.find(n => n.id === 'action-5')!
    const a6 = result.nodes.find(n => n.id === 'action-6')!

    // action-8 should be in the same column as action-5 (x=450), NOT at 770
    expect(a8.position.x).toBe(450)
    // action-8 should be above action-5
    expect(a8.position.y).toBeLessThan(a5.position.y)
    // action-5 should be above action-6
    expect(a5.position.y).toBeLessThan(a6.position.y)

    // action-8 should be removed from group-notifications
    const notifGroup = result.groups.find(g => g.id === 'group-notifications')!
    expect(notifGroup.containedIds).not.toContain('action-8')

    // action-8 should be first in group-fulfillment's containedIds
    const fulfGroup = result.groups.find(g => g.id === 'group-fulfillment')!
    expect(fulfGroup.containedIds[0]).toBe('action-8')
  })

  it('does not move entities in a different column during insert', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'side', kind: 'action', position: { x: 500, y: 200 } },
        { id: 'nNew', kind: 'action', position: { x: 700, y: 700 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 700, h: 800 },
          containedIds: ['n1', 'n2', 'side']
        }
      ]
    })

    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'n1')
    const side = result.nodes.find(n => n.id === 'side')!

    // 'side' is in a different column (x=500) and should not be moved
    expect(side.position.x).toBe(500)
    expect(side.position.y).toBe(200)
  })

  it('correctly stacks only same-column entities and leaves other columns alone', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'a2', kind: 'action', position: { x: 120, y: 280 } },
        { id: 'b1', kind: 'action', position: { x: 500, y: 160 } },
        { id: 'b2', kind: 'action', position: { x: 500, y: 280 } },
        { id: 'nNew', kind: 'action', position: { x: 800, y: 800 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 800, h: 900 },
          containedIds: ['a1', 'a2', 'b1', 'b2']
        }
      ]
    })

    // Insert nNew after a1 in column A — only a1 column should restack
    const result = insertEntityInGroup(graph, 'nNew', 'g1', 'a1')

    const a1 = result.nodes.find(n => n.id === 'a1')!
    const nNew = result.nodes.find(n => n.id === 'nNew')!
    const a2 = result.nodes.find(n => n.id === 'a2')!
    const b1 = result.nodes.find(n => n.id === 'b1')!
    const b2 = result.nodes.find(n => n.id === 'b2')!

    // Column A restacked
    expect(a1.position.y).toBe(160)
    expect(nNew.position.y).toBe(280) // 160 + 100 + 20
    expect(a2.position.y).toBe(400) // 280 + 100 + 20

    // Column B untouched
    expect(b1.position.x).toBe(500)
    expect(b1.position.y).toBe(160)
    expect(b2.position.x).toBe(500)
    expect(b2.position.y).toBe(280)
  })
})

describe('reflowParentGroupStackPreservingOrder', () => {
  it('re-stacks parent after compacting nested group when a node was moved to the parent', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n8', kind: 'action', position: { x: 450, y: 0 } },
        { id: 'n7', kind: 'action', position: { x: 446, y: 169 } },
        { id: 'nMid', kind: 'action', position: { x: 446, y: 338 } },
        { id: 'n6', kind: 'action', position: { x: 446, y: 461 } },
        { id: 'n5', kind: 'action', position: { x: 469, y: 651 } },
        { id: 'n20', kind: 'action', position: { x: 469, y: 841 } }
      ],
      groups: [
        {
          id: 'gFulfill',
          kind: 'phase',
          position: { x: 426, y: -20 },
          size: { w: 333, h: 1000 },
          containedIds: ['n8', 'n7', 'nMid', 'n6', 'gNotif']
        },
        {
          id: 'gNotif',
          kind: 'action',
          position: { x: 449, y: 632 },
          size: { w: 290, h: 330 },
          containedIds: ['n5', 'n20']
        }
      ]
    })

    let g = insertEntityInGroup(graph, 'n5', 'gFulfill', 'n8', {
      entitySpacing: 20,
      targetX: 450
    })
    g = normalizeGroupSpacing(g, 'gNotif', 20, 20, undefined)

    const n6Before = g.nodes.find(n => n.id === 'n6')!
    const notifBefore = g.groups.find(gr => gr.id === 'gNotif')!
    const n6h = n6Before.size?.h ?? 100
    const gapBefore = notifBefore.position.y - (n6Before.position.y + n6h)

    g = reflowParentGroupStackPreservingOrder(g, 'gNotif', 20, 20, undefined)

    const n6After = g.nodes.find(n => n.id === 'n6')!
    const notifAfter = g.groups.find(gr => gr.id === 'gNotif')!
    const gapAfter = notifAfter.position.y - (n6After.position.y + (n6After.size?.h ?? 100))

    expect(gapBefore).toBeGreaterThan(40)
    expect(gapAfter).toBe(20)
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

  it('uses measured dimensions from entityDimensions for spacing', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 500 } },
        { id: 'n3', kind: 'action', position: { x: 120, y: 800 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 900 },
          containedIds: ['n1', 'n2', 'n3']
        }
      ]
    })

    const dims = new Map([
      ['n1', { w: 250, h: 40 }],
      ['n2', { w: 250, h: 150 }]
    ])

    const result = normalizeGroupSpacing(graph, 'g1', 20, 20, dims)
    const n1 = result.nodes.find(n => n.id === 'n1')!
    const n2 = result.nodes.find(n => n.id === 'n2')!
    const n3 = result.nodes.find(n => n.id === 'n3')!

    // n1 stays at 160, n2=160+40+20=220, n3=220+150+20=390
    expect(n1.position.y).toBe(160)
    expect(n2.position.y).toBe(220)
    expect(n3.position.y).toBe(390)
  })

  it('normalizes each visual column independently', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'a2', kind: 'action', position: { x: 120, y: 500 } },
        { id: 'b1', kind: 'action', position: { x: 500, y: 180 } },
        { id: 'b2', kind: 'action', position: { x: 500, y: 600 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 700, h: 700 },
          containedIds: ['a1', 'a2', 'b1', 'b2']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    const a1 = result.nodes.find(n => n.id === 'a1')!
    const a2 = result.nodes.find(n => n.id === 'a2')!
    const b1 = result.nodes.find(n => n.id === 'b1')!
    const b2 = result.nodes.find(n => n.id === 'b2')!

    // Column A: a1 at 160, a2 = 160+100+20 = 280
    expect(a1.position.y).toBe(160)
    expect(a2.position.y).toBe(280)

    // Column B: b1 at 180, b2 = 180+100+20 = 300
    expect(b1.position.y).toBe(180)
    expect(b2.position.y).toBe(300)
  })

  it('does not move entities in other columns', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'n2', kind: 'action', position: { x: 120, y: 700 } },
        { id: 'side', kind: 'action', position: { x: 500, y: 200 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 700, h: 800 },
          containedIds: ['n1', 'n2', 'side']
        }
      ]
    })

    const result = normalizeGroupSpacing(graph, 'g1')
    const side = result.nodes.find(n => n.id === 'side')!

    // 'side' is in a different column (x=500) — should not be moved
    expect(side.position.x).toBe(500)
    expect(side.position.y).toBe(200)
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

  it('uses measured dimensions from entityDimensions', () => {
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

    const dims = new Map([['n1', { w: 250, h: 60 }]])

    const result = normalizeAllGroupsEntitySpacing(graph, 30, 20, dims)
    const n2 = result.nodes.find(n => n.id === 'n2')!
    // n1 at 160, height 60 (measured), spacing 30 → n2 at 160+60+30=250
    expect(n2.position.y).toBe(250)
  })
})

describe('normalizeRootLevelNodesSpacing', () => {
  it('stacks ungrouped nodes in the same column with entitySpacing', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'a', kind: 'action', position: { x: 50, y: 40 } },
        { id: 'b', kind: 'action', position: { x: 50, y: 400 } }
      ],
      edges: []
    })
    const result = normalizeRootLevelNodesSpacing(graph, 50)
    const b = result.nodes.find(n => n.id === 'b')!
    expect(b.position.y).toBe(190)
  })

  it('does not move nodes inside groups', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'root', kind: 'action', position: { x: 0, y: 0 } },
        { id: 'in', kind: 'action', position: { x: 120, y: 160 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 400 },
          containedIds: ['in']
        }
      ]
    })
    const result = normalizeRootLevelNodesSpacing(graph, 50)
    expect(result.nodes.find(n => n.id === 'in')!.position.y).toBe(160)
  })
})

describe('normalizeCanvasEntitySpacing', () => {
  it('normalizes groups and root-level columns', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'root1', kind: 'action', position: { x: 10, y: 0 } },
        { id: 'root2', kind: 'action', position: { x: 10, y: 500 } },
        { id: 'g1n1', kind: 'action', position: { x: 120, y: 160 } },
        { id: 'g1n2', kind: 'action', position: { x: 120, y: 400 } }
      ],
      groups: [
        {
          id: 'g1',
          kind: 'group',
          position: { x: 100, y: 100 },
          size: { w: 400, h: 600 },
          containedIds: ['g1n1', 'g1n2']
        }
      ]
    })
    const result = normalizeCanvasEntitySpacing(graph, 30, 20)
    expect(result.nodes.find(n => n.id === 'root2')!.position.y).toBe(130)
    expect(result.nodes.find(n => n.id === 'g1n2')!.position.y).toBe(290)
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

  it('skips cross-column neighbors and wires to same-column entities only', () => {
    // Reproduces the demo scenario: action-8 inserted at beginning of
    // group-fulfillment whose containedIds are
    // ['action-8', 'group-notifications', 'action-5', 'action-6'].
    // group-notifications is at x=750 (different column), while
    // action-8, action-5, action-6 are at x=450.
    const graph = makeGraph({
      nodes: [
        { id: 'action-5', kind: 'action', position: { x: 450, y: 160 } },
        { id: 'action-6', kind: 'action', position: { x: 450, y: 280 } },
        { id: 'action-8', kind: 'action', position: { x: 450, y: 60 } }
      ],
      edges: [{ id: 'e-old', from: { entityId: 'action-5' }, to: { entityId: 'action-6' } }],
      groups: [
        {
          id: 'group-fulfillment',
          kind: 'phase',
          position: { x: 430, y: 20 },
          size: { w: 630, h: 370 },
          containedIds: ['action-8', 'group-notifications', 'action-5', 'action-6']
        },
        {
          id: 'group-notifications',
          kind: 'action',
          position: { x: 750, y: 40 },
          size: { w: 290, h: 330 },
          containedIds: []
        }
      ]
    })

    const result = wireEntityIntoChain(graph, 'action-8', 'group-fulfillment', null)

    // Should wire action-8 -> action-5 (same column), NOT action-8 -> group-notifications
    const edgeToA5 = result.edges.find(
      e => e.from.entityId === 'action-8' && e.to.entityId === 'action-5'
    )
    expect(edgeToA5).toBeDefined()

    // Should NOT create edge to group-notifications
    const edgeToNotif = result.edges.find(
      e => e.from.entityId === 'action-8' && e.to.entityId === 'group-notifications'
    )
    expect(edgeToNotif).toBeUndefined()

    // No prev for action-8 (first in its column)
    const edgeIntoA8 = result.edges.find(e => e.to.entityId === 'action-8')
    expect(edgeIntoA8).toBeUndefined()
  })
})
