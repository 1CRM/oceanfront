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

/**
 * How far `root` can still be scrolled in total. Changes whenever the content
 * grows or shrinks, which is what makes it a usable signal for "this scroll
 * offset moved because the layout did, not because anyone scrolled".
 */
export const getScrollRange = (root: ScrollRoot): number => {
  if (root === window) {
    const doc = document.documentElement
    const height = window.innerHeight || doc.clientHeight || 0
    return Math.max(0, (doc.scrollHeight || 0) - height)
  }
  const el = root as HTMLElement
  return Math.max(0, el.scrollHeight - el.clientHeight)
}

export const setScrollTop = (root: ScrollRoot, top: number): void => {
  if (root === window) {
    // Explicitly instant: smooth behaviour would turn height corrections
    // into visible drift.
    window.scrollTo({ top, behavior: 'auto' })
  } else {
    ;(root as HTMLElement).scrollTop = top
  }
}
