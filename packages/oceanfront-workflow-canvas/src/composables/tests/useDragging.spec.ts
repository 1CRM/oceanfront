import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useDragging, type UseDraggingOptions } from '../useDragging'
import type { WorkflowGraph, WorkflowNode, WorkflowGroup } from '../../types/workflow'
import { isPointInRect } from '../../utils/graph-helpers'

function makeGraph(overrides: Partial<WorkflowGraph> = {}): WorkflowGraph {
  return { nodes: [], edges: [], groups: [], ...overrides }
}

function createMouseEvent(
  type: string,
  options: { button?: number; clientX?: number; clientY?: number } = {}
): MouseEvent {
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
  const onGraphUpdate = vi.fn((g: WorkflowGraph) => {
    graphRef.value = g
  })
  const onNodeDragStart = vi.fn()
  const onNodeDragEnd = vi.fn()
  const onGroupDragStart = vi.fn()
  const onGroupDragEnd = vi.fn()
  const onEntityMovedToGroup = vi.fn()
  const onNodeParentGroupChange = vi.fn()
  const onNodeSwap = vi.fn()
  const onEdgeAdd = vi.fn()

  const canvasEl = document.createElement('div')
  Object.defineProperty(canvasEl, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
  })
  canvasEl.scrollLeft = 0
  canvasEl.scrollTop = 0

  const options: UseDraggingOptions = {
    graph: graphRef,
    maxGroupDepth: ref(null),
    readonly: ref(false),
    edgesLocked: ref(false),
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
    onNodeParentGroupChange,
    onNodeSwap,
    onEdgeAdd,
    ...overrides
  }

  const dragging = useDragging(options)
  return {
    dragging,
    graphRef,
    onGraphUpdate,
    onNodeDragStart,
    onNodeDragEnd,
    onGroupDragStart,
    onGroupDragEnd,
    onEntityMovedToGroup,
    onNodeParentGroupChange,
    onNodeSwap,
    onEdgeAdd
  }
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
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 200 },
        containedIds: []
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
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 200 },
        containedIds: []
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
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 200 },
        containedIds: []
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
      const result = dragging.handleNodeDragMove({ x: 100, y: 100 }, new Map(), () => [])
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

      const result = dragging.handleNodeDragMove({ x: 200, y: 200 }, new Map(), () => [])

      expect(result).toBe(true)
      expect(onGraphUpdate).toHaveBeenCalled()
    })

    it('sets invalidDropTarget when lockParent violated', () => {
      const parentGroup: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const node: WorkflowNode = {
        id: 'n1',
        kind: 'action',
        position: { x: 100, y: 100 },
        lockParent: true
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
      dragging.handleNodeDragMove({ x: 500, y: 500 }, new Map(), () => [])

      expect(dragging.invalidDropTarget.value).toBe(true)
    })

    it('sets invalidDropTarget when requireGroup node dragged outside all groups', () => {
      const parentGroup: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const node: WorkflowNode = {
        id: 'n1',
        kind: 'action',
        position: { x: 100, y: 100 },
        requireGroup: true
      }
      const graph = makeGraph({
        nodes: [node],
        groups: [parentGroup]
      })

      const { dragging } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, node)

      // Move outside all groups (no target group found)
      dragging.handleNodeDragMove({ x: 500, y: 500 }, new Map(), () => [])

      expect(dragging.invalidDropTarget.value).toBe(true)
    })

    it('allows requireGroup node to move to a different group', () => {
      const groupA: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const groupB: WorkflowGroup = {
        id: 'g2',
        kind: 'group',
        position: { x: 350, y: 0 },
        size: { w: 300, h: 300 },
        containedIds: []
      }
      const node: WorkflowNode = {
        id: 'n1',
        kind: 'action',
        position: { x: 50, y: 50 },
        requireGroup: true
      }
      const graph = makeGraph({
        nodes: [node],
        groups: [groupA, groupB]
      })

      const { dragging } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleNodeMouseDown(event, node)

      // Move to groupB (target group found)
      dragging.handleNodeDragMove({ x: 450, y: 100 }, new Map(), () => [groupB])

      expect(dragging.invalidDropTarget.value).toBe(false)
    })
  })

  describe('handleGroupDragMove', () => {
    it('returns false when no group is being dragged', () => {
      const { dragging } = createDragging(makeGraph())
      const result = dragging.handleGroupDragMove({ x: 100, y: 100 }, () => [], isPointInRect)
      expect(result).toBe(false)
    })

    it('updates position when dragging', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 200 },
        containedIds: []
      }
      const graph = makeGraph({ groups: [group] })
      const { dragging, onGraphUpdate } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, group)

      const result = dragging.handleGroupDragMove({ x: 200, y: 200 }, () => [], isPointInRect)

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
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 500, h: 500 },
        containedIds: []
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
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const node: WorkflowNode = {
        id: 'n1',
        kind: 'action',
        position: { x: 100, y: 100 },
        lockParent: true
      }
      const graph = makeGraph({ nodes: [node], groups: [parentGroup] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, node)

      // Simulate moving node outside group
      dragging.handleNodeDragMove({ x: 600, y: 600 }, new Map(), () => [])

      dragging.handleMouseUp(isPointInRect)

      // Node should be back at original position
      const updatedNode = graphRef.value.nodes.find(n => n.id === 'n1')
      expect(updatedNode?.position).toEqual({ x: 100, y: 100 })
    })

    it('restores position for requireGroup node dragged outside all groups', () => {
      const parentGroup: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const node: WorkflowNode = {
        id: 'n1',
        kind: 'action',
        position: { x: 100, y: 100 },
        requireGroup: true
      }
      const graph = makeGraph({ nodes: [node], groups: [parentGroup] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 110, clientY: 110 })
      dragging.handleNodeMouseDown(event, node)

      dragging.handleNodeDragMove({ x: 600, y: 600 }, new Map(), () => [])
      dragging.handleMouseUp(isPointInRect)

      const updatedNode = graphRef.value.nodes.find(n => n.id === 'n1')
      expect(updatedNode?.position).toEqual({ x: 100, y: 100 })
    })

    it('allows requireGroup node to be dropped in a different group', () => {
      const groupA: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const groupB: WorkflowGroup = {
        id: 'g2',
        kind: 'group',
        position: { x: 350, y: 0 },
        size: { w: 300, h: 300 },
        containedIds: []
      }
      const node: WorkflowNode = {
        id: 'n1',
        kind: 'action',
        position: { x: 50, y: 50 },
        requireGroup: true
      }
      const graph = makeGraph({
        nodes: [node],
        groups: [groupA, groupB]
      })

      const { dragging, onEntityMovedToGroup } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleNodeMouseDown(event, node)

      // Move node so its center falls inside groupB
      dragging.handleNodeDragMove({ x: 360, y: 50 }, new Map(), () => [])
      dragging.handleMouseUp(isPointInRect)

      expect(onEntityMovedToGroup).toHaveBeenCalledWith('n1', 'g2')
    })

    it('calls onNodeParentGroupChange when node parent group changes', () => {
      const groupA: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
      }
      const groupB: WorkflowGroup = {
        id: 'g2',
        kind: 'group',
        position: { x: 350, y: 0 },
        size: { w: 300, h: 300 },
        containedIds: []
      }
      const node: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 50, y: 50 } }
      const graph = makeGraph({ nodes: [node], groups: [groupA, groupB] })

      const { dragging, onNodeParentGroupChange } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleNodeMouseDown(event, node)

      // Move node so its center falls inside groupB
      dragging.handleNodeDragMove({ x: 360, y: 50 }, new Map(), () => [])
      dragging.handleMouseUp(isPointInRect)

      expect(onNodeParentGroupChange).toHaveBeenCalledTimes(1)
      const [updatedNode, parentGroup] = onNodeParentGroupChange.mock.calls[0]
      expect(updatedNode.id).toBe('n1')
      expect(parentGroup?.id).toBe('g2')
    })

    it('connects moved node to last node in target group', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 600, h: 600 },
        containedIds: ['n2']
      }
      const movedNode: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const existingNode: WorkflowNode = { id: 'n2', kind: 'action', position: { x: 120, y: 120 } }
      const graph = makeGraph({ nodes: [movedNode, existingNode], groups: [group], edges: [] })

      const { dragging, graphRef, onEdgeAdd } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, movedNode)
      dragging.handleNodeDragMove({ x: 220, y: 220 }, new Map(), () => [group])
      dragging.handleMouseUp(isPointInRect)

      expect(graphRef.value.edges).toHaveLength(1)
      expect(graphRef.value.edges[0].from.entityId).toBe('n2')
      expect(graphRef.value.edges[0].to.entityId).toBe('n1')

      expect(onEdgeAdd).toHaveBeenCalledTimes(1)
      const [addedGraph, addedEdge] = onEdgeAdd.mock.calls[0]
      expect(addedEdge.from.entityId).toBe('n2')
      expect(addedEdge.to.entityId).toBe('n1')
      expect(addedGraph.edges).toContainEqual(addedEdge)
    })

    it('aligns node within group when dropped into it', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 600, h: 600 },
        containedIds: ['n2']
      }
      const movedNode: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const existingNode: WorkflowNode = { id: 'n2', kind: 'action', position: { x: 120, y: 120 } }
      const graph = makeGraph({ nodes: [movedNode, existingNode], groups: [group], edges: [] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, movedNode)
      dragging.handleNodeDragMove({ x: 300, y: 300 }, new Map(), () => [group])
      dragging.handleMouseUp(isPointInRect)

      const alignedNode = graphRef.value.nodes.find(n => n.id === 'n1')!
      // Should be aligned: x = 120 (same as n2), y = 120 + 100 + 20 = 240
      expect(alignedNode.position.x).toBe(120)
      expect(alignedNode.position.y).toBe(240)
    })

    it('keeps node at drop position when dropped into empty group', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 100, y: 100 },
        size: { w: 400, h: 300 },
        containedIds: []
      }
      const movedNode: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const graph = makeGraph({ nodes: [movedNode], groups: [group], edges: [] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, movedNode)
      dragging.handleNodeDragMove({ x: 200, y: 200 }, new Map(), () => [group])
      dragging.handleMouseUp(isPointInRect)

      const alignedNode = graphRef.value.nodes.find(n => n.id === 'n1')!
      // No siblings to align with — node stays at drop position
      expect(alignedNode.position.x).toBe(200)
      expect(alignedNode.position.y).toBe(200)
    })

    it('adjusts group size after node alignment', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 600, h: 600 },
        containedIds: ['n2']
      }
      const movedNode: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const existingNode: WorkflowNode = { id: 'n2', kind: 'action', position: { x: 70, y: 70 } }
      const graph = makeGraph({ nodes: [movedNode, existingNode], groups: [group], edges: [] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, movedNode)
      dragging.handleNodeDragMove({ x: 200, y: 200 }, new Map(), () => [group])
      dragging.handleMouseUp(isPointInRect)

      const updatedGroup = graphRef.value.groups.find(g => g.id === 'g1')!
      // n2 at (70, 70), n1 aligned at (70, 190)
      // Group bounds should tightly wrap both nodes with padding
      // h = (190 + 100 + 20) - (70 - 20) = 310 - 50 = 260
      expect(updatedGroup.size.h).toBe(260)
    })

    it('bridges predecessor to successor when node is moved to a different group', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 400, y: 0 },
        size: { w: 600, h: 600 },
        containedIds: []
      }
      const nodeA: WorkflowNode = { id: 'a', kind: 'action', position: { x: 0, y: 0 } }
      const nodeX: WorkflowNode = { id: 'x', kind: 'action', position: { x: 0, y: 150 } }
      const nodeB: WorkflowNode = { id: 'b', kind: 'action', position: { x: 0, y: 300 } }
      const graph = makeGraph({
        nodes: [nodeA, nodeX, nodeB],
        groups: [group],
        edges: [
          { id: 'e1', from: { entityId: 'a' }, to: { entityId: 'x' } },
          { id: 'e2', from: { entityId: 'x' }, to: { entityId: 'b' } }
        ]
      })

      const { dragging, graphRef, onEdgeAdd } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 160 })
      dragging.handleNodeMouseDown(event, nodeX)
      dragging.handleNodeDragMove({ x: 500, y: 200 }, new Map(), () => [group])
      dragging.handleMouseUp(isPointInRect)

      const bridgeEdge = graphRef.value.edges.find(
        (e: any) => e.from.entityId === 'a' && e.to.entityId === 'b'
      )
      expect(bridgeEdge).toBeDefined()

      expect(onEdgeAdd).toHaveBeenCalled()
      const bridgeCall = onEdgeAdd.mock.calls.find(
        ([_g, e]: any) => e.from.entityId === 'a' && e.to.entityId === 'b'
      )
      expect(bridgeCall).toBeDefined()
    })

    it('bridges predecessor to successor when node is moved out of group to canvas root', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 400, h: 600 },
        containedIds: ['a', 'x', 'b']
      }
      const nodeA: WorkflowNode = { id: 'a', kind: 'action', position: { x: 50, y: 50 } }
      const nodeX: WorkflowNode = { id: 'x', kind: 'action', position: { x: 50, y: 200 } }
      const nodeB: WorkflowNode = { id: 'b', kind: 'action', position: { x: 50, y: 350 } }
      const graph = makeGraph({
        nodes: [nodeA, nodeX, nodeB],
        groups: [group],
        edges: [
          { id: 'e1', from: { entityId: 'a' }, to: { entityId: 'x' } },
          { id: 'e2', from: { entityId: 'x' }, to: { entityId: 'b' } }
        ]
      })

      const { dragging, graphRef, onEdgeAdd } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 210 })
      dragging.handleNodeMouseDown(event, nodeX)
      dragging.handleNodeDragMove({ x: 800, y: 200 }, new Map(), () => [])
      dragging.handleMouseUp(isPointInRect)

      const bridgeEdge = graphRef.value.edges.find(
        (e: any) => e.from.entityId === 'a' && e.to.entityId === 'b'
      )
      expect(bridgeEdge).toBeDefined()

      const bridgeCall = onEdgeAdd.mock.calls.find(
        ([_g, e]: any) => e.from.entityId === 'a' && e.to.entityId === 'b'
      )
      expect(bridgeCall).toBeDefined()
    })
  })

  describe('handleMouseUp - group drag end', () => {
    it('clears dragging state after group mouse up', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 200 },
        containedIds: []
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
        id: 'g-parent',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 600, h: 600 },
        containedIds: ['g-child']
      }
      const child: WorkflowGroup = {
        id: 'g-child',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 200, h: 200 },
        containedIds: [],
        lockParent: true
      }
      const graph = makeGraph({ groups: [parent, child] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, child)

      // Move outside parent
      dragging.handleGroupDragMove({ x: 800, y: 800 }, () => [], isPointInRect)

      dragging.handleMouseUp(isPointInRect)

      const updatedChild = graphRef.value.groups.find(g => g.id === 'g-child')
      expect(updatedChild?.position).toEqual({ x: 50, y: 50 })
    })

    it('restores position for requireGroup group dragged outside parent', () => {
      const parent: WorkflowGroup = {
        id: 'g-parent',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 600, h: 600 },
        containedIds: ['g-child']
      }
      const child: WorkflowGroup = {
        id: 'g-child',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 200, h: 200 },
        containedIds: [],
        requireGroup: true
      }
      const graph = makeGraph({ groups: [parent, child] })

      const { dragging, graphRef } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 60, clientY: 60 })
      dragging.handleGroupMouseDown(event, child)

      // Move outside parent
      dragging.handleGroupDragMove({ x: 800, y: 800 }, () => [], isPointInRect)

      dragging.handleMouseUp(isPointInRect)

      const updatedChild = graphRef.value.groups.find(g => g.id === 'g-child')
      expect(updatedChild?.position).toEqual({ x: 50, y: 50 })
    })

    it('bridges predecessor to successor when group is moved out of parent', () => {
      const parent: WorkflowGroup = {
        id: 'g-parent',
        kind: 'group',
        position: { x: 0, y: 0 },
        size: { w: 600, h: 600 },
        containedIds: ['g-child']
      }
      const child: WorkflowGroup = {
        id: 'g-child',
        kind: 'group',
        position: { x: 50, y: 200 },
        size: { w: 200, h: 200 },
        containedIds: []
      }
      const nodeA: WorkflowNode = { id: 'a', kind: 'action', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'b', kind: 'action', position: { x: 0, y: 500 } }
      const graph = makeGraph({
        nodes: [nodeA, nodeB],
        groups: [parent, child],
        edges: [
          { id: 'e1', from: { entityId: 'a' }, to: { entityId: 'g-child' } },
          { id: 'e2', from: { entityId: 'g-child' }, to: { entityId: 'b' } }
        ]
      })

      const { dragging, graphRef, onEdgeAdd } = createDragging(graph)

      const event = createMouseEvent('mousedown', { button: 0, clientX: 100, clientY: 250 })
      dragging.handleGroupMouseDown(event, child)
      dragging.handleGroupDragMove({ x: 800, y: 800 }, () => [], isPointInRect)
      dragging.handleMouseUp(isPointInRect)

      const bridgeEdge = graphRef.value.edges.find(
        (e: any) => e.from.entityId === 'a' && e.to.entityId === 'b'
      )
      expect(bridgeEdge).toBeDefined()

      const bridgeCall = onEdgeAdd.mock.calls.find(
        ([_g, e]: any) => e.from.entityId === 'a' && e.to.entityId === 'b'
      )
      expect(bridgeCall).toBeDefined()
    })
  })

  describe('node hover state', () => {
    it('tracks hoveredNodeGroupId on node mouse enter/leave', () => {
      const group: WorkflowGroup = {
        id: 'g1',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 300, h: 300 },
        containedIds: ['n1']
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

  describe('node swap', () => {
    function makeNodeElements(
      nodes: WorkflowNode[],
      dimensions: { width: number; height: number } = { width: 250, height: 100 }
    ): Map<string, HTMLElement> {
      const map = new Map<string, HTMLElement>()
      for (const node of nodes) {
        const el = document.createElement('div')
        Object.defineProperty(el, 'getBoundingClientRect', {
          value: () => ({
            x: node.position.x,
            y: node.position.y,
            width: dimensions.width,
            height: dimensions.height,
            left: node.position.x,
            top: node.position.y,
            right: node.position.x + dimensions.width,
            bottom: node.position.y + dimensions.height,
            toJSON: () => ({})
          })
        })
        map.set(node.id, el)
      }
      return map
    }

    it('sets swapTargetNodeId when dragged node center is over same-kind node', () => {
      const nodeA: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'n2', kind: 'action', position: { x: 0, y: 200 } }
      const graph = makeGraph({ nodes: [nodeA, nodeB] })

      const { dragging } = createDragging(graph)
      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, nodeA)

      const nodeElements = makeNodeElements([nodeA, nodeB])
      // Move n1's center into n2's bounding box
      dragging.handleNodeDragMove({ x: 50, y: 220 }, nodeElements, () => [])

      expect(dragging.swapTargetNodeId.value).toBe('n2')
    })

    it('sets invalidSwapTargetNodeId for different kinds', () => {
      const nodeA: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'n2', kind: 'trigger', position: { x: 0, y: 200 } }
      const graph = makeGraph({ nodes: [nodeA, nodeB] })

      const { dragging } = createDragging(graph)
      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, nodeA)

      const nodeElements = makeNodeElements([nodeA, nodeB])
      dragging.handleNodeDragMove({ x: 50, y: 220 }, nodeElements, () => [])

      expect(dragging.swapTargetNodeId.value).toBeNull()
      expect(dragging.invalidSwapTargetNodeId.value).toBe('n2')
    })

    it('sets invalidSwapTargetNodeId when kind is empty string', () => {
      const nodeA: WorkflowNode = { id: 'n1', kind: '', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'n2', kind: '', position: { x: 0, y: 200 } }
      const graph = makeGraph({ nodes: [nodeA, nodeB] })

      const { dragging } = createDragging(graph)
      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, nodeA)

      const nodeElements = makeNodeElements([nodeA, nodeB])
      dragging.handleNodeDragMove({ x: 50, y: 220 }, nodeElements, () => [])

      expect(dragging.swapTargetNodeId.value).toBeNull()
      expect(dragging.invalidSwapTargetNodeId.value).toBe('n2')
    })

    it('clears invalidSwapTargetNodeId when not over any node', () => {
      const nodeA: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'n2', kind: 'trigger', position: { x: 0, y: 200 } }
      const graph = makeGraph({ nodes: [nodeA, nodeB] })

      const { dragging } = createDragging(graph)
      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, nodeA)

      const nodeElements = makeNodeElements([nodeA, nodeB])

      // Move over nodeB (different kind)
      dragging.handleNodeDragMove({ x: 50, y: 220 }, nodeElements, () => [])
      expect(dragging.invalidSwapTargetNodeId.value).toBe('n2')

      // Move away from nodeB
      dragging.handleNodeDragMove({ x: 50, y: 500 }, nodeElements, () => [])
      expect(dragging.invalidSwapTargetNodeId.value).toBeNull()
      expect(dragging.swapTargetNodeId.value).toBeNull()
    })

    it('performs full swap on mouse up: positions, edges, and groups', () => {
      const nodeA: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'n2', kind: 'action', position: { x: 0, y: 200 } }
      const graph = makeGraph({
        nodes: [nodeA, nodeB],
        edges: [{ id: 'e1', from: { entityId: 'n1' }, to: { entityId: 'n2' } }]
      })

      const { dragging, graphRef, onNodeSwap } = createDragging(graph)
      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, nodeA)

      const nodeElements = makeNodeElements([nodeA, nodeB])
      dragging.handleNodeDragMove({ x: 50, y: 220 }, nodeElements, () => [])
      expect(dragging.swapTargetNodeId.value).toBe('n2')

      dragging.handleMouseUp(isPointInRect)

      expect(onNodeSwap).toHaveBeenCalledWith('n1', 'n2')
      expect(dragging.draggingNodeId.value).toBeNull()
      expect(dragging.swapTargetNodeId.value).toBeNull()

      // Dragged node is restored to original pos before swap, so they exchange original positions
      const updatedA = graphRef.value.nodes.find(n => n.id === 'n1')
      const updatedB = graphRef.value.nodes.find(n => n.id === 'n2')
      expect(updatedA?.position).toEqual({ x: 0, y: 200 })
      expect(updatedB?.position).toEqual({ x: 0, y: 0 })

      // Edge connections are swapped
      const edge = graphRef.value.edges.find(e => e.id === 'e1')
      expect(edge?.from.entityId).toBe('n2')
      expect(edge?.to.entityId).toBe('n1')
    })

    it('does not swap on mouse up when kinds differ', () => {
      const nodeA: WorkflowNode = { id: 'n1', kind: 'action', position: { x: 0, y: 0 } }
      const nodeB: WorkflowNode = { id: 'n2', kind: 'trigger', position: { x: 0, y: 200 } }
      const graph = makeGraph({ nodes: [nodeA, nodeB] })

      const { dragging, onNodeSwap } = createDragging(graph)
      const event = createMouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10 })
      dragging.handleNodeMouseDown(event, nodeA)

      const nodeElements = makeNodeElements([nodeA, nodeB])
      dragging.handleNodeDragMove({ x: 50, y: 220 }, nodeElements, () => [])

      dragging.handleMouseUp(isPointInRect)

      expect(onNodeSwap).not.toHaveBeenCalled()
    })
  })
})
