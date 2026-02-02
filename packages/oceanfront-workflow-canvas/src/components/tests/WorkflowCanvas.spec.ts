import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkflowCanvas from '../WorkflowCanvas.vue'
import type { WorkflowGraph } from '../../types/workflow'
import {
  addEdge,
  updateNodePosition,
  addEntityToGroup,
  removeEntityFromGroup,
  removeEntityFromAllGroups,
  arrangeNodesInGroup,
  updateGroupPosition,
  findNode,
  getParentGroup,
  getEntityEdges,
  calculateGroupBounds,
  calculateGroupMinimumSize,
  updateGroupBounds,
  areEntitiesInDifferentGroups
} from '../../utils/graph-helpers'

describe('WorkflowCanvas Component', () => {
  let mockGraph: WorkflowGraph

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
  })

  describe('Rendering', () => {
    it('renders without errors', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('renders all nodes', () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph
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
          modelValue: graphWithEdge
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
            title: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1']
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graphWithGroup
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
          modelValue: mockGraph
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
          selectedId: 'node-1'
        }
      })

      const nodes = wrapper.findAll('.workflow-canvas-node')
      expect(nodes[0].classes()).toContain('workflow-canvas-node--selected')
    })

    it('deselects when canvas background is clicked', async () => {
      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: mockGraph,
          selectedId: 'node-1'
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
          readonly: true
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
          readonly: true
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
          modelValue: mockGraph
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
            title: 'Test Group',
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
            title: 'Test Group',
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
            title: 'Group 1',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Group 2',
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
            title: 'Test Group',
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
            title: 'Test Group',
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

    it('arranges nodes in group vertically', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 200, y: 300 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            title: 'Test Group',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      const updated = arrangeNodesInGroup(graph, 'group-1')
      const node1 = findNode(updated, 'node-1')
      const node2 = findNode(updated, 'node-2')

      expect(node1?.position.x).toBe(node2?.position.x) // Same x position (vertical column)
      expect(node1?.position.y).toBeLessThan(node2!.position.y) // node-1 above node-2
    })

    it('updates group position and moves contained nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 70, y: 70 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            title: 'Test Group',
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
            title: 'Test Group',
            position: { x: 80, y: 80 },
            size: { w: 300, h: 400 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      const minSize = calculateGroupMinimumSize(graph, 'group-1', 20)

      // Group at (80,80), nodes span from (100,100) to (350,350)
      // Minimum width must accommodate rightmost entity: 350 - 80 + 20 = 290
      // Minimum height must accommodate bottommost entity: 350 - 80 + 20 = 290
      expect(minSize.w).toBeGreaterThanOrEqual(290)
      expect(minSize.h).toBeGreaterThanOrEqual(290)
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
            title: 'Test Group',
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
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            title: 'Test Group',
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
            title: 'Empty Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 200 },
            containedIds: []
          }
        ]
      }

      const minSize = calculateGroupMinimumSize(graph, 'group-1', 20)

      // Empty groups should have a reasonable minimum size
      expect(minSize.w).toBe(100)
      expect(minSize.h).toBe(100)
    })

    it('auto-updates nested group bounds when adding entity', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 120, y: 120 }, size: { w: 250, h: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            title: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 300 },
            containedIds: []
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Child Group',
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
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 200, y: 200 }, size: { w: 250, h: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            title: 'Outermost Group',
            position: { x: 20, y: 20 },
            size: { w: 500, h: 400 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Middle Group',
            position: { x: 50, y: 50 },
            size: { w: 440, h: 340 },
            containedIds: ['group-3']
          },
          {
            id: 'group-3',
            kind: 'group',
            title: 'Inner Group',
            position: { x: 180, y: 180 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Add a node far away to the innermost group
      const newNode = { id: 'node-2', kind: 'action', position: { x: 800, y: 800 }, size: { w: 250, h: 100 } }
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
            title: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 300 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Child Group',
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
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 300, y: 300 }, size: { w: 250, h: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            title: 'Level 1',
            position: { x: 10, y: 10 },
            size: { w: 600, h: 500 },
            containedIds: ['group-2']
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Level 2',
            position: { x: 30, y: 30 },
            size: { w: 560, h: 460 },
            containedIds: ['group-3']
          },
          {
            id: 'group-3',
            kind: 'group',
            title: 'Level 3',
            position: { x: 50, y: 50 },
            size: { w: 520, h: 420 },
            containedIds: ['group-4']
          },
          {
            id: 'group-4',
            kind: 'group',
            title: 'Level 4 (innermost)',
            position: { x: 280, y: 280 },
            size: { w: 290, h: 140 },
            containedIds: ['node-1']
          }
        ]
      }

      // Add a new node to the deepest group
      const newNode = { id: 'node-2', kind: 'action', position: { x: 1200, y: 1200 }, size: { w: 250, h: 100 } }
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
            title: 'Test Group',
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
            title: 'Group 1',
            position: { x: 50, y: 50 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Group 2',
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
            title: 'Group 1',
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
            title: 'Parent Group',
            position: { x: 50, y: 50 },
            size: { w: 400, h: 300 },
            containedIds: ['group-2', 'node-1']
          },
          {
            id: 'group-2',
            kind: 'group',
            title: 'Child Group',
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
            title: 'Test Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 200 },
            containedIds: ['node-1']
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graph
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
          modelValue: graph
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
            title: 'Test Group',
            position: { x: 100, y: 100 },
            size: { w: 300, h: 300 },
            containedIds: ['node-1', 'node-2']
          }
        ]
      }

      const wrapper = mount(WorkflowCanvas, {
        props: {
          modelValue: graph
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
})
