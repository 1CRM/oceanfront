import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCanvas } from '../useCanvas'
import type { WorkflowGraph } from '../../types/workflow'

describe('useCanvas', () => {
  describe('containerStyle', () => {
    it('calculates container size based on nodes', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [
          { id: 'node-1', kind: 'action', position: { x: 100, y: 100 }, size: { w: 250, h: 100 } },
          { id: 'node-2', kind: 'action', position: { x: 500, y: 300 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const style = canvas.containerStyle.value
      // Should be at least 500 + 250 + 100 = 850px wide
      expect(parseInt(style.width)).toBeGreaterThanOrEqual(850)
      // Should be at least 300 + 100 + 100 = 500px tall
      expect(parseInt(style.height)).toBeGreaterThanOrEqual(500)
    })

    it('calculates container size based on groups', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Group',
            position: { x: 200, y: 200 },
            size: { w: 400, h: 300 },
            containedIds: []
          }
        ]
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const style = canvas.containerStyle.value
      // Should be at least 200 + 400 + 100 = 700px wide
      expect(parseInt(style.width)).toBeGreaterThanOrEqual(700)
      // Should be at least 200 + 300 + 100 = 600px tall
      expect(parseInt(style.height)).toBeGreaterThanOrEqual(600)
    })

    it('uses minimum width and height when content is small', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [{ id: 'node-1', kind: 'action', position: { x: 10, y: 10 } }],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const style = canvas.containerStyle.value
      expect(parseInt(style.width)).toBeGreaterThanOrEqual(1000)
      expect(parseInt(style.height)).toBeGreaterThanOrEqual(600)
    })
  })

  describe('svgViewBox', () => {
    it('creates viewBox matching container size', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [{ id: 'node-1', kind: 'action', position: { x: 100, y: 100 } }],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const viewBox = canvas.svgViewBox.value
      expect(viewBox).toMatch(/^0 0 \d+ \d+$/)
    })
  })

  describe('sortedGroups', () => {
    it('sorts groups by depth', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'parent',
            kind: 'group',
            label: 'Parent',
            position: { x: 0, y: 0 },
            size: { w: 500, h: 500 },
            containedIds: ['child']
          },
          {
            id: 'child',
            kind: 'group',
            label: 'Child',
            position: { x: 50, y: 50 },
            size: { w: 200, h: 200 },
            containedIds: []
          }
        ]
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const sorted = canvas.sortedGroups.value
      expect(sorted[0].id).toBe('parent')
      expect(sorted[1].id).toBe('child')
    })
  })

  describe('getNodeDimensions', () => {
    it('returns node size from node.size property', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [
          { id: 'node-1', kind: 'action', position: { x: 0, y: 0 }, size: { w: 300, h: 150 } }
        ],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const node = graph.value.nodes[0]
      const dimensions = canvas.getNodeDimensions(node)
      expect(dimensions.width).toBe(300)
      expect(dimensions.height).toBe(150)
    })

    it('returns default size when node.size is not set', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [{ id: 'node-1', kind: 'action', position: { x: 0, y: 0 } }],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const node = graph.value.nodes[0]
      const dimensions = canvas.getNodeDimensions(node)
      expect(dimensions.width).toBe(250)
      expect(dimensions.height).toBe(100)
    })
  })

  describe('getNodeCenter', () => {
    it('calculates center position of node', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [
          { id: 'node-1', kind: 'action', position: { x: 100, y: 200 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const node = graph.value.nodes[0]
      const center = canvas.getNodeCenter(node)
      expect(center.x).toBe(225) // 100 + 250/2
      expect(center.y).toBe(250) // 200 + 100/2
    })
  })

  describe('getEntityCenter', () => {
    it('calculates center for node', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [
          { id: 'node-1', kind: 'action', position: { x: 100, y: 200 }, size: { w: 250, h: 100 } }
        ],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const node = graph.value.nodes[0]
      const center = canvas.getEntityCenter(node)
      expect(center.x).toBe(225)
      expect(center.y).toBe(250)
    })

    it('calculates center for group', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'group-1',
            kind: 'group',
            label: 'Group',
            position: { x: 100, y: 200 },
            size: { w: 400, h: 300 },
            containedIds: []
          }
        ]
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const group = graph.value.groups[0]
      const center = canvas.getEntityCenter(group)
      expect(center.x).toBe(300) // 100 + 400/2
      expect(center.y).toBe(350) // 200 + 300/2
    })
  })

  describe('getNodeStyle', () => {
    it('returns positioning styles for node', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [
          { id: 'node-1', kind: 'action', position: { x: 100, y: 200 }, size: { w: 300, h: 150 } }
        ],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const node = graph.value.nodes[0]
      const style = canvas.getNodeStyle(node)
      expect(style.left).toBe('100px')
      expect(style.top).toBe('200px')
      expect(style.width).toBe('300px')
      expect(style.height).toBe('150px')
    })

    it('uses default width when not specified', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [{ id: 'node-1', kind: 'action', position: { x: 100, y: 200 } }],
        edges: [],
        groups: []
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const node = graph.value.nodes[0]
      const style = canvas.getNodeStyle(node)
      expect(style.width).toBe('250px')
      expect(style.height).toBe('auto')
    })
  })

  describe('getGroupStyle', () => {
    it('returns positioning styles for group with z-index', () => {
      const graph = ref<WorkflowGraph>({
        nodes: [],
        edges: [],
        groups: [
          {
            id: 'parent',
            kind: 'group',
            label: 'Parent',
            position: { x: 50, y: 100 },
            size: { w: 400, h: 300 },
            containedIds: ['child']
          },
          {
            id: 'child',
            kind: 'group',
            label: 'Child',
            position: { x: 100, y: 150 },
            size: { w: 200, h: 150 },
            containedIds: []
          }
        ]
      })

      const canvas = useCanvas({
        graph,
        width: ref(1000),
        height: ref(600),
        nodeElements: ref(new Map())
      })

      const childGroup = graph.value.groups[1]
      const style = canvas.getGroupStyle(childGroup)
      expect(style.left).toBe('100px')
      expect(style.top).toBe('150px')
      expect(style.width).toBe('200px')
      expect(style.height).toBe('150px')
      expect(style.zIndex).toBe(1) // Child is at depth 1
    })
  })
})
