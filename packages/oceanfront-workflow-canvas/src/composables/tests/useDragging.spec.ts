import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDragging, type UseDraggingOptions } from '../useDragging'
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowGroup,
  Position,
  ConnectedEntities
} from '../../types/workflow'
import { isPointInRect } from '../../utils/graph-helpers'

function makeGraph(overrides: Partial<WorkflowGraph> = {}): WorkflowGraph {
  return { nodes: [], edges: [], groups: [], ...overrides }
}

function createMouseEvent(type: string, options: { button?: number; clientX?: number; clientY?: number } = {}): MouseEvent {
  const target = document.createElement('div')
  const event = new MouseEvent(type, {
    button: options.button ?? 0,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    bubbles: true,
    cancelable: true
  })
  Object.defineProperty(event, 'target', { value: target, writable: false })
  return event
}

function createDragging(graph: WorkflowGraph, overrides: Partial<UseDraggingOptions> = {}) {
  const graphRef = ref(graph)
  const onGraphUpdate = vi.fn((g: WorkflowGraph) => { graphRef.value = g })
  const onNodeDragStart = vi.fn()
  const onNodeDragEnd = vi.fn()
  const onGroupDragStart = vi.fn()
  const onGroupDragEnd = vi.fn()
  const onEntityMovedToGroup = vi.fn()

  const canvasEl = document.createElement('div')
  Object.defineProperty(canvasEl, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000, x: 0, y: 0, toJSON: () => ({}) })
  })
  canvasEl.scrollLeft = 0
  canvasEl.scrollTop = 0

  const options: UseDraggingOptions = {
    graph: graphRef,
    maxGroupDepth: ref(null),
    readonly: ref(false),
    canvasRef: ref(canvasEl as HTMLElement),
    nodeTypes: ref({}),
    findDropTargetGroup: () => undefined,
    wouldExceedMaxDepth: () => false,
    onGraphUpdate,
    onNodeDragStart,
    onNodeDragEnd,
    onGroupDragStart,
    onGroupDragEnd,
    onEntityMovedToGroup,
    ...overrides
  }

  const dragging = useDragging(options)
  return { dragging, graphRef, onGraphUpdate, onNodeDragStart, onNodeDragEnd, onGroupDragStart, onGroupDragEnd, onEntityMovedToGroup }
}

describe('useDragging', () => {
  describe('initial state', () => {
    it('starts with no dragging', () => {
      const { dragging } = createDragging(makeGraph())
      expect(dragging.draggingNodeId.value).toBeNull()
      expect(dragging.draggingGroupId.value).toBeNull()
      expect(dragging.invalidDropTarget.value).toBe(false)
    })
  })

  describe('handleNodeMouseDown', () => {
    it('ignores right clicks', () => {
      const graph = makeGraph({
        nodes: [{ id: 'n1', kind: 'action', position: { x: 100, y: 100 } }]
      })
      const { dragging, onNodeDragStart } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 2, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, graph.nodes[0])

      expect(dragging.draggingNodeId.value).toBeNull()
      expect(onNodeDragStart).not.toHaveBeenCalled()
    })

    it('ignores when readonly', () => {
      const graph = makeGraph({
        nodes: [{ id: 'n1', kind: 'action', position: { x: 100, y: 100 } }]
      })
      const { dragging, onNodeDragStart } = createDragging(graph, {
        readonly: ref(true)
      })

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, graph.nodes[0])

      expect(dragging.draggingNodeId.value).toBeNull()
      expect(onNodeDragStart).not.toHaveBeenCalled()
    })

    it('starts dragging on left click', () => {
      const graph = makeGraph({
        nodes: [{ id: 'n1', kind: 'action', position: { x: 100, y: 100 } }]
      })
      const { dragging, onNodeDragStart } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 120 })
      dragging.handleNodeMouseDown(event, graph.nodes[0])

      expect(dragging.draggingNodeId.value).toBe('n1')
      expect(onNodeDragStart).toHaveBeenCalledWith('n1')
    })
  })

  describe('handleGroupMouseDown', () => {
    it('ignores right clicks', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 200 }, containedIds: []
      }
      const graph = makeGraph({ groups: [group] })
      const { dragging, onGroupDragStart } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 2, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, group)

      expect(dragging.draggingGroupId.value).toBeNull()
      expect(onGroupDragStart).not.toHaveBeenCalled()
    })

    it('starts dragging on left click', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 200 }, containedIds: []
      }
      const graph = makeGraph({ groups: [group] })
      const { dragging, onGroupDragStart } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, group)

      expect(dragging.draggingGroupId.value).toBe('g1')
      expect(onGroupDragStart).toHaveBeenCalledWith('g1')
    })

    it('ignores when readonly', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 200 }, containedIds: []
      }
      const graph = makeGraph({ groups: [group] })
      const { dragging, onGroupDragStart } = createDragging(graph, { readonly: ref(true) })

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, group)

      expect(dragging.draggingGroupId.value).toBeNull()
      expect(onGroupDragStart).not.toHaveBeenCalled()
    })
  })

  describe('handleNodeDragMove', () => {
    it('returns false when no node is being dragged', () => {
      const { dragging } = createDragging(makeGraph())
      const result = dragging.handleNodeDragMove(
        { x: 100, y: 100 },
        new Map(),
        () => []
      )
      expect(result).toBe(false)
    })

    it('updates position and returns true when dragging', () => {
      const graph = makeGraph({
        nodes: [{ id: 'n1', kind: 'action', position: { x: 100, y: 100 } }]
      })
      const { dragging, onGraphUpdate } = createDragging(graph)

      // Start drag
      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, graph.nodes[0])

      const result = dragging.handleNodeDragMove(
        { x: 200, y: 200 },
        new Map(),
        () => []
      )

      expect(result).toBe(true)
      expect(onGraphUpdate).toHaveBeenCalled()
    })

    it('sets invalidDropTarget when lockParent violated', () => {
      const parentGroup: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 300 }, containedIds: ['n1']
      }
      const node: WorkflowNode = {
        id: 'n1', kind: 'action', position: { x: 100, y: 100 }, lockParent: true
      }
      const graph = makeGraph({
        nodes: [node],
        groups: [parentGroup]
      })

      const { dragging } = createDragging(graph)

      // Start drag
      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, node)

      // Move outside parent (no target group found)
      dragging.handleNodeDragMove(
        { x: 500, y: 500 },
        new Map(),
        () => []
      )

      expect(dragging.invalidDropTarget.value).toBe(true)
    })
  })

  describe('handleGroupDragMove', () => {
    it('returns false when no group is being dragged', () => {
      const { dragging } = createDragging(makeGraph())
      const result = dragging.handleGroupDragMove(
        { x: 100, y: 100 },
        () => [],
        isPointInRect
      )
      expect(result).toBe(false)
    })

    it('updates position when dragging', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 200 }, containedIds: []
      }
      const graph = makeGraph({ groups: [group] })
      const { dragging, onGraphUpdate } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, group)

      const result = dragging.handleGroupDragMove(
        { x: 200, y: 200 },
        () => [],
        isPointInRect
      )

      expect(result).toBe(true)
      expect(onGraphUpdate).toHaveBeenCalled()
    })
  })

  describe('handleMouseUp - node drag end', () => {
    it('clears dragging state after mouse up', async () => {
      const graph = makeGraph({
        nodes: [{ id: 'n1', kind: 'action', position: { x: 100, y: 100 } }]
      })
      const { dragging, onNodeDragEnd } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, graph.nodes[0])
      expect(dragging.draggingNodeId.value).toBe('n1')

      dragging.handleMouseUp(isPointInRect)

      expect(dragging.draggingNodeId.value).toBeNull()
      expect(onNodeDragEnd).toHaveBeenCalled()
    })

    it('emits entity-moved-to-group when node dropped in group', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 500, h: 500 }, containedIds: []
      }
      const node: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 150, y: 150 } }
      const graph = makeGraph({ nodes: [node], groups: [group] })

      const { dragging, onEntityMovedToGroup } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 160, clientY: 160 })
      dragging.handleNodeMouseDown(event, node)
      dragging.handleMouseUp(isPointInRect)

      expect(onEntityMovedToGroup).toHaveBeenCalledWith('n1', 'g1')
    })

    it('restores position for lockParent node dragged outside parent', () => {
      const parentGroup: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 300 }, containedIds: ['n1']
      }
      const node: WorkflowNode = {
        id: 'n1', kind: 'action', position: { x: 100, y: 100 }, lockParent: true
      }
      const graph = makeGraph({ nodes: [node], groups: [parentGroup] })

      const { dragging, onGraphUpdate, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, node)

      // Simulate moving node outside group
      dragging.handleNodeDragMove(
        { x: 600, y: 600 },
        new Map(),
        () => []
      )

      dragging.handleMouseUp(isPointInRect)

      // Node should be back at original position
      const updatedNode = graphRef.value.nodes.find(n => n.id === 'n1')
      expect(updatedNode?.position).toEqual({ x: 100, y: 100 })
    })
  })

  describe('handleMouseUp - group drag end', () => {
    it('clears dragging state after group mouse up', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 200 }, containedIds: []
      }
      const graph = makeGraph({ groups: [group] })
      const { dragging, onGroupDragEnd } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, group)
      expect(dragging.draggingGroupId.value).toBe('g1')

      dragging.handleMouseUp(isPointInRect)

      expect(dragging.draggingGroupId.value).toBeNull()
      expect(onGroupDragEnd).toHaveBeenCalled()
    })

    it('restores position for lockParent group dragged outside parent', () => {
      const parent: WorkflowGroup = {
        id: 'g-parent', kind: 'group', position: { x: 0, y: 0 },
        size: { w: 600, h: 600 }, containedIds: ['g-child']
      }
      const child: WorkflowGroup = {
        id: 'g-child', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 200, h: 200 }, containedIds: [], lockParent: true
      }
      const graph = makeGraph({ groups: [parent, child] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, child)

      // Move outside parent
      dragging.handleGroupDragMove(
        { x: 800, y: 800 },
        () => [],
        isPointInRect
      )

      dragging.handleMouseUp(isPointInRect)

      const updatedChild = graphRef.value.groups.find(g => g.id === 'g-child')
      expect(updatedChild?.position).toEqual({ x: 50, y: 50 })
    })
  })

  describe('node hover state', () => {
    it('tracks hoveredNodeGroupId on node mouse enter/leave', () => {
      const group: WorkflowGroup = {
        id: 'g1', kind: 'group', position: { x: 50, y: 50 },
        size: { w: 300, h: 300 }, containedIds: ['n1']
      }
      const node: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 100, y: 100 } }
      const graph = makeGraph({ nodes: [node], groups: [group] })

      const { dragging } = createDragging(graph)

      dragging.handleNodeMouseEnter(node)
      expect(dragging.hoveredNodeGroupId.value).toBe('g1')

      dragging.handleNodeMouseLeave()
      expect(dragging.hoveredNodeGroupId.value).toBeNull()
    })
  })
})
