import { computed, type Ref } from 'vue'
import type { Position, Rect, Size, WorkflowEntity, WorkflowGraph } from '../types/workflow'
import {
  findEntity,
  findNode,
  getGroupDepth,
  getParentGroup,
  isGroup
} from '../utils/graph-helpers'

export const NODE_WIDTH = 250
export const NODE_HEIGHT = 90
export const EMPTY_GROUP_SIZE: Size = { w: 290, h: 140 }
const MARGIN = 50
const ROOT_GAP = 160
const MIN_WIDTH = 1000
const MIN_HEIGHT = 800

export type LayoutMetrics = { spacing: number; padding: number }

export type DragShift = { ids: Set<string>; delta: Position }

export type Arrow = {
  id: string
  path: string
  plus?: { position: Position; afterId: string }
}

export function computeLayout(
  graph: WorkflowGraph,
  heights: Record<string, number>,
  { spacing, padding }: LayoutMetrics
): Map<string, Rect> {
  const sizes = new Map<string, Size>()
  const rects = new Map<string, Rect>()

  const measure = (entity: WorkflowEntity): Size => {
    let size: Size
    if (!isGroup(entity)) {
      size = { w: NODE_WIDTH, h: heights[entity.id] || NODE_HEIGHT }
    } else {
      const children = entity.children
        .map(id => findEntity(graph, id))
        .filter(Boolean)
        .map(child => measure(child!))
      size = children.length
        ? {
            w: Math.max(EMPTY_GROUP_SIZE.w, ...children.map(c => c.w + padding * 2)),
            h:
              children.reduce((sum, c) => sum + c.h, 0) +
              spacing * (children.length - 1) +
              padding * 2
          }
        : { ...EMPTY_GROUP_SIZE }
    }
    sizes.set(entity.id, size)
    return size
  }

  const place = (entity: WorkflowEntity, x: number, y: number) => {
    const size = sizes.get(entity.id)!
    rects.set(entity.id, { x, y, ...size })
    if (!isGroup(entity)) return
    let childY = y + padding
    for (const id of entity.children) {
      const child = findEntity(graph, id)
      if (!child) continue
      const childSize = sizes.get(id)!
      place(child, x + (size.w - childSize.w) / 2, childY)
      childY += childSize.h + spacing
    }
  }

  let x = MARGIN
  for (const root of [...graph.groups, ...graph.nodes]) {
    if (getParentGroup(graph, root.id)) continue
    const size = measure(root)
    place(root, x, MARGIN)
    x += size.w + ROOT_GAP
  }
  return rects
}

const verticalPath = (a: Position, b: Position) => {
  const o = Math.abs(b.y - a.y) / 2
  return `M ${a.x},${a.y} C ${a.x},${a.y + o} ${b.x},${b.y - o} ${b.x},${b.y}`
}

const horizontalPath = (a: Position, b: Position) => {
  const o = Math.abs(b.x - a.x) / 2
  return `M ${a.x},${a.y} C ${a.x + o},${a.y} ${b.x - o},${b.y} ${b.x},${b.y}`
}

export function useLayout(
  graph: Ref<WorkflowGraph>,
  heights: Ref<Record<string, number>>,
  metrics: Ref<LayoutMetrics>,
  shift: Ref<DragShift | null>
) {
  const baseRects = computed(() => computeLayout(graph.value, heights.value, metrics.value))

  const rects = computed(() => {
    const s = shift.value
    if (!s) return baseRects.value
    const shifted = new Map(baseRects.value)
    for (const id of s.ids) {
      const r = shifted.get(id)
      if (r) shifted.set(id, { ...r, x: r.x + s.delta.x, y: r.y + s.delta.y })
    }
    return shifted
  })

  const arrows = computed<Arrow[]>(() => {
    const r = rects.value
    const result: Arrow[] = []
    const link = (fromId: string, toId: string, horizontal: boolean) => {
      const a = r.get(fromId)
      const b = r.get(toId)
      if (!a || !b) return
      const from = horizontal
        ? { x: a.x + a.w, y: a.y + a.h / 2 }
        : { x: a.x + a.w / 2, y: a.y + a.h }
      const to = horizontal ? { x: b.x, y: b.y + b.h / 2 } : { x: b.x + b.w / 2, y: b.y }
      const isNodePair =
        !horizontal && !!findNode(graph.value, fromId) && !!findNode(graph.value, toId)
      result.push({
        id: `${fromId}-${toId}`,
        path: horizontal ? horizontalPath(from, to) : verticalPath(from, to),
        ...(isNodePair && {
          plus: { position: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, afterId: fromId }
        })
      })
    }

    const roots = [...graph.value.groups, ...graph.value.nodes]
      .filter(e => !getParentGroup(graph.value, e.id))
      .map(e => e.id)
    roots.slice(1).forEach((id, i) => link(roots[i], id, true))
    for (const group of graph.value.groups) {
      group.children.slice(1).forEach((id, i) => link(group.children[i], id, false))
    }
    return result
  })

  const containerSize = computed(() => {
    let w = MIN_WIDTH
    let h = MIN_HEIGHT
    for (const r of rects.value.values()) {
      w = Math.max(w, r.x + r.w + MARGIN * 2)
      h = Math.max(h, r.y + r.h + MARGIN * 2)
    }
    return { w, h }
  })

  const getStyle = (entity: WorkflowEntity) => {
    const r = rects.value.get(entity.id)
    if (!r) return { display: 'none' }
    return {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      ...(isGroup(entity) && {
        height: `${r.h}px`,
        zIndex: getGroupDepth(graph.value, entity.id)
      })
    }
  }

  return { baseRects, rects, arrows, containerSize, getStyle }
}
