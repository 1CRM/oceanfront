import { describe, it, expect, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { WorkflowEntity, WorkflowGraph } from '../../types/workflow'
import { useDragging } from '../useDragging'
import { computeLayout, type DragShift } from '../useLayout'

const createGraph = (): WorkflowGraph => ({
  nodes: [
    { id: 'a', kind: 'condition' },
    { id: 'b', kind: 'condition' },
    { id: 'c', kind: 'condition' },
    { id: 'x', kind: 'action' }
  ],
  groups: [
    { id: 'g', kind: 'condition', children: ['a', 'b', 'c'], readonly: true },
    { id: 'ag', kind: 'action', children: ['x'], readonly: true },
    { id: 'empty', kind: 'condition', children: [] }
  ]
})

const setup = ({
  enabled = true,
  maxGroupDepth
}: { enabled?: boolean; maxGroupDepth?: number } = {}) => {
  const graph = ref(createGraph())
  const rects = computed(() => computeLayout(graph.value, {}, { spacing: 50, padding: 20 }))
  const shift = ref<DragShift | null>(null)
  const canvas = document.createElement('div')
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect
  const onCommit = vi.fn((g: WorkflowGraph) => (graph.value = g))
  const dragging = useDragging({
    graph,
    enabled: ref(enabled),
    canvasRef: ref(canvas),
    rects,
    shift,
    getGroupPadding: () => 20,
    getMaxGroupDepth: () => maxGroupDepth,
    onCommit
  })
  const entity = (id: string): WorkflowEntity =>
    graph.value.nodes.find(n => n.id === id) ?? graph.value.groups.find(g => g.id === id)!
  const drag = (id: string, from: [number, number], to: [number, number], end = true) => {
    const down = new MouseEvent('mousedown', { button: 0, clientX: from[0], clientY: from[1] })
    Object.defineProperty(down, 'target', { value: document.createElement('div') })
    dragging.handleMouseDown(down, entity(id))
    dragging.handleMouseMove(new MouseEvent('mousemove', { clientX: to[0], clientY: to[1] }))
    if (end) dragging.handleMouseUp()
  }
  const children = (id: string) => graph.value.groups.find(g => g.id === id)!.children
  return { graph, shift, dragging, onCommit, drag, children }
}

describe('useDragging', () => {
  it('reorders a node to the end of its group', () => {
    const { drag, children } = setup()
    drag('a', [100, 100], [100, 435])
    expect(children('g')).toEqual(['b', 'c', 'a'])
  })

  it('swaps with a same-kind node under the cursor', () => {
    const { drag, children } = setup()
    drag('a', [100, 100], [100, 240])
    expect(children('g')).toEqual(['b', 'a', 'c'])
  })

  it('moves a node into an empty same-kind group', () => {
    const { drag, children } = setup()
    drag('a', [100, 100], [1015, 100])
    expect(children('empty')).toEqual(['a'])
    expect(children('g')).toEqual(['b', 'c'])
  })

  it('moves a group into an empty group of the same kind', () => {
    const { graph, drag, children } = setup()
    graph.value = {
      ...graph.value,
      groups: [
        ...graph.value.groups.map(g =>
          g.id === 'g' ? { ...g, children: ['a', 'b', 'c', 'inner'] } : g
        ),
        { id: 'inner', kind: 'condition', children: [] }
      ]
    }
    drag('inner', [100, 520], [1020, 80])
    expect(children('empty')).toEqual(['inner'])
    expect(children('g')).toEqual(['a', 'b', 'c'])
  })

  it('does not commit a drop outside every group', () => {
    const { drag, onCommit, children } = setup()
    drag('a', [100, 100], [100, 800])
    expect(onCommit).not.toHaveBeenCalled()
    expect(children('g')).toEqual(['a', 'b', 'c'])
  })

  it('rejects groups of another kind', () => {
    const { drag, dragging, onCommit } = setup()
    drag('a', [100, 100], [580, 155], false)
    expect(dragging.overGroupId.value).toBe('ag')
    expect(dragging.isInvalid.value).toBe(true)
    dragging.handleMouseUp()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('shifts the dragged entity and resets on mouseup', () => {
    const { drag, shift, dragging } = setup()
    drag('a', [100, 100], [130, 110], false)
    expect(shift.value?.delta).toEqual({ x: 30, y: 10 })
    expect(dragging.draggingId.value).toBe('a')
    dragging.handleMouseUp()
    expect(shift.value).toBeNull()
    expect(dragging.draggingId.value).toBeNull()
    expect(dragging.wasDragged()).toBe(true)
  })

  it('cancels a drag without committing', () => {
    const { drag, shift, dragging, onCommit } = setup()
    drag('a', [100, 100], [100, 435], false)
    expect(dragging.cancel()).toBe(true)
    dragging.handleMouseUp()
    expect(onCommit).not.toHaveBeenCalled()
    expect(shift.value).toBeNull()
    expect(dragging.draggingId.value).toBeNull()
    expect(dragging.wasDragged()).toBe(true)
    expect(dragging.cancel()).toBe(false)
  })

  it('ignores moves below the threshold', () => {
    const { drag, shift, onCommit, dragging } = setup()
    drag('a', [100, 100], [102, 101])
    expect(shift.value).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
    expect(dragging.wasDragged()).toBe(false)
  })

  it('does not drag readonly groups, groups from a child node, or when disabled', () => {
    const readonly = setup()
    readonly.drag('g', [60, 60], [300, 300], false)
    expect(readonly.dragging.draggingId.value).toBeNull()

    const group = readonly.graph.value.groups.find(g => g.id === 'empty')!
    const down = new MouseEvent('mousedown', { button: 0, clientX: 1000, clientY: 100 })
    const target = document.createElement('div')
    target.className = 'workflow-canvas-node'
    Object.defineProperty(down, 'target', { value: target })
    readonly.dragging.handleMouseDown(down, group)
    expect(readonly.dragging.draggingId.value).toBeNull()

    const disabled = setup({ enabled: false })
    disabled.drag('a', [100, 100], [100, 435])
    expect(disabled.onCommit).not.toHaveBeenCalled()
  })

  it('respects maxGroupDepth when moving groups', () => {
    const { graph, drag, onCommit, children } = setup({ maxGroupDepth: 1 })
    graph.value = {
      ...graph.value,
      groups: [
        ...graph.value.groups.map(g => (g.id === 'empty' ? { ...g, children: ['inner'] } : g)),
        { id: 'inner', kind: 'condition', children: ['deep'] },
        { id: 'deep', kind: 'condition', children: [] }
      ]
    }
    drag('inner', [1000, 80], [100, 375])
    expect(onCommit).not.toHaveBeenCalled()
    expect(children('empty')).toEqual(['inner'])
  })
})
