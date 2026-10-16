import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { WorkflowGraph } from '../../types/workflow'
import { computeLayout, useLayout, type DragShift } from '../useLayout'

const metrics = { spacing: 50, padding: 20 }

const createGraph = (): WorkflowGraph => ({
  nodes: [
    { id: 'a', kind: 'condition' },
    { id: 'b', kind: 'condition' },
    { id: 'x', kind: 'action' }
  ],
  groups: [
    { id: 'conditions', kind: 'condition', children: ['a', 'inner'] },
    { id: 'inner', kind: 'condition', children: ['b'] },
    { id: 'actions', kind: 'action', children: ['x'] },
    { id: 'empty', kind: 'action', children: [] }
  ]
})

describe('computeLayout', () => {
  it('stacks children, centers them and fits groups', () => {
    const rects = computeLayout(createGraph(), {}, metrics)
    expect(rects.get('conditions')).toEqual({ x: 50, y: 50, w: 330, h: 310 })
    expect(rects.get('a')).toEqual({ x: 90, y: 70, w: 250, h: 90 })
    expect(rects.get('inner')).toEqual({ x: 70, y: 210, w: 290, h: 130 })
    expect(rects.get('b')).toEqual({ x: 90, y: 230, w: 250, h: 90 })
  })

  it('places root groups left to right', () => {
    const rects = computeLayout(createGraph(), {}, metrics)
    expect(rects.get('actions')!.x).toBe(50 + 330 + 160)
    expect(rects.get('empty')).toEqual({ x: 540 + 290 + 160, y: 50, w: 290, h: 140 })
  })

  it('uses measured node heights', () => {
    const rects = computeLayout(createGraph(), { a: 150 }, metrics)
    expect(rects.get('inner')!.y).toBe(70 + 150 + 50)
  })
})

describe('useLayout', () => {
  const setup = (shift: DragShift | null = null) =>
    useLayout(ref(createGraph()), ref({}), ref(metrics), ref(shift))

  it('derives arrows between siblings and root groups', () => {
    const { arrows } = setup()
    expect(arrows.value.map(a => a.id)).toEqual(['conditions-actions', 'actions-empty', 'a-inner'])
    expect(arrows.value.every(a => !a.plus)).toBe(true)
  })

  it('adds a plus button between two nodes', () => {
    const graph = createGraph()
    graph.nodes.push({ id: 'y', kind: 'action' })
    graph.groups[2].children.push('y')
    const { arrows } = useLayout(ref(graph), ref({}), ref(metrics), ref(null))
    const arrow = arrows.value.find(a => a.id === 'x-y')!
    expect(arrow.plus).toEqual({ position: { x: 685, y: 185 }, afterId: 'x' })
  })

  it('shifts dragged entities without touching the base layout', () => {
    const { rects, baseRects } = setup({ ids: new Set(['inner', 'b']), delta: { x: 10, y: 5 } })
    expect(rects.value.get('b')).toMatchObject({ x: 100, y: 235 })
    expect(baseRects.value.get('b')).toMatchObject({ x: 90, y: 230 })
    expect(rects.value.get('a')).toEqual(baseRects.value.get('a'))
  })

  it('grows the container with the content', () => {
    const { containerSize } = setup()
    expect(containerSize.value).toEqual({ w: 1380, h: 800 })
  })

  it('styles placed entities and hides missing ones', () => {
    const graph = createGraph()
    const { getStyle } = useLayout(ref(graph), ref({}), ref(metrics), ref(null))
    expect(getStyle(graph.nodes[0])).toEqual({ left: '90px', top: '70px', width: '250px' })
    expect(getStyle(graph.groups[1])).toMatchObject({ height: '130px', zIndex: 1 })
    expect(getStyle({ id: 'missing', kind: 'condition' })).toEqual({ display: 'none' })
  })
})
