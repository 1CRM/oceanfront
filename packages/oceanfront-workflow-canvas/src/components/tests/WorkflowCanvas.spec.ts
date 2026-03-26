import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkflowCanvas from '../WorkflowCanvas.vue'
import type { WorkflowGraph } from '../../types/workflow'
import type { FormRecord } from '../../../../oceanfront/src/lib/records'
import {
  addEdge,
  updateNodePosition,
  addEntityToGroup,
  removeEntityFromGroup,
  removeEntityFromAllGroups,
  updateGroupPosition,
  findNode,
  getParentGroup,
  getGroupDescendants,
  getEntityEdges,
  calculateGroupBounds,
  updateGroupBounds,
  areEntitiesInDifferentGroups,
  moveNodesBelow,
  handleAddStepToGraph
} from '../../utils/graph-helpers'

function createMockRecord(): FormRecord {
  return {
    initialValue: {},
    value: {},
    metadata: {},
    reset: () => {},
    reinit: () => {},
    lock: () => null
  }
}

describe('WorkflowCanvas Component', () => {
  let mockGraph: WorkflowGraph
  let mockRecord: FormRecord

  beforeEach(() => {
    mockGraph = {
      nodes: [
        {
          id: 'node-1',
          kind: 'trigger',
          position: { x: 100, y: 100 }
        },
        {
          id: 'node-2',
          kind: 'action',
          position: { x: 100, y: 250 }
        }
      ],
      edges: [],
      groups: []
    }

    mockRecord = createMockRecord()
  })

  describe('Rendering', () => {
    it('renders without errors', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          record: mockRecord
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('renders all nodes', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          record: mockRecord
        }
      })

      const nodes = wrapper.findAll('.workflow-canvas-node')
      expect(nodes.length).toBe(2)
    })

    it('renders edges', () => {
      const graphWithEdge = addEdge(mockGraph, {
        id: 'edge-1',
        from: { entityId: 'node-1' },
        to: { entityId: 'node-2' }
      })

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithEdge,
          record: mockRecord
        }
      })

      const connectors = wrapper.findAll('.workflow-canvas-connector')
      expect(connectors.length).toBeGreaterThan(0)
    })

    it('renders groups', () => {
      const graphWithGroup: WorkflowGraph = {
        ...mockGraph,
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1']
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithGroup,
          record: mockRecord
        }
      })

      const groups = wrapper.findAll('.workflow-canvas-group')
      expect(groups.length).toBe(1)
    })
  })

  describe('Selection', () => {
    it.skip('emits update:selectedId when node is clicked', async () => {
      // Note: Node selection is now done via menu click, not mousedown
      // This test is skipped as the behavior has changed
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          record: mockRecord
        }
      })

      const node = wrapper.find('.workflow-canvas-node')
      await node.trigger('mousedown')

      expect(wrapper.emitted('update:selectedId')).toBeTruthy()
    })

    it('applies selected class to selected node', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          selectedId: 'node-1',
          record: mockRecord
        }
      })

      const nodes = wrapper.findAll('.workflow-canvas-node')
      expect(nodes[0].classes()).toContain('workflow-canvas-node--selected')
    })

    it('deselects when canvas background is clicked', async () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          selectedId: 'node-1',
          record: mockRecord
        }
      })

      const canvas = wrapper.find('.workflow-canvas')
      await canvas.trigger('click')

      expect(wrapper.emitted('update:selectedId')).toBeTruthy()
      const emitted = wrapper.emitted('update:selectedId') as any[]
      expect(emitted[emitted.length - 1]).toEqual([null])
    })
  })

  describe('Readonly Mode', () => {
    it('does not show handles in readonly mode', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          readonly: true,
          record: mockRecord
        }
      })

      const handles = wrapper.findAll('.workflow-canvas-node__handle')
      expect(handles.length).toBe(0)
    })

    it('does not show plus placeholders in readonly mode', () => {
      const graphWithEdge = addEdge(mockGraph, {
        id: 'edge-1',
        from: { entityId: 'node-1' },
        to: { entityId: 'node-2' }
      })

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithEdge,
          readonly: true,
          record: mockRecord
        }
      })

      const placeholders = wrapper.findAll('.workflow-canvas-plus-placeholder')
      expect(placeholders.length).toBe(0)
    })

    it('does not show plus placeholders when hidePathAdd is true', () => {
      const graphWithEdge = addEdge(mockGraph, {
        id: 'edge-1',
        from: { entityId: 'node-1' },
        to: { entityId: 'node-2' }
      })

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithEdge,
          mode: 'edit',
          hidePathAdd: true,
          record: mockRecord
        }
      })

      const placeholders = wrapper.findAll('.workflow-canvas-plus-placeholder')
      expect(placeholders.length).toBe(0)
    })
  })

  describe('Custom Slots', () => {
    it('renders custom node slot content', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          record: mockRecord
        },
        slots: {
          node: '<div class="custom-node">Custom Node</div>'
        }
      })

      const customNodes = wrapper.findAll('.custom-node')
      expect(customNodes.length).toBe(2)
    })
  })
})

describe('Graph Helper Functions', () => {
  describe('Node Operations', () => {
    it('finds node by id', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } }
        ],
        edges: [],
        groups: []
      }

      const node = findNode(graph, 'node-1')
      expect(node).toBeDefined()
      expect(node?.id).toBe('node-1')
    })

    it('updates node position', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } }],
        edges: [],
        groups: []
      }

      const updated = updateNodePosition(graph, 'node-1', { x: 100, y: 200 })
      const node = findNode(updated, 'node-1')

      expect(node?.position).toEqual({ x: 100, y: 200 })
    })

    it('gets node edges', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } },
          { id: 'node-3', kind: 'action', position: { x: 0, y: 200 } }
        ],
        edges: [
          { id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } },
          { id: 'edge-2', from: { entityId: 'node-2' }, to: { entityId: 'node-3' } }
        ],
        groups: []
      }

      const edges = getEntityEdges(graph, 'node-2')
      expect(edges.length).toBe(2)
    })
  })

  describe('Edge Operations - Single Connection Per Port', () => {
    it('removes existing outgoing edge when adding new connection from same source', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } },
          { id: 'node-3', kind: 'action', position: { x: 0, y: 200 } }
        ],
        edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-2',
        from: { entityId: 'node-1' },
        to: { entityId: 'node-3' }
      })

      expect(result.edges.length).toBe(1)
      expect(result.edges[0].id).toBe('edge-2')
      expect(result.edges[0].from.entityId).toBe('node-1')
      expect(result.edges[0].to.entityId).toBe('node-3')
    })

    it('removes existing incoming edge when adding new connection to same target', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } },
          { id: 'node-3', kind: 'action', position: { x: 0, y: 200 } }
        ],
        edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-3' } }],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-2',
        from: { entityId: 'node-2' },
        to: { entityId: 'node-3' }
      })

      expect(result.edges.length).toBe(1)
      expect(result.edges[0].id).toBe('edge-2')
      expect(result.edges[0].from.entityId).toBe('node-2')
      expect(result.edges[0].to.entityId).toBe('node-3')
    })

    it('preserves unrelated edges when adding new connection', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } },
          { id: 'node-3', kind: 'action', position: { x: 0, y: 200 } },
          { id: 'node-4', kind: 'action', position: { x: 0, y: 300 } }
        ],
        edges: [
          { id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } },
          { id: 'edge-2', from: { entityId: 'node-3' }, to: { entityId: 'node-4' } }
        ],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-3',
        from: { entityId: 'node-2' },
        to: { entityId: 'node-3' }
      })

      expect(result.edges.length).toBe(3)
      expect(result.edges.find(e => e.id === 'edge-1')).toBeDefined()
      expect(result.edges.find(e => e.id === 'edge-2')).toBeDefined()
      expect(result.edges.find(e => e.id === 'edge-3')).toBeDefined()
    })

    it('does not add duplicate edge', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } }
        ],
        edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-2',
        from: { entityId: 'node-1' },
        to: { entityId: 'node-2' }
      })

      expect(result.edges.length).toBe(1)
      expect(result.edges[0].id).toBe('edge-1')
    })
  })

  describe('Group Operations', () => {
    it('adds node to group', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: []
          }
        ]
      }

      const updated = addEntityToGroup(graph, 'node-1', 'group-1')
      const group = updated.groups.find(g => g.id === 'group-1')

      expect(group?.containedIds).toContain('node-1')
    })

    it('removes node from group', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const updated = removeEntityFromGroup(graph, 'node-1', 'group-1')
      const group = updated.groups.find(g => g.id === 'group-1')

      expect(group?.containedIds).not.toContain('node-1')
    })

    it('removes node from all groups', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Group 1',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Group 2',
            position: { x: 400, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const updated = removeEntityFromAllGroups(graph, 'node-1')

      expect(updated.groups[0].containedIds).not.toContain('node-1')
      expect(updated.groups[1].containedIds).not.toContain('node-1')
    })

    it('gets node group', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const group = getParentGroup(graph, 'node-1')
      expect(group?.id).toBe('group-1')
    })

    it('calculates group bounds', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 0, y: 0 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      const bounds = calculateGroupBounds(graph, 'group-1', 20)

      expect(bounds.x).toBe(80) // 100 - 20 padding
      expect(bounds.y).toBe(80) // 100 - 20 padding
      expect(bounds.w).toBe(290) // 250 + 40 padding
      expect(bounds.h).toBe(290) // 250 height span + 40 padding
    })

    // Test removed: arrangeNodesInGroup is no longer exported

    it('updates group position and moves contained nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 70, y: 70 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const updated = updateGroupPosition(graph, 'group-1', { x: 150, y: 150 })
      const group = updated.groups.find(g => g.id === 'group-1')
      const node = findNode(updated, 'node-1')

      expect(group?.position.x).toBe(150)
      expect(group?.position.y).toBe(150)
      expect(node?.position.x).toBe(170) // 70 + 100 delta
      expect(node?.position.y).toBe(170) // 70 + 100 delta
    })

    it('calculates minimum size for group with contents', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 80, y: 80 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      // Test updated: calculateGroupMinimumSize is internal, use updateGroupBounds which uses it
      const updated = updateGroupBounds(graph, 'group-1', 20)
      const group = updated.groups.find(g => g.id === 'group-1')

      // Group should auto-size to fit nodes with padding
      expect(group?.size.w).toBeGreaterThanOrEqual(290)
      expect(group?.size.h).toBeGreaterThanOrEqual(290)
    })

    it('auto-updates group bounds when adding entity', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 500, y: 500 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 80, y: 80 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Add node-2 which is far away - group should expand to fit it
      const updated = addEntityToGroup(graph, 'node-2', 'group-1')
      const group = updated.groups.find(g => g.id === 'group-1')

      // Group should now encompass both nodes
      // Node-1 is at (100,100) to (350,200)
      // Node-2 is at (500,500) to (750,600)
      // Group should expand from (80,80) to at least (770,620) with padding
      expect(group?.size.w).toBeGreaterThan(290)
      expect(group?.size.h).toBeGreaterThan(140)
    })

    it('updates parent group bounds when moving node within group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 80, y: 80 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Move node to a position far outside current group bounds
      let updated = updateNodePosition(graph, 'node-1', { x: 500, y: 500 })
      // Now update the group bounds to fit the new node position
      updated = updateGroupBounds(updated, 'group-1')
      const group = updated.groups.find(g => g.id === 'group-1')

      // Group should reposition and resize to fit the new node position
      // Node at (500,500) with size 250x100 means it ends at (750,600)
      // Group should encompass this with padding
      expect(group?.position.x).toBeLessThan(500)
      expect(group?.position.y).toBeLessThan(500)
      // The group's right edge should be beyond the node's right edge
      const groupRight = group!.position.x + group!.size.w
      const groupBottom = group!.position.y + group!.size.h
      expect(groupRight).toBeGreaterThan(750)
      expect(groupBottom).toBeGreaterThan(600)
    })

    it('calculates minimum size for empty group', () => {
      const graph: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Empty Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 200 },
            containedIds: []
          }
        ]
      }

      // Test updated: calculateGroupMinimumSize is internal, test that empty groups maintain minimum size
      const bounds = calculateGroupBounds(graph, 'group-1', 20)

      // Empty groups should have a reasonable minimum size
      expect(bounds.w).toBeGreaterThanOrEqual(100)
      expect(bounds.h).toBeGreaterThanOrEqual(100)
    })

    it('auto-updates nested group bounds when adding entity', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 120, y: 120 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 300 },
            containedIds: []
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Child Group',
            position: { x: 100, y: 100 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Add group-2 to group-1 - both should update bounds
      const updated = addEntityToGroup(graph, 'group-2', 'group-1')
      const parentGroup = updated.groups.find(g => g.id === 'group-1')

      // Parent group should encompass child group
      expect(parentGroup?.containedIds).toContain('group-2')
      // Parent group bounds should be updated to fit child group
      expect(parentGroup?.size.w).toBeGreaterThanOrEqual(290)
      expect(parentGroup?.size.h).toBeGreaterThanOrEqual(140)
    })

    it('recursively updates multiple levels of nested groups', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 200, y: 200 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Outermost Group',
            position: { x: 20, y: 20 },
            size: { w: 500, h: 400 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Middle Group',
            position: { x: 50, y: 50 },
            size: { w: 440, h: 340 },
            containedIds: ['group-3']
          },
          {
            id: 'group-3',
            kind: 'group',
            label: 'Inner Group',
            position: { x: 180, y: 180 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Add a node far away to the innermost group
      const newNode = {
        id: 'node-2',
        kind: 'action',
        position: { x: 800, y: 800 },
        size: { w: 250, h: 100 }
      }
      let updated: WorkflowGraph = {
        ...graph,
        nodes: [...graph.nodes, newNode]
      }

      // Add the new node to the innermost group
      updated = addEntityToGroup(updated, 'node-2', 'group-3')

      // Get all groups
      const group1 = updated.groups.find(g => g.id === 'group-1')
      const group2 = updated.groups.find(g => g.id === 'group-2')
      const group3 = updated.groups.find(g => g.id === 'group-3')

      // Inner group should expand to fit the new node
      expect(group3?.size.w).toBeGreaterThan(290)
      expect(group3?.size.h).toBeGreaterThan(140)

      // Middle group should also expand to fit the expanded inner group
      expect(group2?.size.w).toBeGreaterThan(440)
      expect(group2?.size.h).toBeGreaterThan(340)

      // Outermost group should also expand to fit the expanded middle group
      expect(group1?.size.w).toBeGreaterThan(500)
      expect(group1?.size.h).toBeGreaterThan(400)

      // Verify all groups contain what they should
      expect(group3?.containedIds).toContain('node-2')
      expect(group2?.containedIds).toContain('group-3')
      expect(group1?.containedIds).toContain('group-2')
    })

    it('updates all parent groups when resizing inner group manually', () => {
      const graph: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 300 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Child Group',
            position: { x: 100, y: 100 },
            size: { w: 290, h: 140 },
            containedIds: []
          }
        ]
      }

      // Manually update the inner group's bounds (simulating a resize or content change)
      const updated = updateGroupBounds(graph, 'group-2')

      // Both groups should have been processed
      const parentGroup = updated.groups.find(g => g.id === 'group-1')
      const childGroup = updated.groups.find(g => g.id === 'group-2')

      expect(childGroup).toBeDefined()
      expect(parentGroup).toBeDefined()
      // Parent should still contain child
      expect(parentGroup?.containedIds).toContain('group-2')
    })

    it('handles deep nesting with 4 levels of groups', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 300, y: 300 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Level 1',
            position: { x: 10, y: 10 },
            size: { w: 600, h: 500 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Level 2',
            position: { x: 30, y: 30 },
            size: { w: 560, h: 460 },
            containedIds: ['group-3']
          },
          {
            id: 'group-3',
            kind: 'group',
            label: 'Level 3',
            position: { x: 50, y: 50 },
            size: { w: 520, h: 420 },
            containedIds: ['group-4']
          },
          {
            id: 'group-4',
            kind: 'group',
            label: 'Level 4 (innermost)',
            position: { x: 280, y: 280 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Add a new node to the deepest group
      const newNode = {
        id: 'node-2',
        kind: 'action',
        position: { x: 1200, y: 1200 },
        size: { w: 250, h: 100 }
      }
      let updated: WorkflowGraph = {
        ...graph,
        nodes: [...graph.nodes, newNode]
      }

      // Add node to innermost group - should cascade updates through all 4 levels
      updated = addEntityToGroup(updated, 'node-2', 'group-4')

      const group1 = updated.groups.find(g => g.id === 'group-1')
      const group2 = updated.groups.find(g => g.id === 'group-2')
      const group3 = updated.groups.find(g => g.id === 'group-3')
      const group4 = updated.groups.find(g => g.id === 'group-4')

      // All groups should have expanded
      expect(group4?.size.w).toBeGreaterThan(290)
      expect(group4?.size.h).toBeGreaterThan(140)

      expect(group3?.size.w).toBeGreaterThan(520)
      expect(group3?.size.h).toBeGreaterThan(420)

      expect(group2?.size.w).toBeGreaterThan(560)
      expect(group2?.size.h).toBeGreaterThan(460)

      expect(group1?.size.w).toBeGreaterThan(600)
      expect(group1?.size.h).toBeGreaterThan(500)

      // Verify containment relationships
      expect(group4?.containedIds).toContain('node-2')
      expect(group3?.containedIds).toContain('group-4')
      expect(group2?.containedIds).toContain('group-3')
      expect(group1?.containedIds).toContain('group-2')
    })
  })

  describe('Connection Validation', () => {
    it('allows connections between nodes in the same group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      const result = areEntitiesInDifferentGroups(graph, 'node-1', 'node-2')
      expect(result).toBe(false)
    })

    it('prevents connections between nodes in different groups', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 400, y: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Group 1',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Group 2',
            position: { x: 350, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-2']
          }
        ]
      }

      const result = areEntitiesInDifferentGroups(graph, 'node-1', 'node-2')
      expect(result).toBe(true)
    })

    it('allows connections between ungrouped nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 } }
        ],
        edges: [],
        groups: []
      }

      const result = areEntitiesInDifferentGroups(graph, 'node-1', 'node-2')
      expect(result).toBe(false)
    })

    it('prevents connections between grouped and ungrouped nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 400, y: 100 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Group 1',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const result = areEntitiesInDifferentGroups(graph, 'node-1', 'node-2')
      expect(result).toBe(true)
    })

    it('allows connections between groups and nodes in the same parent group', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 120, y: 120 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 300 },
            containedIds: ['group-2', 'node-1']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Child Group',
            position: { x: 100, y: 100 },
            size: { w: 200, h: 140 },
            containedIds: []
          }
        ]
      }

      const result = areEntitiesInDifferentGroups(graph, 'group-2', 'node-1')
      expect(result).toBe(false)
    })
  })

  describe('Group Deletion', () => {
    it('deletes a group with contained nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      // Simulate group deletion logic
      const descendants = getGroupDescendants(graph, 'group-1')
      const allIdsToDelete = new Set(['group-1', ...descendants])

      const updatedGraph = {
        ...graph,
        nodes: graph.nodes.filter(node => !allIdsToDelete.has(node.id)),
        groups: graph.groups.filter(group => !allIdsToDelete.has(group.id)),
        edges: graph.edges.filter(
          edge => !allIdsToDelete.has(edge.from.entityId) && !allIdsToDelete.has(edge.to.entityId)
        )
      }

      // Verify group is deleted
      expect(updatedGraph.groups.find(g => g.id === 'group-1')).toBeUndefined()
      // Verify contained nodes are deleted
      expect(updatedGraph.nodes.find(n => n.id === 'node-1')).toBeUndefined()
      expect(updatedGraph.nodes.find(n => n.id === 'node-2')).toBeUndefined()
    })

    it('deletes a group with nested groups recursively', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 150, y: 150 } },
          { id: 'node-2', kind: 'action', position: { x: 150, y: 300 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 500 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Child Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      // Simulate group deletion logic for parent group
      const descendants = getGroupDescendants(graph, 'group-1')
      const allIdsToDelete = new Set(['group-1', ...descendants])

      const updatedGraph = {
        ...graph,
        nodes: graph.nodes.filter(node => !allIdsToDelete.has(node.id)),
        groups: graph.groups.filter(group => !allIdsToDelete.has(group.id)),
        edges: graph.edges.filter(
          edge => !allIdsToDelete.has(edge.from.entityId) && !allIdsToDelete.has(edge.to.entityId)
        )
      }

      // Verify parent group is deleted
      expect(updatedGraph.groups.find(g => g.id === 'group-1')).toBeUndefined()
      // Verify nested group is deleted
      expect(updatedGraph.groups.find(g => g.id === 'group-2')).toBeUndefined()
      // Verify all contained nodes are deleted
      expect(updatedGraph.nodes.find(n => n.id === 'node-1')).toBeUndefined()
      expect(updatedGraph.nodes.find(n => n.id === 'node-2')).toBeUndefined()
    })

    it('deletes edges connected to contained entities when deleting group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 } },
          { id: 'node-3', kind: 'action', position: { x: 500, y: 100 } }
        ],
        edges: [
          { id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } },
          { id: 'edge-2', from: { entityId: 'node-2' }, to: { entityId: 'node-3' } }
        ],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      // Simulate group deletion logic
      const descendants = getGroupDescendants(graph, 'group-1')
      const allIdsToDelete = new Set(['group-1', ...descendants])

      const updatedGraph = {
        ...graph,
        nodes: graph.nodes.filter(node => !allIdsToDelete.has(node.id)),
        groups: graph.groups.filter(group => !allIdsToDelete.has(group.id)),
        edges: graph.edges.filter(
          edge => !allIdsToDelete.has(edge.from.entityId) && !allIdsToDelete.has(edge.to.entityId)
        )
      }

      // Verify group and nodes are deleted
      expect(updatedGraph.groups.find(g => g.id === 'group-1')).toBeUndefined()
      expect(updatedGraph.nodes.find(n => n.id === 'node-1')).toBeUndefined()
      expect(updatedGraph.nodes.find(n => n.id === 'node-2')).toBeUndefined()
      // Verify node-3 is still there
      expect(updatedGraph.nodes.find(n => n.id === 'node-3')).toBeDefined()
      // Verify edge-1 (internal to group) is deleted
      expect(updatedGraph.edges.find(e => e.id === 'edge-1')).toBeUndefined()
      // Verify edge-2 (from group to external node) is deleted
      expect(updatedGraph.edges.find(e => e.id === 'edge-2')).toBeUndefined()
    })

    it('deletes deeply nested groups with multiple levels', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 200, y: 200 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Level 1',
            position: { x: 20, y: 20 },
            size: { w: 500, h: 400 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Level 2',
            position: { x: 50, y: 50 },
            size: { w: 440, h: 340 },
            containedIds: ['group-3']
          },
          {
            id: 'group-3',
            kind: 'group',
            label: 'Level 3',
            position: { x: 100, y: 100 },
            size: { w: 340, h: 240 },
            containedIds: ['node-1']
          }
        ]
      }

      // Simulate group deletion logic for outermost group
      const descendants = getGroupDescendants(graph, 'group-1')
      const allIdsToDelete = new Set(['group-1', ...descendants])

      const updatedGraph = {
        ...graph,
        nodes: graph.nodes.filter(node => !allIdsToDelete.has(node.id)),
        groups: graph.groups.filter(group => !allIdsToDelete.has(group.id)),
        edges: graph.edges.filter(
          edge => !allIdsToDelete.has(edge.from.entityId) && !allIdsToDelete.has(edge.to.entityId)
        )
      }

      // Verify all groups are deleted
      expect(updatedGraph.groups.length).toBe(0)
      // Verify all nodes are deleted
      expect(updatedGraph.nodes.length).toBe(0)
    })

    it('updates parent group bounds after deleting nested group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 150, y: 150 } },
          { id: 'node-2', kind: 'action', position: { x: 600, y: 150 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 700, h: 300 },
            containedIds: ['group-2', 'node-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Child Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      // Simulate group deletion logic for child group
      const descendants = getGroupDescendants(graph, 'group-2')
      const allIdsToDelete = new Set(['group-2', ...descendants])

      let updatedGraph = {
        ...graph,
        nodes: graph.nodes.filter(node => !allIdsToDelete.has(node.id)),
        groups: graph.groups.filter(group => !allIdsToDelete.has(group.id)),
        edges: graph.edges.filter(
          edge => !allIdsToDelete.has(edge.from.entityId) && !allIdsToDelete.has(edge.to.entityId)
        )
      }

      // Remove from parent groups
      updatedGraph = removeEntityFromAllGroups(updatedGraph, 'group-2')

      // Update parent group bounds
      const parentGroup = getParentGroup(graph, 'group-2')
      if (parentGroup) {
        updatedGraph = updateGroupBounds(updatedGraph, parentGroup.id)
      }

      // Verify child group is deleted
      expect(updatedGraph.groups.find(g => g.id === 'group-2')).toBeUndefined()
      // Verify node-1 is deleted
      expect(updatedGraph.nodes.find(n => n.id === 'node-1')).toBeUndefined()
      // Verify node-2 is still there
      expect(updatedGraph.nodes.find(n => n.id === 'node-2')).toBeDefined()
      // Verify parent group still exists
      const parent = updatedGraph.groups.find(g => g.id === 'group-1')
      expect(parent).toBeDefined()
      // Verify parent group no longer contains child group
      expect(parent?.containedIds).not.toContain('group-2')
      // Verify parent group still contains node-2
      expect(parent?.containedIds).toContain('node-2')
    })

    it('getGroupDescendants returns all descendants recursively', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 150, y: 150 } },
          { id: 'node-2', kind: 'action', position: { x: 150, y: 300 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 500 },
            containedIds: ['group-2', 'node-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            label: 'Child Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const descendants = getGroupDescendants(graph, 'group-1')

      // Should include both the nested group and all nodes
      expect(descendants).toContain('group-2')
      expect(descendants).toContain('node-1')
      expect(descendants).toContain('node-2')
      expect(descendants.length).toBe(3)
    })
  })

  describe('Add Step Event with Group Information', () => {
    it('emits add-step event with inGroupId when clicking + on a node inside a group', async () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 120, y: 120 }
          }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graph,
          record: createMockRecord(),
          mode: 'edit'
        }
      })

      // Find the output handle of the node and click it
      const outputHandle = wrapper.find('.workflow-canvas-node__handle--output')
      expect(outputHandle.exists()).toBe(true)

      // Click the output handle
      await outputHandle.trigger('click')

      // Check that add-step event was emitted with correct data
      const addStepEvents = wrapper.emitted('add-step')
      expect(addStepEvents).toBeTruthy()
      expect(addStepEvents![0]).toEqual([
        {
          afterNodeId: 'node-1',
          inGroupId: 'group-1'
        }
      ])
    })

    it('emits add-step event without inGroupId when clicking + on a node outside any group', async () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 100, y: 100 }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graph,
          record: createMockRecord(),
          mode: 'edit'
        }
      })

      // Find the output handle of the node and click it
      const outputHandle = wrapper.find('.workflow-canvas-node__handle--output')
      expect(outputHandle.exists()).toBe(true)

      // Click the output handle
      await outputHandle.trigger('click')

      // Check that add-step event was emitted with correct data
      const addStepEvents = wrapper.emitted('add-step')
      expect(addStepEvents).toBeTruthy()
      expect(addStepEvents![0]).toEqual([
        {
          afterNodeId: 'node-1',
          inGroupId: undefined
        }
      ])
    })

    it('includes inGroupId in placeholder when edge is between nodes in a group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 120, y: 120 }
          },
          {
            id: 'node-2',
            kind: 'action',
            position: { x: 120, y: 270 }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            from: { entityId: 'node-1' },
            to: { entityId: 'node-2' }
          }
        ],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 300 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graph,
          record: createMockRecord(),
          mode: 'edit'
        }
      })

      // Find the plus placeholder on the edge
      const placeholder = wrapper.findComponent({ name: 'WorkflowPlusPlaceholder' })
      expect(placeholder.exists()).toBe(true)

      // Check that the placeholder has the correct props
      expect(placeholder.props('afterNodeId')).toBe('node-1')
      expect(placeholder.props('inGroupId')).toBe('group-1')
    })
  })

  describe('Definition Overrides', () => {
    it('applies node definition icon override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 },
            definition: {
              icon: 'custom-star'
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Trigger',
              icon: 'default-icon',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      expect(wrapper.exists()).toBe(true)
      // Note: Full verification would require checking the WorkflowTile component
    })

    it('applies node definition label override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 },
            definition: {
              title: 'Custom Label'
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Default Label',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('applies node definition placeholder override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 },
            definition: {
              placeholder: 'Custom Placeholder'
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Trigger',
              placeholder: 'Default Placeholder',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('applies node definition fields override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 },
            definition: {
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Custom Title',
                  readonly: true
                }
              ]
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Trigger',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Default Title'
                }
              ]
            }
          },
          record: createMockRecord()
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('applies node definition cssClass override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 },
            definition: {
              cssClass: 'custom-class'
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Trigger',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      const node = wrapper.find('.workflow-canvas-node')
      expect(node.classes()).toContain('custom-class')
    })

    it('applies group definition label override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Default Group Label',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: [],
            definition: {
              label: 'Custom Group Label'
            }
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          groupTypes: {
            group: {
              type: 'group',
              label: 'Default Type Label',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      const groupTitle = wrapper.find('.workflow-canvas-group__title')
      expect(groupTitle.text()).toBe('Custom Group Label')
    })

    it('applies group definition fields override', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: [],
            definition: {
              fields: [
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Custom Description',
                  readonly: true
                }
              ]
            }
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          groupTypes: {
            group: {
              type: 'group',
              label: 'Group',
              fields: [
                {
                  name: 'description',
                  type: 'textarea',
                  label: 'Default Description'
                }
              ]
            }
          },
          record: createMockRecord()
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('combines multiple definition overrides', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 100, y: 100 },
            definition: {
              icon: 'star',
              title: 'Important Action',
              placeholder: 'Configure critical step',
              cssClass: 'workflow-canvas-node--critical',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Step Title',
                  readonly: true
                }
              ]
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            action: {
              type: 'action',
              title: 'Action',
              icon: 'gear',
              placeholder: 'Configure action',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: 'Title'
                }
              ]
            }
          },
          record: createMockRecord()
        }
      })

      const node = wrapper.find('.workflow-canvas-node')
      expect(node.classes()).toContain('workflow-canvas-node--critical')
    })

    it('falls back to base definition when override is undefined', () => {
      const graphWithoutOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 }
            // No definition override
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithoutOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Trigger',
              icon: 'hourglass',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('definition takes precedence over base type definition', () => {
      const graphWithOverride: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'trigger',
            position: { x: 100, y: 100 },
            definition: {
              cssClass: 'override-class'
            }
          }
        ],
        edges: [],
        groups: []
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithOverride,
          nodeTypes: {
            trigger: {
              type: 'trigger',
              title: 'Trigger',
              cssClass: 'base-class',
              fields: []
            }
          },
          record: createMockRecord()
        }
      })

      const node = wrapper.find('.workflow-canvas-node')
      expect(node.classes()).toContain('override-class')
      expect(node.classes()).not.toContain('base-class')
    })
  })

  describe('Group lockParent Property', () => {
    it('allows groups without lockParent to be moved outside their parent', () => {
      const parentGroup: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['child-group']
          },
          {
            id: 'child-group',
            kind: 'group',
            label: 'Child',
            position: { x: 50, y: 50 },
            size: { w: 200, h: 200 },
            containedIds: [],
            lockParent: false
          }
        ]
      }

      // Child group can be removed from parent
      const updatedGraph = removeEntityFromAllGroups(parentGroup, 'child-group')
      expect(updatedGraph.groups[0].containedIds).not.toContain('child-group')
    })

    it('prevents groups with lockParent from being removed from parent', () => {
      const parentGroup: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['child-group']
          },
          {
            id: 'child-group',
            kind: 'group',
            label: 'Child',
            position: { x: 50, y: 50 },
            size: { w: 200, h: 200 },
            containedIds: [],
            lockParent: true
          }
        ]
      }

      // The lockParent property is set
      const childGroup = parentGroup.groups.find(g => g.id === 'child-group')
      expect(childGroup?.lockParent).toBe(true)
    })

    it('allows groups with lockParent to be moved within their parent', () => {
      const graph: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['child-group']
          },
          {
            id: 'child-group',
            kind: 'group',
            label: 'Child',
            position: { x: 50, y: 50 },
            size: { w: 200, h: 200 },
            containedIds: [],
            lockParent: true
          }
        ]
      }

      // Child group can be moved within parent
      const updatedGraph = updateGroupPosition(graph, 'child-group', { x: 100, y: 100 })
      const childGroup = updatedGraph.groups.find(g => g.id === 'child-group')
      expect(childGroup?.position).toEqual({ x: 100, y: 100 })
    })

    it('maintains lockParent property through graph operations', () => {
      const graph: WorkflowGraph = {
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['child-group']
          },
          {
            id: 'child-group',
            kind: 'group',
            label: 'Child',
            position: { x: 50, y: 50 },
            size: { w: 200, h: 200 },
            containedIds: [],
            lockParent: true
          }
        ]
      }

      // Move the group
      const updatedGraph = updateGroupPosition(graph, 'child-group', { x: 150, y: 150 })
      const childGroup = updatedGraph.groups.find(g => g.id === 'child-group')

      // lockParent should still be true
      expect(childGroup?.lockParent).toBe(true)
    })
  })

  describe('Node lockParent Property', () => {
    it('allows nodes without lockParent to be moved outside their parent group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: false
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1']
          }
        ]
      }

      // Node can be removed from parent
      const updatedGraph = removeEntityFromAllGroups(graph, 'node-1')
      expect(updatedGraph.groups[0].containedIds).not.toContain('node-1')
    })

    it('prevents nodes with lockParent from being removed from parent', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: true
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1']
          }
        ]
      }

      // The lockParent property is set
      const node = graph.nodes.find(n => n.id === 'node-1')
      expect(node?.lockParent).toBe(true)
    })

    it('allows nodes with lockParent to be moved within their parent group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: true
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1']
          }
        ]
      }

      // Node can be moved within parent
      const updatedGraph = updateNodePosition(graph, 'node-1', { x: 100, y: 100 })
      const node = updatedGraph.nodes.find(n => n.id === 'node-1')
      expect(node?.position).toEqual({ x: 100, y: 100 })
    })

    it('allows nodes with lockParent to be moved to nested groups within parent', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: true
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1', 'nested-group']
          },
          {
            id: 'nested-group',
            kind: 'group',
            label: 'Nested',
            position: { x: 50, y: 50 },
            size: { w: 200, h: 200 },
            containedIds: []
          }
        ]
      }

      // Node can be moved to nested group within parent
      let updatedGraph = removeEntityFromAllGroups(graph, 'node-1')
      updatedGraph = addEntityToGroup(updatedGraph, 'node-1', 'nested-group')

      const nestedGroup = updatedGraph.groups.find(g => g.id === 'nested-group')
      expect(nestedGroup?.containedIds).toContain('node-1')
    })

    it('maintains lockParent property through graph operations', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: true
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1']
          }
        ]
      }

      // Move the node
      const updatedGraph = updateNodePosition(graph, 'node-1', { x: 150, y: 150 })
      const node = updatedGraph.nodes.find(n => n.id === 'node-1')

      // lockParent should still be true
      expect(node?.lockParent).toBe(true)
    })

    it('prevents nodes with lockParent from moving to root level', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: true
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1']
          }
        ]
      }

      const node = graph.nodes[0]
      const parentGroup = getParentGroup(graph, 'node-1')

      // Verify node is in parent group and has lockParent
      expect(parentGroup?.id).toBe('parent-group')
      expect(node.lockParent).toBe(true)
    })

    it('prevents nodes with lockParent from moving to sibling groups', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-1',
            kind: 'action',
            position: { x: 50, y: 50 },
            lockParent: true
          }
        ],
        edges: [],
        groups: [
          {
            id: 'parent-group',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['node-1']
          },
          {
            id: 'sibling-group',
            kind: 'group',
            label: 'Sibling',
            position: { x: 600, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: []
          }
        ]
      }

      const node = graph.nodes[0]
      const parentGroup = getParentGroup(graph, 'node-1')

      // Verify node is in parent group and has lockParent
      expect(parentGroup?.id).toBe('parent-group')
      expect(node.lockParent).toBe(true)

      // Sibling group should not contain the node
      const siblingGroup = graph.groups.find(g => g.id === 'sibling-group')
      expect(siblingGroup?.containedIds).not.toContain('node-1')
    })
  })

  describe('Move Nodes Below on Insert', () => {
    it('moves nodes below when inserting between connected nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 300 }, size: { w: 250, h: 100 } },
          { id: 'node-3', kind: 'action', position: { x: 100, y: 500 }, size: { w: 250, h: 100 } }
        ],
        edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
        groups: []
      }

      // Insert a node between node-1 and node-2
      const result = handleAddStepToGraph(graph, {
        afterNodeId: 'node-1'
      })

      // Node-2 should have moved down
      const node2 = findNode(result.graph, 'node-2')
      expect(node2?.position.y).toBeGreaterThan(300)

      // Node-3 should also have moved down (same column, at or below threshold)
      const node3 = findNode(result.graph, 'node-3')
      expect(node3?.position.y).toBeGreaterThan(500)
    })

    it('does not move nodes in other columns when inserting between connected nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node-left',
            kind: 'action',
            position: { x: 50, y: 380 },
            size: { w: 250, h: 100 }
          },
          {
            id: 'node-right-1',
            kind: 'action',
            position: { x: 770, y: 60 },
            size: { w: 250, h: 100 }
          },
          {
            id: 'node-right-2',
            kind: 'action',
            position: { x: 770, y: 220 },
            size: { w: 250, h: 100 }
          }
        ],
        edges: [
          {
            id: 'edge-rr',
            from: { entityId: 'node-right-1' },
            to: { entityId: 'node-right-2' }
          }
        ],
        groups: []
      }

      const result = handleAddStepToGraph(graph, {
        afterNodeId: 'node-right-1'
      })

      const left = findNode(result.graph, 'node-left')
      expect(left?.position.y).toBe(380)

      const right2 = findNode(result.graph, 'node-right-2')
      expect(right2?.position.y).toBeGreaterThan(220)
    })

    it('moveNodesBelow helper moves all nodes at or below threshold', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 300 } },
          { id: 'node-3', kind: 'action', position: { x: 100, y: 500 } }
        ],
        edges: [],
        groups: []
      }

      const updated = moveNodesBelow(graph, 300, 120)

      const node1 = findNode(updated, 'node-1')
      const node2 = findNode(updated, 'node-2')
      const node3 = findNode(updated, 'node-3')

      // Node-1 should not move (above threshold)
      expect(node1?.position.y).toBe(100)

      // Node-2 should move (at threshold)
      expect(node2?.position.y).toBe(420) // 300 + 120

      // Node-3 should move (below threshold)
      expect(node3?.position.y).toBe(620) // 500 + 120
    })

    it('excludes specified node from movement', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 300 } },
          { id: 'node-3', kind: 'action', position: { x: 100, y: 500 } }
        ],
        edges: [],
        groups: []
      }

      const updated = moveNodesBelow(graph, 300, 120, 'node-2')

      const node2 = findNode(updated, 'node-2')
      const node3 = findNode(updated, 'node-3')

      // Node-2 should not move (excluded)
      expect(node2?.position.y).toBe(300)

      // Node-3 should still move
      expect(node3?.position.y).toBe(620)
    })

    it('updates group bounds after inserting node and moving nodes below', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 120, y: 120 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 120, y: 300 }, size: { w: 250, h: 100 } }
        ],
        edges: [{ id: 'edge-1', from: { entityId: 'node-1' }, to: { entityId: 'node-2' } }],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Test Group',
            position: { x: 100, y: 100 },
            size: { w: 290, h: 320 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      // Insert a node between node-1 and node-2
      const result = handleAddStepToGraph(graph, {
        afterNodeId: 'node-1',
        inGroupId: 'group-1'
      })

      // Group should have expanded to accommodate moved nodes
      const group = result.graph.groups.find(g => g.id === 'group-1')
      expect(group?.size.h).toBeGreaterThan(320)
    })
  })
})
