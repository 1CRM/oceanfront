import { ref, type Ref } from 'vue'
import type { Position, WorkflowGraph } from '../types/workflow'
import { findGroup, getParentGroup, updateGroupBounds } from '../utils/graph-helpers'

export interface UseGroupResizeOptions {
  graph: Ref<WorkflowGraph>
  readonly: Ref<boolean>
  canvasRef: Ref<HTMLElement | undefined>
  calculateGroupMinimumSize: (groupId: string) => { w: number; h: number }
  onGraphUpdate: (graph: WorkflowGraph) => void
  onGroupResizeStart: (groupId: string) => void
  onGroupResizeEnd: (groupId: string, size: { w: number; h: number }) => void
  onUpdateSelectedId: (id: string) => void
  /** From `--wf-group-padding` on the canvas element */
  getGroupPadding: () => number
}

export function useGroupResize(options: UseGroupResizeOptions) {
  const {
    graph,
    readonly,
    canvasRef,
    calculateGroupMinimumSize,
    onGraphUpdate,
    onGroupResizeStart,
    onGroupResizeEnd,
    onUpdateSelectedId,
    getGroupPadding
  } = options

  const resizingGroupId = ref<string | null>(null)
  const resizeDirection = ref<string | null>(null)
  const resizeStartBounds = ref<{ x: number; y: number; w: number; h: number } | null>(null)
  const resizeStartMousePos = ref<Position | null>(null)

  const getCanvasMousePosition = (event: MouseEvent): Position | null => {
    const canvas = canvasRef.value
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left + canvas.scrollLeft,
      y: event.clientY - rect.top + canvas.scrollTop
    }
  }

  const handleResizeMouseDown = (event: MouseEvent, groupId: string, direction: string) => {
    if (readonly.value) return
    if (event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    const group = findGroup(graph.value, groupId)
    if (!group) return

    const mousePos = getCanvasMousePosition(event)
    if (!mousePos) return

    resizingGroupId.value = groupId
    resizeDirection.value = direction
    resizeStartBounds.value = {
      x: group.position.x,
      y: group.position.y,
      w: group.size.w,
      h: group.size.h
    }
    resizeStartMousePos.value = mousePos
    onUpdateSelectedId(groupId)
    onGroupResizeStart(groupId)
  }

  const handleResizeMove = (mousePos: Position): boolean => {
    if (
      !resizingGroupId.value ||
      !resizeDirection.value ||
      !resizeStartBounds.value ||
      !resizeStartMousePos.value
    ) {
      return false
    }

    const group = findGroup(graph.value, resizingGroupId.value)
    if (!group) return true

    const deltaX = mousePos.x - resizeStartMousePos.value.x
    const deltaY = mousePos.y - resizeStartMousePos.value.y
    const minimumSize = calculateGroupMinimumSize(resizingGroupId.value)

    let newPosition = { ...group.position }
    let newSize = { ...group.size }

    switch (resizeDirection.value) {
      case 'right':
        newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w + deltaX)
        break
      case 'left':
        newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w - deltaX)
        newPosition.x = resizeStartBounds.value.x + (resizeStartBounds.value.w - newSize.w)
        break
      case 'bottom':
        newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h + deltaY)
        break
      case 'top':
        newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h - deltaY)
        newPosition.y = resizeStartBounds.value.y + (resizeStartBounds.value.h - newSize.h)
        break
      case 'top-left':
        newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w - deltaX)
        newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h - deltaY)
        newPosition.x = resizeStartBounds.value.x + (resizeStartBounds.value.w - newSize.w)
        newPosition.y = resizeStartBounds.value.y + (resizeStartBounds.value.h - newSize.h)
        break
      case 'top-right':
        newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w + deltaX)
        newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h - deltaY)
        newPosition.y = resizeStartBounds.value.y + (resizeStartBounds.value.h - newSize.h)
        break
      case 'bottom-left':
        newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w - deltaX)
        newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h + deltaY)
        newPosition.x = resizeStartBounds.value.x + (resizeStartBounds.value.w - newSize.w)
        break
      case 'bottom-right':
        newSize.w = Math.max(minimumSize.w, resizeStartBounds.value.w + deltaX)
        newSize.h = Math.max(minimumSize.h, resizeStartBounds.value.h + deltaY)
        break
    }

    const updatedGraph = {
      ...graph.value,
      groups: graph.value.groups.map(g =>
        g.id === resizingGroupId.value ? { ...g, position: newPosition, size: newSize } : g
      )
    }
    onGraphUpdate(updatedGraph)
    return true
  }

  const handleMouseUp = () => {
    if (resizingGroupId.value) {
      const groupId = resizingGroupId.value
      const group = findGroup(graph.value, groupId)

      const parentGroup = getParentGroup(graph.value, groupId)
      if (parentGroup) {
        const updatedGraph = updateGroupBounds(graph.value, parentGroup.id, getGroupPadding())
        onGraphUpdate(updatedGraph)
      }

      if (group) {
        onGroupResizeEnd(groupId, { w: group.size.w, h: group.size.h })
      }

      resizingGroupId.value = null
      resizeDirection.value = null
      resizeStartBounds.value = null
      resizeStartMousePos.value = null
    }
  }

  return {
    resizingGroupId,
    resizeDirection,
    resizeStartBounds,
    resizeStartMousePos,
    handleResizeMouseDown,
    handleResizeMove,
    handleMouseUp
  }
}
