import {
  ScrollRoot,
  findScrollParent,
  getScrollTop,
  setScrollTop,
  wheelDeltaPx
} from './scroll_dom'

export interface ScrollLockOptions {
  getScrollRoot: () => ScrollRoot
  containerEl: () => HTMLElement | null | undefined
  /** When true, wheel/scroll cannot move the page. */
  isLocked: () => boolean
}

/**
 * Hard-stop scrolling while virtual rows are waiting on data.
 *
 * Unlike a speed cap, this freezes `scrollTop` at the position where unloaded
 * rows entered the window so the user waits for the chunk, then continues.
 */
export function createScrollLock(options: ScrollLockOptions) {
  let lockedTop: number | null = null
  let correcting = false

  const isOurScrollTarget = (e: WheelEvent, root: ScrollRoot) => {
    const el = options.containerEl()
    if (!el) return false
    const target = e.target
    if (!(target instanceof HTMLElement)) return true
    const targetRoot = findScrollParent(target)
    return targetRoot === root || targetRoot === el
  }

  const captureIfNeeded = () => {
    if (!options.isLocked()) {
      lockedTop = null
      return false
    }
    if (lockedTop === null) {
      lockedTop = getScrollTop(options.getScrollRoot())
    }
    return true
  }

  const reset = () => {
    lockedTop = null
  }

  const handleScroll = () => {
    if (!captureIfNeeded() || lockedTop === null || correcting) return
    const root = options.getScrollRoot()
    if (getScrollTop(root) === lockedTop) return
    correcting = true
    setScrollTop(root, lockedTop)
    correcting = false
  }

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) return
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    if (wheelDeltaPx(e) === 0) return
    if (!captureIfNeeded() || lockedTop === null) return

    const root = options.getScrollRoot()
    if (!isOurScrollTarget(e, root)) return
    if (!e.cancelable) return
    e.preventDefault()
  }

  return { handleScroll, handleWheel, reset, captureIfNeeded }
}
