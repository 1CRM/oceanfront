export type ScrollRoot = HTMLElement | Window

const isScrollableOverflow = (overflow: string) =>
  overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'

/**
 * Nearest scrolling ancestor, or `window`.
 *
 * Starts at `parentElement` on purpose: virtual rows expect `el` to grow with
 * content while the page/shell scrolls. Checking `el` itself would pick up
 * height-constrained `overflow: auto` boxes (e.g. `.of-data-table` without
 * `.of--virtual-scroll`) whose scrollTop is invisible to viewport measure.
 */
export const findScrollParent = (el: HTMLElement): ScrollRoot => {
  let parent = el.parentElement
  while (parent) {
    const style = window.getComputedStyle(parent)
    if (
      isScrollableOverflow(style.overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent
    }
    parent = parent.parentElement
  }
  return window
}

export const getScrollTop = (root: ScrollRoot): number =>
  root === window ? window.scrollY : (root as HTMLElement).scrollTop

export const setScrollTop = (root: ScrollRoot, top: number): void => {
  if (root === window) {
    window.scrollTo({ top })
  } else {
    ;(root as HTMLElement).scrollTop = top
  }
}

/** Normalize wheel deltaY to CSS pixels. */
export const wheelDeltaPx = (e: WheelEvent): number => {
  let delta = e.deltaY
  if (e.deltaMode === 1) delta *= 16
  else if (e.deltaMode === 2) {
    delta *= window.innerHeight || document.documentElement.clientHeight || 800
  }
  return delta
}
