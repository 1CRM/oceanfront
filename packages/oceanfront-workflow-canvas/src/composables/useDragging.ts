import { computed, ref, type Ref } from 'vue'
import type { Position, Rect, WorkflowEntity, WorkflowGraph } from '../types/workflow'
import {
  canPlaceInGroup,
  findGroup,
  findNode,
  fitsMaxGroupDepth,
  getDescendants,
  getGroupDepth,
  getParentGroup,
  isGroup,
  moveEntity,
  swapNodes
} from '../utils/graph-helpers'
import type { DragShift } from './useLayout'

export type DropIndicator = { x: number; y: number; width: number }

type DropTarget = { groupId: string; index: number; indicator: DropIndicator }

export type UseDraggingOptions = {
  graph: Ref<WorkflowGraph>
  enabled: Ref<boolean>
  canvasRef: Ref<HTMLElement | undefined>
  rects: Ref<Map<string, Rect>>
  shift: Ref<DragShift | null>
  getGroupPadding: () => number
  getMaxGroupDepth: (kind: string) => number | undefined
  onCommit: (graph: WorkflowGraph) => void
}

const DRAG_THRESHOLD = 4

const contains = (r: Rect, p: Position) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

export function useDragging(options: UseDraggingOptions) {
  const { graph, enabled, canvasRef, rects, shift, getGroupPadding, getMaxGroupDepth, onCommit } =
    options

  const draggingId = ref<string | null>(null)
  const overGroupId = ref<string | null>(null)
  const isInvalid = ref(false)
  const swapTargetId = ref<string | null>(null)
  const dropTarget = ref<DropTarget | null>(null)
  const indicator = computed(() => dropTarget.value?.indicator ?? null)

  let start: Position | null = null
  let hasMoved = false
  let justDragged = false

  const getMousePosition = (event: MouseEvent): Position | null => {
    const el = canvasRef.value
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: event.clientX - rect.left + el.scrollLeft,
      y: event.clientY - rect.top + el.scrollTop
    }
  }

  const handleMouseDown = (event: MouseEvent, entity: WorkflowEntity) => {
    justDragged = false
    if (!enabled.value || event.button !== 0 || draggingId.value) return
    if (isGroup(entity)) {
      if (entity.readonly) return
      if ((event.target as HTMLElement).closest('.workflow-canvas-node')) return
    }
    const pos = getMousePosition(event)
    if (!pos) return
    event.preventDefault()
    start = pos
    hasMoved = false
    draggingId.value = entity.id
  }

  const findTargetGroup = (id: string, center: Position) => {
    const excluded = new Set([id, ...getDescendants(graph.value, id)])
    return graph.value.groups
      .filter(g => {
        const rect = rects.value.get(g.id)
        return !excluded.has(g.id) && !!rect && contains(rect, center)
      })
      .reduce<string | null>(
        (deepest, g) =>
          !deepest || getGroupDepth(graph.value, g.id) > getGroupDepth(graph.value, deepest)
            ? g.id
            : deepest,
        null
      )
  }

  const computeDropTarget = (id: string, groupId: string, center: Position): DropTarget | null => {
    const group = findGroup(graph.value, groupId)
    const groupRect = rects.value.get(groupId)
    if (!group || !groupRect) return null
    const siblings = group.children.filter(c => c !== id).map(c => rects.value.get(c))
    if (!siblings.every((s): s is Rect => !!s)) return null
    const parent = getParentGroup(graph.value, id)
    const originalIndex = parent?.children.indexOf(id) ?? -1

    if (siblings.length === 0) {
      if (parent?.id === groupId) return null
      const padding = getGroupPadding()
      return {
        groupId,
        index: 0,
        indicator: {
          x: groupRect.x + padding,
          y: groupRect.y + groupRect.h / 2,
          width: groupRect.w - padding * 2
        }
      }
    }

    const slots = [siblings[0].y - 10]
    for (let i = 0; i < siblings.length - 1; i++) {
      slots.push((siblings[i].y + siblings[i].h + siblings[i + 1].y) / 2)
    }
    const last = siblings[siblings.length - 1]
    slots.push(last.y + last.h + 10)

    const index = slots.reduce(
      (best, y, i) => (Math.abs(center.y - y) < Math.abs(center.y - slots[best]) ? i : best),
      0
    )
    if (parent?.id === groupId && index === originalIndex) return null

    const width = Math.max(...siblings.map(s => s.w))
    return {
      groupId,
      index,
      indicator: { x: groupRect.x + (groupRect.w - width) / 2, y: slots[index], width }
    }
  }

  const handleMouseMove = (event: MouseEvent) => {
    const id = draggingId.value
    const pos = id && start ? getMousePosition(event) : null
    const base = id ? rects.value.get(id) : undefined
    if (!id || !start || !pos || !base) return

    const delta = { x: pos.x - start.x, y: pos.y - start.y }
    if (!hasMoved && Math.hypot(delta.x, delta.y) < DRAG_THRESHOLD) return
    hasMoved = true
    shift.value = { ids: new Set([id, ...getDescendants(graph.value, id)]), delta }

    const center = { x: base.x + base.w / 2 + delta.x, y: base.y + base.h / 2 + delta.y }
    const node = findNode(graph.value, id)

    const overNode = node
      ? graph.value.nodes.find(n => {
          const rect = rects.value.get(n.id)
          return n.id !== id && !!rect && contains(rect, center)
        })
      : undefined
    swapTargetId.value = overNode && overNode.kind === node!.kind ? overNode.id : null

    const targetId = findTargetGroup(id, center)
    const parentId = getParentGroup(graph.value, id)?.id
    const valid =
      !!targetId &&
      !overNode &&
      canPlaceInGroup(graph.value, id, targetId) &&
      (!!node ||
        targetId === parentId ||
        fitsMaxGroupDepth(
          graph.value,
          targetId,
          getMaxGroupDepth(findGroup(graph.value, id)!.kind),
          id
        ))

    overGroupId.value = targetId
    isInvalid.value = !!targetId && !overNode && !valid
    dropTarget.value = valid ? computeDropTarget(id, targetId!, center) : null
  }

  const reset = () => {
    justDragged = hasMoved
    draggingId.value = null
    overGroupId.value = null
    isInvalid.value = false
    swapTargetId.value = null
    dropTarget.value = null
    shift.value = null
    start = null
    hasMoved = false
  }

  const handleMouseUp = () => {
    const id = draggingId.value
    if (!id) return
    if (hasMoved) {
      if (swapTargetId.value) onCommit(swapNodes(graph.value, id, swapTargetId.value))
      else if (dropTarget.value)
        onCommit(moveEntity(graph.value, id, dropTarget.value.groupId, dropTarget.value.index))
    }
    reset()
  }

  const cancel = () => {
    if (!draggingId.value) return false
    reset()
    return true
  }

  return {
    draggingId,
    overGroupId,
    isInvalid,
    swapTargetId,
    indicator,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cancel,
    wasDragged: () => justDragged
  }
}
