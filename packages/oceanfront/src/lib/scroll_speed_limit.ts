import {
  ScrollRoot,
  findScrollParent,
  getScrollTop,
  setScrollTop,
  wheelDeltaPx
} from './scroll_dom'

export interface ScrollSpeedLimitOptions {
  maxPxPerSec: number
  getScrollRoot: () => ScrollRoot
  containerEl: () => HTMLElement | null | undefined
  isOnScreen: () => boolean
  onWheelClamp?: () => void
}

/** True for Apple WebKit (Safari / iOS), false for Chrome/Edge/Firefox. */
export const isAppleWebKit = (
  ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): boolean =>
  /AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg|Android/i.test(ua)

/** Gap after which the next wheel is treated as a new gesture. */
const WHEEL_GESTURE_IDLE_MS = 120
/** Burst above sustained rate so the start of a flick stays snappy. */
const BUDGET_BURST_MS = 80
/**
 * Safari trackpad flings are much faster than mouse wheels. Owning the
 * gesture (required to cap WebKit) at the shared 4000px/s ceiling feels
 * sluggish — allow a higher sustained rate on Apple only.
 */
export const APPLE_SCROLL_SPEED_MULTIPLIER = 2

/**
 * Cap scroll speed so fast flings can't outrun virtual row mounting.
 *
 * WebKit only makes the first `wheel` in a gesture cancelable. Leaving that
 * event to the browser makes the rest of a trackpad fling uncappable without
 * rewriting `scrollTop` during momentum (Safari jitter).
 *
 * Apple WebKit: take over from the first cancelable wheel, apply deltas
 * synchronously with a higher token-bucket ceiling. Never post-correct from
 * the scroll listener.
 *
 * Other engines: leave under-budget wheels native; clamp oversized deltas /
 * non-wheel jumps.
 */
export function createScrollSpeedLimit(options: ScrollSpeedLimitOptions) {
  const apple = isAppleWebKit()
  const maxPxPerSec =
    options.maxPxPerSec * (apple ? APPLE_SCROLL_SPEED_MULTIPLIER : 1)

  let lastTop = 0
  let lastTs = 0
  let budget = 0
  let budgetTs = 0
  let lastWheelTs = 0
  let owningGesture = false
  let correcting = false

  const maxBudget = () => (maxPxPerSec * Math.max(0, BUDGET_BURST_MS)) / 1000

  const refillBudget = (now: number) => {
    if (budgetTs <= 0) {
      budgetTs = now
      budget = maxBudget()
      return
    }
    const dt = Math.min(100, Math.max(0, now - budgetTs))
    budgetTs = now
    budget = Math.min(maxBudget(), budget + (maxPxPerSec * dt) / 1000)
  }

  const applyBudgeted = (delta: number) => {
    const abs = Math.abs(delta)
    const appliedMag = Math.min(abs, Math.max(0, budget))
    budget -= appliedMag
    if (appliedMag === 0) {
      if (abs > 0) options.onWheelClamp?.()
      return
    }
    const root = options.getScrollRoot()
    correcting = true
    setScrollTop(root, getScrollTop(root) + Math.sign(delta) * appliedMag)
    correcting = false
    lastTop = getScrollTop(root)
    lastTs = performance.now()
    if (appliedMag < abs) options.onWheelClamp?.()
  }

  const isOurScrollTarget = (e: WheelEvent, root: ScrollRoot) => {
    const el = options.containerEl()
    if (!el) return false
    const target = e.target
    if (!(target instanceof HTMLElement)) return true
    const targetRoot = findScrollParent(target)
    return targetRoot === root || targetRoot === el
  }

  const reset = () => {
    owningGesture = false
    lastTop = getScrollTop(options.getScrollRoot())
    lastTs = performance.now()
    lastWheelTs = 0
    budgetTs = 0
    budget = 0
  }

  const handleScroll = () => {
    if (correcting) return
    const root = options.getScrollRoot()
    const now = performance.now()
    const top = getScrollTop(root)

    // Apple / active wheel gesture: never rewrite scrollTop — cancels momentum.
    if (apple || owningGesture || now - lastWheelTs < WHEEL_GESTURE_IDLE_MS) {
      lastTop = top
      lastTs = now
      return
    }

    if (options.isOnScreen() && lastTs > 0) {
      const dt = Math.min(100, now - lastTs)
      const dy = top - lastTop
      const maxDy = (maxPxPerSec * Math.max(0, dt)) / 1000
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
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

    const now = performance.now()
    if (lastWheelTs > 0 && now - lastWheelTs > WHEEL_GESTURE_IDLE_MS) {
      owningGesture = false
    }
    lastWheelTs = now
    refillBudget(now)

    const delta = wheelDeltaPx(e)
    if (delta === 0) return
    if (!options.isOnScreen()) return

    const root = options.getScrollRoot()
    if (!isOurScrollTarget(e, root)) return

    // Apple: claim the gesture on the first cancelable event. Leaving it to
    // the compositor makes the rest of the fling uncancellable → uncapped.
    if (apple) {
      if (!owningGesture) {
        if (!e.cancelable) return
        e.preventDefault()
        owningGesture = true
      } else if (e.cancelable) {
        e.preventDefault()
      }
      applyBudgeted(delta)
      return
    }

    // Other engines: native while under budget; take over when over.
    const abs = Math.abs(delta)
    if (!owningGesture && abs <= budget) {
      budget -= abs
      return
    }
    if (!e.cancelable) return
    e.preventDefault()
    owningGesture = true
    applyBudgeted(delta)
  }

  return { handleScroll, handleWheel, reset }
}
