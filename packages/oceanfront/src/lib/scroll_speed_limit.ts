import {
  ScrollRoot,
  findScrollParent,
  getScrollTop,
  setScrollTop,
  wheelDeltaPx
} from './scroll_dom'

export interface ScrollSpeedLimitOptions {
  /** Hard cap on scroll movement, in px/sec. */
  maxPxPerSec: number
  getScrollRoot: () => ScrollRoot
  containerEl: () => HTMLElement | null | undefined
  isOnScreen: () => boolean
  /** Called after a wheel event was intercepted and clamped. */
  onWheelClamp?: () => void
}

/**
 * Caps how fast a scroll container may move, so a fast fling can't outrun
 * virtualized row mounting. Large wheel deltas are intercepted before they
 * apply; any jump that still slips through (scrollbar drag, touch momentum)
 * is pulled back after the fact.
 */
export function createScrollSpeedLimit(options: ScrollSpeedLimitOptions) {
  let lastTop = 0
  let lastTs = 0
  let lastWheelTs = 0
  let correcting = false

  const maxDeltaForDt = (dtMs: number) =>
    (options.maxPxPerSec * Math.max(0, dtMs)) / 1000

  const reset = () => {
    lastTop = getScrollTop(options.getScrollRoot())
    lastTs = performance.now()
    lastWheelTs = 0
  }

  const handleScroll = () => {
    if (correcting) return
    const root = options.getScrollRoot()
    const now = performance.now()
    const top = getScrollTop(root)
    if (options.isOnScreen() && lastTs > 0) {
      const dt = Math.min(100, now - lastTs)
      const dy = top - lastTop
      const maxDy = maxDeltaForDt(dt)
      if (maxDy > 0 && Math.abs(dy) > maxDy) {
        correcting = true
        setScrollTop(root, lastTop + Math.sign(dy) * maxDy)
        correcting = false
        lastTop = getScrollTop(root)
        lastTs = now
        return
      }
    }
    lastTop = top
    lastTs = now
  }

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return

    // Cheap check first: only touch the DOM (below) for the rare event that
    // actually exceeds the speed budget.
    const now = performance.now()
    const dt =
      lastWheelTs > 0 ? Math.min(100, Math.max(0, now - lastWheelTs)) : 16
    lastWheelTs = now
    const delta = wheelDeltaPx(e)
    const maxDy = maxDeltaForDt(dt)
    if (maxDy <= 0 || Math.abs(delta) <= maxDy) return
    if (!options.isOnScreen()) return

    const el = options.containerEl()
    if (!el) return
    const root = options.getScrollRoot()

    // Don't steal wheel input from a nested scrollable (popup, side panel).
    const target = e.target
    if (target instanceof HTMLElement) {
      const targetRoot = findScrollParent(target)
      if (targetRoot !== root && targetRoot !== el) return
    }

    e.preventDefault()
    correcting = true
    setScrollTop(root, getScrollTop(root) + Math.sign(delta) * maxDy)
    correcting = false
    lastTop = getScrollTop(root)
    lastTs = now
    options.onWheelClamp?.()
  }

  return { handleScroll, handleWheel, reset }
}
