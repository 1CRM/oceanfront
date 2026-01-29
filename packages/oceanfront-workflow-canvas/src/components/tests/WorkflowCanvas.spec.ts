import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkflowCanvas from '../WorkflowCanvas.vue'
import type { WorkflowGraph, WorkflowNode } from '../../types/workflow'
import {
  addEdge,
  updateNodePosition,
  addNodeToGroup,
  removeNodeFromGroup,
  removeNodeFromAllGroups,
  arrangeNodesInGroup,
  reorderNodeInGroup,
  updateGroupPosition,
  findNode,
  getNodeGroup,
  getNodeEdges,
  calculateGroupBounds
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
        from: { nodeId: 'node-1' },
        to: { nodeId: 'node-2' }
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
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 300, h: 400 },
            nodeIds: ['node-1']
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
    it('emits update:selectedId when node is clicked', async () => {
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
        from: { nodeId: 'node-1' },
        to: { nodeId: 'node-2' }
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
          { id: 'edge-1', from: { nodeId: 'node-1' }, to: { nodeId: 'node-2' } },
          { id: 'edge-2', from: { nodeId: 'node-2' }, to: { nodeId: 'node-3' } }
        ],
        groups: []
      }

      const edges = getNodeEdges(graph, 'node-2')
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
        edges: [
          { id: 'edge-1', from: { nodeId: 'node-1' }, to: { nodeId: 'node-2' } }
        ],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-2',
        from: { nodeId: 'node-1' },
        to: { nodeId: 'node-3' }
      })

      expect(result.edges.length).toBe(1)
      expect(result.edges[0].id).toBe('edge-2')
      expect(result.edges[0].from.nodeId).toBe('node-1')
      expect(result.edges[0].to.nodeId).toBe('node-3')
    })

    it('removes existing incoming edge when adding new connection to same target', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 0, y: 0 } },
          { id: 'node-2', kind: 'action', position: { x: 0, y: 100 } },
          { id: 'node-3', kind: 'action', position: { x: 0, y: 200 } }
        ],
        edges: [
          { id: 'edge-1', from: { nodeId: 'node-1' }, to: { nodeId: 'node-3' } }
        ],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-2',
        from: { nodeId: 'node-2' },
        to: { nodeId: 'node-3' }
      })

      expect(result.edges.length).toBe(1)
      expect(result.edges[0].id).toBe('edge-2')
      expect(result.edges[0].from.nodeId).toBe('node-2')
      expect(result.edges[0].to.nodeId).toBe('node-3')
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
          { id: 'edge-1', from: { nodeId: 'node-1' }, to: { nodeId: 'node-2' } },
          { id: 'edge-2', from: { nodeId: 'node-3' }, to: { nodeId: 'node-4' } }
        ],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-3',
        from: { nodeId: 'node-2' },
        to: { nodeId: 'node-3' }
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
        edges: [
          { id: 'edge-1', from: { nodeId: 'node-1' }, to: { nodeId: 'node-2' } }
        ],
        groups: []
      }

      const result = addEdge(graph, {
        id: 'edge-2',
        from: { nodeId: 'node-1' },
        to: { nodeId: 'node-2' }
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
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 300, h: 200 },
            nodeIds: []
          }
        ]
      }

      const updated = addNodeToGroup(graph, 'node-1', 'group-1')
      const group = updated.groups.find(g => g.id === 'group-1')

      expect(group?.nodeIds).toContain('node-1')
    })

    it('removes node from group', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 300, h: 200 },
            nodeIds: ['node-1']
          }
        ]
      }

      const updated = removeNodeFromGroup(graph, 'node-1', 'group-1')
      const group = updated.groups.find(g => g.id === 'group-1')

      expect(group?.nodeIds).not.toContain('node-1')
    })

    it('removes node from all groups', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            title: 'Group 1',
            rect: { x: 50, y: 50, w: 300, h: 200 },
            nodeIds: ['node-1']
          },
          {
            id: 'group-2',
            title: 'Group 2',
            rect: { x: 400, y: 50, w: 300, h: 200 },
            nodeIds: ['node-1']
          }
        ]
      }

      const updated = removeNodeFromAllGroups(graph, 'node-1')

      expect(updated.groups[0].nodeIds).not.toContain('node-1')
      expect(updated.groups[1].nodeIds).not.toContain('node-1')
    })

    it('gets node group', () => {
      const graph: WorkflowGraph = {
        nodes: [{ id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 } }],
        edges: [],
        groups: [
          {
            id: 'group-1',
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 300, h: 200 },
            nodeIds: ['node-1']
          }
        ]
      }

      const group = getNodeGroup(graph, 'node-1')
      expect(group?.id).toBe('group-1')
    })

    it('calculates group bounds', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 100, y: 250 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: []
      }

      const bounds = calculateGroupBounds(graph, ['node-1', 'node-2'], 20)

      expect(bounds.x).toBe(80) // 100 - 20 padding
      expect(bounds.y).toBe(80) // 100 - 20 padding
      expect(bounds.w).toBe(290) // 250 + 40 padding
      expect(bounds.h).toBe(310) // 250 height span + 40 padding
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
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 300, h: 400 },
            nodeIds: ['node-1', 'node-2']
          }
        ]
      }

      const updated = arrangeNodesInGroup(graph, 'group-1')
      const node1 = findNode(updated, 'node-1')
      const node2 = findNode(updated, 'node-2')

      expect(node1?.position.x).toBe(node2?.position.x) // Same x position (vertical column)
      expect(node1?.position.y).toBeLessThan(node2!.position.y) // node-1 above node-2
    })

    it('reorders node in group', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 70, y: 70 } },
          { id: 'node-2', kind: 'action', position: { x: 70, y: 210 } },
          { id: 'node-3', kind: 'action', position: { x: 70, y: 350 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 290, h: 500 },
            nodeIds: ['node-1', 'node-2', 'node-3']
          }
        ]
      }

      const updated = reorderNodeInGroup(graph, 'node-1', 2)
      const group = updated.groups.find(g => g.id === 'group-1')

      expect(group?.nodeIds).toEqual(['node-2', 'node-3', 'node-1'])
    })

    it('updates group position and moves contained nodes', () => {
      const graph: WorkflowGraph = {
        nodes: [
          { id: 'node-1', kind: 'trigger', position: { x: 70, y: 70 } }
        ],
        edges: [],
        groups: [
          {
            id: 'group-1',
            title: 'Test Group',
            rect: { x: 50, y: 50, w: 300, h: 200 },
            nodeIds: ['node-1']
          }
        ]
      }

      const updated = updateGroupPosition(graph, 'group-1', { x: 150, y: 150 })
      const group = updated.groups.find(g => g.id === 'group-1')
      const node = findNode(updated, 'node-1')

      expect(group?.rect.x).toBe(150)
      expect(group?.rect.y).toBe(150)
      expect(node?.position.x).toBe(170) // 70 + 100 delta
      expect(node?.position.y).toBe(170) // 70 + 100 delta
    })
  })
})
