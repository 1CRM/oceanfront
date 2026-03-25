import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useGroupResize, type UseGroupResizeOptions } from '../useGroupResize'
import type { WorkflowGraph, WorkflowGroup } from '../../types/workflow'

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

const MIN_SIZE = { w: 100, h: 80 }

function createResize(graph: WorkflowGraph, overrides: Partial<UseGroupResizeOptions> = {}) {
  const graphRef = ref(graph)
  const onGraphUpdate = vi.fn((g: WorkflowGraph) => {
    graphRef.value = g
  })
  const onGroupResizeStart = vi.fn()
  const onGroupResizeEnd = vi.fn()
  const onUpdateSelectedId = vi.fn()

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

  const options: UseGroupResizeOptions = {
    graph: graphRef,
    readonly: ref(false),
    canvasRef: ref(canvasEl as HTMLElement),
    calculateGroupMinimumSize: () => MIN_SIZE,
    onGraphUpdate,
    onGroupResizeStart,
    onGroupResizeEnd,
    onUpdateSelectedId,
    getGroupPadding: () => 20,
    ...overrides
  }

  const resize = useGroupResize(options)
  return {
    resize,
    graphRef,
    onGraphUpdate,
    onGroupResizeStart,
    onGroupResizeEnd,
    onUpdateSelectedId
  }
}

function startResize(
  resize: ReturnType<typeof useGroupResize>,
  groupId: string,
  direction: string,
  startX: number,
  startY: number
) {
  const event = createMouseEvent('mousedown', { button: 0, clientX: startX, clientY: startY })
  resize.handleResizeMouseDown(event, groupId, direction)
}

describe('useGroupResize', () => {
  const baseGroup: WorkflowGroup = {
    id: 'g1',
    kind: 'group',
    position: { x: 100, y: 100 },
    size: { w: 300, h: 200 },
    containedIds: []
  }

  describe('initial state', () => {
    it('starts with no resize in progress', () => {
      const { resize } = createResize(makeGraph())
      expect(resize.resizingGroupId.value).toBeNull()
      expect(resize.resizeDirection.value).toBeNull()
    })
  })

  describe('handleResizeMouseDown', () => {
    it('starts resize on left click', () => {
      const graph = makeGraph({ groups: [baseGroup] })
      const { resize, onGroupResizeStart, onUpdateSelectedId } = createResize(graph)

      startResize(resize, 'g1', 'right', 400, 200)

      expect(resize.resizingGroupId.value).toBe('g1')
      expect(resize.resizeDirection.value).toBe('right')
      expect(onGroupResizeStart).toHaveBeenCalledWith('g1')
      expect(onUpdateSelectedId).toHaveBeenCalledWith('g1')
    })

    it('ignores right click', () => {
      const graph = makeGraph({ groups: [baseGroup] })
      const { resize, onGroupResizeStart } = createResize(graph)

      const event = createMouseEvent('mousedown', { button: 2, clientX: 400, clientY: 200 })
      resize.handleResizeMouseDown(event, 'g1', 'right')

      expect(resize.resizingGroupId.value).toBeNull()
      expect(onGroupResizeStart).not.toHaveBeenCalled()
    })

    it('ignores when readonly', () => {
      const graph = makeGraph({ groups: [baseGroup] })
      const { resize, onGroupResizeStart } = createResize(graph, { readonly: ref(true) })

      startResize(resize, 'g1', 'right', 400, 200)

      expect(resize.resizingGroupId.value).toBeNull()
      expect(onGroupResizeStart).not.toHaveBeenCalled()
    })
  })

  describe('handleResizeMove', () => {
    it('returns false when not resizing', () => {
      const { resize } = createResize(makeGraph())
      expect(resize.handleResizeMove({ x: 100, y: 100 })).toBe(false)
    })

    it('resizes right edge', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'right', 400, 200)
      resize.handleResizeMove({ x: 450, y: 200 })

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(350) // 300 + 50
      expect(group.position.x).toBe(100) // unchanged
    })

    it('resizes left edge', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'left', 100, 200)
      resize.handleResizeMove({ x: 50, y: 200 })

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(350) // 300 + 50
      expect(group.position.x).toBe(50) // moved left by 50
    })

    it('resizes bottom edge', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'bottom', 200, 300)
      resize.handleResizeMove({ x: 200, y: 380 })

      const group = graphRef.value.groups[0]
      expect(group.size.h).toBe(280) // 200 + 80
      expect(group.position.y).toBe(100) // unchanged
    })

    it('resizes top edge', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'top', 200, 100)
      resize.handleResizeMove({ x: 200, y: 60 })

      const group = graphRef.value.groups[0]
      expect(group.size.h).toBe(240) // 200 + 40
      expect(group.position.y).toBe(60) // moved up by 40
    })

    it('resizes top-left corner', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'top-left', 100, 100)
      resize.handleResizeMove({ x: 50, y: 60 })

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(350)
      expect(group.size.h).toBe(240)
      expect(group.position.x).toBe(50)
      expect(group.position.y).toBe(60)
    })

    it('resizes top-right corner', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'top-right', 400, 100)
      resize.handleResizeMove({ x: 450, y: 60 })

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(350)
      expect(group.size.h).toBe(240)
      expect(group.position.x).toBe(100) // unchanged
      expect(group.position.y).toBe(60)
    })

    it('resizes bottom-left corner', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'bottom-left', 100, 300)
      resize.handleResizeMove({ x: 50, y: 380 })

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(350)
      expect(group.size.h).toBe(280)
      expect(group.position.x).toBe(50)
      expect(group.position.y).toBe(100) // unchanged
    })

    it('resizes bottom-right corner', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'bottom-right', 400, 300)
      resize.handleResizeMove({ x: 480, y: 380 })

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(380)
      expect(group.size.h).toBe(280)
      expect(group.position.x).toBe(100) // unchanged
      expect(group.position.y).toBe(100) // unchanged
    })

    it('enforces minimum width', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'right', 400, 200)
      resize.handleResizeMove({ x: 100, y: 200 }) // try to shrink to 0

      const group = graphRef.value.groups[0]
      expect(group.size.w).toBe(MIN_SIZE.w) // clamped to minimum
    })

    it('enforces minimum height', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, graphRef } = createResize(graph)

      startResize(resize, 'g1', 'bottom', 200, 300)
      resize.handleResizeMove({ x: 200, y: 100 }) // try to shrink past minimum

      const group = graphRef.value.groups[0]
      expect(group.size.h).toBe(MIN_SIZE.h) // clamped to minimum
    })
  })

  describe('handleMouseUp', () => {
    it('clears resize state', () => {
      const graph = makeGraph({ groups: [{ ...baseGroup }] })
      const { resize, onGroupResizeEnd } = createResize(graph)

      startResize(resize, 'g1', 'right', 400, 200)
      resize.handleResizeMove({ x: 450, y: 200 })
      resize.handleMouseUp()

      expect(resize.resizingGroupId.value).toBeNull()
      expect(resize.resizeDirection.value).toBeNull()
      expect(resize.resizeStartBounds.value).toBeNull()
      expect(resize.resizeStartMousePos.value).toBeNull()
      expect(onGroupResizeEnd).toHaveBeenCalledWith('g1', { w: 350, h: 200 })
    })

    it('does nothing when not resizing', () => {
      const { resize, onGroupResizeEnd } = createResize(makeGraph())
      resize.handleMouseUp()
      expect(onGroupResizeEnd).not.toHaveBeenCalled()
    })

    it('updates parent group bounds after resize', () => {
      const parent: WorkflowGroup = {
        id: 'parent',
        kind: 'group',
        position: { x: 50, y: 50 },
        size: { w: 500, h: 500 },
        containedIds: ['g1']
      }
      const graph = makeGraph({ groups: [parent, { ...baseGroup }] })
      const { resize, onGraphUpdate } = createResize(graph)

      startResize(resize, 'g1', 'right', 400, 200)
      resize.handleResizeMove({ x: 500, y: 200 })
      resize.handleMouseUp()

      // onGraphUpdate called during move and on mouseup (for parent bounds update)
      expect(onGraphUpdate).toHaveBeenCalledTimes(2)
    })
  })
})
